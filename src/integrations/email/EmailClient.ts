import { environment } from '@config/environment';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export interface ReceivedEmail {
    subject: string;
    from: string;
    html: string;
    text: string;
    receivedAt: Date;
}

export interface WaitForEmailOptions {
    /** Filtra por remitente (formato IMAP SEARCH FROM). */
    from?: string;
    /** Filtra por texto contenido en el asunto. */
    subjectContains?: string;
    /** Solo considera correos recibidos desde este momento (evita matchear un correo viejo). */
    since: Date;
    /** Tiempo máximo de espera antes de tirar error. Default 60s. */
    timeoutMs?: number;
    /** Intervalo entre reintentos de búsqueda. Default 5s. */
    pollIntervalMs?: number;
}

/**
 * Lee la casilla de correo real configurada por TEST_MAILBOX_* (ver .env.example) vía IMAP.
 * Pensado para verificar emails transaccionales de test (ej. reseteo de contraseña, IMAS-4272)
 * que no pueden validarse con los emails sintéticos `user_<timestamp>@automation.com` — esos
 * nunca reciben correo real. Ver IMP-006 en docs/impedimentos-bloqueos.md.
 */
export class EmailClient {
    private static requireConfig() {
        const { TEST_MAILBOX_IMAP_HOST, TEST_MAILBOX_IMAP_PORT, TEST_MAILBOX_EMAIL, TEST_MAILBOX_IMAP_PASSWORD } = environment;
        if (!TEST_MAILBOX_IMAP_HOST || !TEST_MAILBOX_IMAP_PORT || !TEST_MAILBOX_EMAIL || !TEST_MAILBOX_IMAP_PASSWORD) {
            throw new Error(
                'EmailClient requiere TEST_MAILBOX_IMAP_HOST, TEST_MAILBOX_IMAP_PORT, TEST_MAILBOX_EMAIL y TEST_MAILBOX_IMAP_PASSWORD configurados en .env — ver IMP-006 en docs/impedimentos-bloqueos.md.',
            );
        }
        return { TEST_MAILBOX_IMAP_HOST, TEST_MAILBOX_IMAP_PORT, TEST_MAILBOX_EMAIL, TEST_MAILBOX_IMAP_PASSWORD };
    }

    /**
     * Poll de la casilla hasta encontrar un correo que matchee los criterios, o hasta agotar el timeout.
     * Solo considera correos recibidos después de `since` — evita falsos positivos por correos viejos
     * ya presentes en la casilla de una corrida anterior.
     */
    static async waitForEmail(options: WaitForEmailOptions): Promise<ReceivedEmail> {
        const config = EmailClient.requireConfig();
        const timeoutMs = options.timeoutMs ?? 60_000;
        const pollIntervalMs = options.pollIntervalMs ?? 5_000;
        const deadline = Date.now() + timeoutMs;

        const client = new ImapFlow({
            host: config.TEST_MAILBOX_IMAP_HOST,
            port: config.TEST_MAILBOX_IMAP_PORT,
            secure: true,
            auth: { user: config.TEST_MAILBOX_EMAIL, pass: config.TEST_MAILBOX_IMAP_PASSWORD },
            logger: false,
        });

        await client.connect();
        try {
            while (Date.now() < deadline) {
                const lock = await client.getMailboxLock('INBOX');
                try {
                    const uids = await client.search(
                        {
                            since: options.since,
                            ...(options.from ? { from: options.from } : {}),
                            ...(options.subjectContains ? { subject: options.subjectContains } : {}),
                        },
                        { uid: true },
                    );

                    if (uids && uids.length > 0) {
                        const latestUid = uids[uids.length - 1];
                        for await (const message of client.fetch(String(latestUid), { source: true, envelope: true }, { uid: true })) {
                            if (!message.source) {
                                continue;
                            }
                            const parsed = await simpleParser(message.source);
                            return {
                                subject: parsed.subject ?? '',
                                from: parsed.from?.text ?? '',
                                html: typeof parsed.html === 'string' ? parsed.html : '',
                                text: parsed.text ?? '',
                                receivedAt: message.envelope?.date ?? new Date(),
                            };
                        }
                    }
                } finally {
                    lock.release();
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
