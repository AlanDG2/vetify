import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const environmentSchema = z.object({
    APP_ENV: z.enum(['dev', 'qa', 'production']).default('qa'),
    AUTH_API_BASE_URL: z.string().url(),
    VETIFY_WEBAPP_BASE_URL: z.string().url(),
    VETIFY_INSTITUTIONAL_BASE_URL: z.string().url(),
    OSDE_CAPITADO_INSTITUTIONAL_BASE_URL: z.string().url(),
    OSDE_ADQUIRIENTE_INSTITUTIONAL_BASE_URL: z.string().url(),
    FLUX_CAPITADO_INSTITUTIONAL_BASE_URL: z.string().url(),
});

export type AppEnvironment = z.infer<typeof environmentSchema>['APP_ENV'];

export enum SiteId {
    VETIFY_ADQUIRIENTE = 'VETIFY_ADQUIRIENTE',
    OSDE_ADQUIRIENTE = 'OSDE_ADQUIRIENTE',
    OSDE_CAPITADO = 'OSDE_CAPITADO',
    FLUX_CAPITADO = 'FLUX_CAPITADO',
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
    [SiteId.VETIFY_ADQUIRIENTE]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.OSDE_CAPITADO]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.OSDE_ADQUIRIENTE]: environment.VETIFY_WEBAPP_BASE_URL,
    [SiteId.FLUX_CAPITADO]: environment.VETIFY_WEBAPP_BASE_URL,
};

export function getWebappBaseUrl(siteId: SiteId): string {
    return siteWebappBaseUrls[siteId];
}

export const siteInstitutionalBaseUrls: Record<SiteIdType, string> = {
    [SiteId.VETIFY_ADQUIRIENTE]: environment.VETIFY_INSTITUTIONAL_BASE_URL,
    [SiteId.OSDE_CAPITADO]: environment.OSDE_CAPITADO_INSTITUTIONAL_BASE_URL,
    [SiteId.OSDE_ADQUIRIENTE]: environment.OSDE_ADQUIRIENTE_INSTITUTIONAL_BASE_URL,
    [SiteId.FLUX_CAPITADO]: environment.FLUX_CAPITADO_INSTITUTIONAL_BASE_URL,
};

export function getInstitutionalBaseUrl(siteId: SiteId): string {
    return siteInstitutionalBaseUrls[siteId];
}
