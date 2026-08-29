import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const environmentSchema = z.object({
    APP_ENV: z.enum(['dev', 'qa', 'production']).default('qa'),
    AUTH_API_BASE_URL: z.string().url(),
    VETIFY_WEBAPP_BASE_URL: z.string().url(),
    VETIFY_INSTITUTIONAL_BASE_URL: z.string().url(),
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
