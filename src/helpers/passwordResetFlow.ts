import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { EmailClient, MailboxCredentials } from '@integrations/email/EmailClient';
import { TestContainer } from '@tests/framework/base-test';

// 2026-08-29: pedir /api/passrecovery dos veces seguidas para el mismo email en poco tiempo
// reproducía "Enlace caducado" en el link recién recibido, y el 2026-08-31 se sumó un 2do síntoma
// (directamente no llega un correo nuevo dentro del timeout, aunque el anterior sí haya llegado)
// — ambos consistentes con algún rate-limit real del backend. Cooldown por email (no global): cada
// cuenta real usada para este flujo tiene su propio reloj, para que un producto no bloquee a otro.
const RESET_REQUEST_COOLDOWN_MS = 90_000;
const lastResetRequestAtByEmail = new Map<string, number>();

async function waitForResetCooldown(email: string): Promise<void> {
    const lastAt = lastResetRequestAtByEmail.get(email) ?? 0;
    const elapsed = Date.now() - lastAt;
    if (lastAt !== 0 && elapsed < RESET_REQUEST_COOLDOWN_MS) {
        await new Promise((resolve) => setTimeout(resolve, RESET_REQUEST_COOLDOWN_MS - elapsed));
    }
    lastResetRequestAtByEmail.set(email, Date.now());
}

/**
 * Solicita un reseteo de contraseña real y devuelve el link recibido por email.
 * Único uso: si el caller falla a mitad de camino usando este link, la cuenta compartida
 * (`UserTag.REAL_EMAIL`) queda con una contraseña desconocida — hay que restaurarla siempre
 * (ver `restorePassword`).
 */
export async function requestResetLink(container: TestContainer, email: string, mailbox?: MailboxCredentials, timeoutMs?: number): Promise<string> {
    await waitForResetCooldown(email);
    const since = new Date();
    await container.vetify.webapp.loginPage.load();
    await container.vetify.webapp.loginPage.openForgotPassword();
    await container.vetify.webapp.loginPage.requestPasswordRecovery(email);
    const receivedEmail = await EmailClient.waitForEmail({
        from: 'webapp@vetify.com.ar',
        to: email,
        subjectContains: 'Recuperá tu contraseña',
        since,
        mailbox,
        timeoutMs,
    });
    // El link de reset aparece repetido varias veces en el cuerpo del correo (botón + fallback de
    // texto plano) — dedupe y filtrar por dominio, ignora otras URLs del correo (ej. el logo).
    const links = [...new Set(EmailClient.extractLinks(receivedEmail))].filter((link) => link.includes('reset-verify'));
    if (!links[0]) {
        throw new Error(`No se encontró el link de reset (reset-verify) en el correo recibido. Asunto: "${receivedEmail.subject}".`);
    }
    return links[0];
}

/** Restaura la contraseña conocida de la cuenta compartida vía un reset real adicional — nunca
 * asumir que la cuenta soporta quedar en una contraseña distinta a la del pool entre corridas. */
export async function restorePassword(container: TestContainer, page: Page, email: string, knownPassword: string, mailbox?: MailboxCredentials, timeoutMs?: number): Promise<void> {
    const resetLink = await requestResetLink(container, email, mailbox, timeoutMs);
    await page.goto(resetLink);
    await container.vetify.webapp.resetPasswordPage.resetPassword(knownPassword);
    await expect(container.vetify.webapp.resetPasswordPage.successHeadingLbl).toBeVisible();
}
