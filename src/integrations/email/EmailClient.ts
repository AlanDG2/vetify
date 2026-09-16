import { environment } from '@config/environment';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export interface ReceivedEmail {
    subject: string;
    from: string;
    to: string;
    html: string;
    text: string;
    receivedAt: Date;
}

/** Credenciales IMAP de una casilla real puntual — permite leer una casilla distinta a la
 * principal (ver `mailboxForSite` más abajo, usado cuando cada producto tiene su propia cuenta). */
export interface MailboxCredentials {
    host?: string;
    port?: number;
    email: string;
    password: string;
}

export interface WaitForEmailOptions {
    /** Filtra por remitente (formato IMAP SEARCH FROM). */
    from?: string;
    /**
     * Filtra por destinatario exacto (case-insensitive) — necesario cuando varias cuentas de
     * test comparten el mismo buzón real vía alias "+" de Gmail (ej. `alan.gonzalez+osde@ingenia.la`
     * entrega en `alan.gonzalez@ingenia.la`, pero el header "To" conserva el alias completo).
     */
    to?: string;
    /** Filtra por texto contenido en el asunto. */
    subjectContains?: string;
    /** Solo considera correos recibidos desde este momento (evita matchear un correo viejo). */
    since: Date;
    /** Tiempo máximo de espera antes de tirar error. Default 60s. */
    timeoutMs?: number;
    /** Intervalo entre reintentos de búsqueda. Default 5s. */
    pollIntervalMs?: number;
    /** Casilla a leer. Default: la casilla principal (`TEST_MAILBOX_*`). */
    mailbox?: MailboxCredentials;
}

/**
 * Lee la casilla de correo real configurada por TEST_MAILBOX_* (ver .env.example) vía IMAP, o una
 * casilla puntual pasada en `options.mailbox`. Pensado para verificar emails transaccionales de
 * test (ej. reseteo de contraseña, IMAS-4272) que no pueden validarse con los emails sintéticos
 * `user_<timestamp>@automation.com` — esos nunca reciben correo real. Ver IMP-006 en
 * docs/impedimentos-bloqueos.md.
 */
export class EmailClient {
    private static defaultConfig(): MailboxCredentials {
        const { TEST_MAILBOX_IMAP_HOST, TEST_MAILBOX_IMAP_PORT, TEST_MAILBOX_EMAIL, TEST_MAILBOX_IMAP_PASSWORD } = environment;
        if (!TEST_MAILBOX_IMAP_HOST || !TEST_MAILBOX_IMAP_PORT || !TEST_MAILBOX_EMAIL || !TEST_MAILBOX_IMAP_PASSWORD) {
            throw new Error(
                'EmailClient requiere TEST_MAILBOX_IMAP_HOST, TEST_MAILBOX_IMAP_PORT, TEST_MAILBOX_EMAIL y TEST_MAILBOX_IMAP_PASSWORD configurados en .env — ver IMP-006 en docs/impedimentos-bloqueos.md.',
            );
        }
        return { host: TEST_MAILBOX_IMAP_HOST, port: TEST_MAILBOX_IMAP_PORT, email: TEST_MAILBOX_EMAIL, password: TEST_MAILBOX_IMAP_PASSWORD };
    }

    /**
     * Poll de la casilla hasta encontrar un correo que matchee los criterios, o hasta agotar el timeout.
     * Solo considera correos recibidos después de `since` — evita falsos positivos por correos viejos
     * ya presentes en la casilla de una corrida anterior.
     */
    static async waitForEmail(options: WaitForEmailOptions): Promise<ReceivedEmail> {
        const config = options.mailbox ?? EmailClient.defaultConfig();
        if (!config.host || !config.port) {
            throw new Error('EmailClient: la casilla indicada no tiene host/puerto IMAP configurados.');
        }
        const timeoutMs = options.timeoutMs ?? 60_000;
        const pollIntervalMs = options.pollIntervalMs ?? 5_000;
        const deadline = Date.now() + timeoutMs;

        const client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: true,
            auth: { user: config.email, pass: config.password },
            logger: false,
        });

        await client.connect();
        try {
            // Causa raíz real, confirmada en vivo (2026-09-01): usar `client.mailbox.uidNext` (el
            // objeto cacheado en el cliente) NUNCA se actualizaba entre iteraciones — `getMailboxLock`
            // no vuelve a pedirle el estado al servidor si el mailbox ya está seleccionado, así que
            // esa variable quedaba congelada en el valor de la primera vez, aunque llegara correo
            // nuevo real. `client.status(path, {uidNext})` sí manda un comando STATUS fresco al
            // servidor cada vez que se llama — eso es lo que hay que usar para detectar mail nuevo,
            // no la propiedad pasiva del cliente. (Se descartó también depender de SEARCH con
            // FROM/SUBJECT/SINCE — Gmail indexa esos criterios con lag variable; STATUS+FETCH por UID
            // no pasa por ese índice.)
            const initialStatus = await client.status('INBOX', { uidNext: true });
            let nextUid = initialStatus.uidNext ?? 1;

            while (Date.now() < deadline) {
                const status = await client.status('INBOX', { uidNext: true });
                const currentUidNext = status.uidNext ?? nextUid;

                if (currentUidNext > nextUid) {
                    const range = `${nextUid}:${currentUidNext - 1}`;
                    const lock = await client.getMailboxLock('INBOX');
                    try {
                        const uids: number[] = [];
                        for await (const message of client.fetch(range, { uid: true }, { uid: true })) {
                            uids.push(message.uid);
                        }

                        for (const uid of uids.sort((a, b) => b - a)) {
                            for await (const message of client.fetch(String(uid), { source: true, envelope: true }, { uid: true })) {
                                if (!message.source) {
                                    continue;
                                }
                                const parsed = await simpleParser(message.source);
                                const receivedAt = message.envelope?.date ?? new Date();
                                const toText = Array.isArray(parsed.to) ? parsed.to.map((t) => t.text).join(', ') : (parsed.to?.text ?? '');
                                const matchesSince = receivedAt >= options.since;
                                const matchesFrom = !options.from || (parsed.from?.text ?? '').includes(options.from);
                                const matchesTo = !options.to || toText.toLowerCase().includes(options.to.toLowerCase());
                                const matchesSubject = !options.subjectContains || (parsed.subject ?? '').includes(options.subjectContains);
                                if (matchesSince && matchesFrom && matchesTo && matchesSubject) {
                                    return {
                                        subject: parsed.subject ?? '',
                                        from: parsed.from?.text ?? '',
                                        to: toText,
                                        html: typeof parsed.html === 'string' ? parsed.html : '',
                                        text: parsed.text ?? '',
                                        receivedAt,
                                    };
                                }
                            }
                        }
                    } finally {
                        lock.release();
                    }
                    nextUid = currentUidNext;
                }

                if (Date.now() + pollIntervalMs < deadline) {
                    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
                }
            }
        } finally {
            await client.logout();
        }

        throw new Error(`EmailClient: no llegó ningún correo que matchee los criterios (${JSON.stringify(options)}) dentro de ${timeoutMs}ms.`);
    }

    /** Extrae todas las URLs del cuerpo (HTML si existe, si no texto plano). */
    static extractLinks(email: ReceivedEmail, urlPattern = /https?:\/\/[^\s"'<>]+/g): string[] {
        const source = email.html || email.text;
        return [...source.matchAll(urlPattern)].map((match) => match[0]);
    }
}
