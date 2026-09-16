import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
    APP_ENV: z.enum(['dev', 'qa', 'production']).default('qa'),
    AUTH_API_BASE_URL: z.string().url(),
    VETIFY_WEBAPP_BASE_URL: z.string().url(),
    VETIFY_INSTITUTIONAL_BASE_URL: z.string().url(),
    // 2026-09-14: los endpoints de catálogo/pago de Quantum ("jengage") se migraron a este dominio
    // separado con prefijo /api/v1/ -- confirmado en vivo (compra real aprobada) que
    // VETIFY_INSTITUTIONAL_BASE_URL + /api/quantum/jengage/... ya no sirve para catalog/products ni
    // payment/pagar-mp (quedó 404), pero SÍ sigue sirviendo para /api/quantum/jauth/token (el token
    // es válido en ambos dominios) y para /api/sf/first-step|second-step (Salesforce, sistema
    // aparte). Ver IMP-017 en docs/impedimentos-bloqueos.md para el detalle completo.
    VETIFY_QUANTUM_BASE_URL: z.string().url(),
    OSDE_CAPITADO_INSTITUTIONAL_BASE_URL: z.string().url(),
    OSDE_ADQUIRENTE_INSTITUTIONAL_BASE_URL: z.string().url(),
    FLUX_CAPITADO_INSTITUTIONAL_BASE_URL: z.string().url(),
    IKE_WEBAPP_BASE_URL: z.string().url(),
    // Casilla real de correo para leer emails de test (ej. reseteo de contraseña) vía IMAP.
    // Opcionales: sin esto configurado, los specs que dependan de EmailClient fallan con un
    // mensaje explícito al invocarse, no al arrancar el resto de la suite (ver IMP-006).
    TEST_MAILBOX_IMAP_HOST: z.string().optional(),
    TEST_MAILBOX_IMAP_PORT: z.coerce.number().optional(),
    TEST_MAILBOX_EMAIL: z.string().email().optional(),
    TEST_MAILBOX_IMAP_PASSWORD: z.string().optional(),
    // 2026-09-01: 2 casillas reales más, una por producto Capitado (ninguno tenía una hasta ahora
    // — a diferencia del alias "+" propuesto antes, son cuentas de Gmail genuinamente separadas,
    // así que no chocan con el rechazo de "+" del formulario de registro ni con el problema de
    // entrega del truco del punto). Mismo host/puerto que la casilla principal (todas son Gmail).
    TEST_MAILBOX_OSDE_CAPITADO_EMAIL: z.string().email().optional(),
    TEST_MAILBOX_OSDE_CAPITADO_IMAP_PASSWORD: z.string().optional(),
    TEST_MAILBOX_FLUX_CAPITADO_EMAIL: z.string().email().optional(),
    TEST_MAILBOX_FLUX_CAPITADO_IMAP_PASSWORD: z.string().optional(),
    // 2026-09-06: casilla real para OSDE Adquirente (único producto sin una hasta ahora) — habilita
    // IMAS-3218 (TS-05 Cambio de contraseña, hoy inexistente para este producto).
    TEST_MAILBOX_OSDE_ADQUIRENTE_EMAIL: z.string().email().optional(),
    TEST_MAILBOX_OSDE_ADQUIRENTE_IMAP_PASSWORD: z.string().optional(),
});

export type AppEnvironment = z.infer<typeof environmentSchema>['APP_ENV'];

export enum SiteId {
    VETIFY_ADQUIRENTE = 'VETIFY_ADQUIRENTE',
    OSDE_ADQUIRENTE = 'OSDE_ADQUIRENTE',
    OSDE_CAPITADO = 'OSDE_CAPITADO',
    FLUX_CAPITADO = 'FLUX_CAPITADO',
    IKE_WEBAPP = 'IKE_WEBAPP',
}

export type SiteIdType = SiteId;

const safeParse = environmentSchema.safeParse(process.env);

if (!safeParse.success) {
    console.error(safeParse.error.format());
    process.exit(1);
}

export const environment = environmentSchema.parse(process.env);

// Mapping of site IDs (used by Playwright projects) to the webapp base URL.
// Add additional sites here as needed.
export const siteWebappBaseUrls: Record<SiteIdType, string> = {
    [SiteId.VETIFY_ADQUIRENTE]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.OSDE_CAPITADO]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.OSDE_ADQUIRENTE]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.FLUX_CAPITADO]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.IKE_WEBAPP]: environment.IKE_WEBAPP_BASE_URL,
};

export function getWebappBaseUrl(siteId: SiteId): string {
    return siteWebappBaseUrls[siteId];
}

export const siteInstitutionalBaseUrls: Record<SiteIdType, string> = {
    [SiteId.VETIFY_ADQUIRENTE]: environment.VETIFY_INSTITUTIONAL_BASE_URL,
    [SiteId.OSDE_CAPITADO]: environment.OSDE_CAPITADO_INSTITUTIONAL_BASE_URL,
    [SiteId.OSDE_ADQUIRENTE]: environment.OSDE_ADQUIRENTE_INSTITUTIONAL_BASE_URL,
    [SiteId.FLUX_CAPITADO]: environment.FLUX_CAPITADO_INSTITUTIONAL_BASE_URL,
    // La WebApp de Iké no tiene un sitio institucional/landing separado en este alcance — reusa su propia base URL.
    [SiteId.IKE_WEBAPP]: environment.IKE_WEBAPP_BASE_URL,
};

export function getInstitutionalBaseUrl(siteId: SiteId): string {
    return siteInstitutionalBaseUrls[siteId];
}

/**
 * Casilla real de correo (IMAP) por producto, para `EmailClient` — `undefined` si ese producto
 * todavía no tiene ninguna cuenta con email real configurada (ver `UserTag.REAL_EMAIL`).
 * Todas comparten host/puerto (todas son Gmail) — solo cambia la cuenta.
 */
export const siteRealMailboxes: Partial<Record<SiteIdType, { email: string; password: string }>> = {
    ...(environment.TEST_MAILBOX_EMAIL && environment.TEST_MAILBOX_IMAP_PASSWORD
        ? { [SiteId.VETIFY_ADQUIRENTE]: { email: environment.TEST_MAILBOX_EMAIL, password: environment.TEST_MAILBOX_IMAP_PASSWORD } }
        : {}),
    ...(environment.TEST_MAILBOX_OSDE_CAPITADO_EMAIL && environment.TEST_MAILBOX_OSDE_CAPITADO_IMAP_PASSWORD
        ? {
              [SiteId.OSDE_CAPITADO]: {
                  email: environment.TEST_MAILBOX_OSDE_CAPITADO_EMAIL,
                  password: environment.TEST_MAILBOX_OSDE_CAPITADO_IMAP_PASSWORD,
              },
          }
        : {}),
    ...(environment.TEST_MAILBOX_FLUX_CAPITADO_EMAIL && environment.TEST_MAILBOX_FLUX_CAPITADO_IMAP_PASSWORD
        ? {
              [SiteId.FLUX_CAPITADO]: {
                  email: environment.TEST_MAILBOX_FLUX_CAPITADO_EMAIL,
                  password: environment.TEST_MAILBOX_FLUX_CAPITADO_IMAP_PASSWORD,
              },
          }
        : {}),
    ...(environment.TEST_MAILBOX_OSDE_ADQUIRENTE_EMAIL && environment.TEST_MAILBOX_OSDE_ADQUIRENTE_IMAP_PASSWORD
        ? {
              [SiteId.OSDE_ADQUIRENTE]: {
                  email: environment.TEST_MAILBOX_OSDE_ADQUIRENTE_EMAIL,
                  password: environment.TEST_MAILBOX_OSDE_ADQUIRENTE_IMAP_PASSWORD,
              },
          }
        : {}),
};

/** Credenciales IMAP completas (con host/puerto) para la casilla real de un producto, o `undefined`. */
export function getRealMailboxCredentials(siteId: SiteId): { host: string; port: number; email: string; password: string } | undefined {
    const account = siteRealMailboxes[siteId];
    if (!account || !environment.TEST_MAILBOX_IMAP_HOST || !environment.TEST_MAILBOX_IMAP_PORT) {
        return undefined;
    }
    return { host: environment.TEST_MAILBOX_IMAP_HOST, port: environment.TEST_MAILBOX_IMAP_PORT, ...account };
}
