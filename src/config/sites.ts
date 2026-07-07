import { SiteId } from '@config/environment';

export type Site = {
    id: SiteId;
    name: string;
    testFolder: string;
    baseUrlEnvVar: string;
    authDir?: string;
};

export const sites: Site[] = [
    {
        id: SiteId.VETIFY_ADQUIRIENTE,
        testFolder: './tests/projects/vetify',
        name: 'Vetify Adquiriente [B2C]',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
        authDir: 'playwright/.auth/vetify-b2c',
    },
    {
        id: SiteId.OSDE_CAPITADO,
        testFolder: './tests/projects/osde-capitado',
        name: 'OSDE Capitado',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
        authDir: 'playwright/.auth/osde-capitado',
    },
    {
        id: SiteId.OSDE_ADQUIRIENTE,
        testFolder: './tests/projects/osde-adquirente',
        name: 'OSDE Adquiriente',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
        authDir: 'playwright/.auth/osde-adquirente',
    },
    {
        id: SiteId.FLUX_CAPITADO,
        testFolder: './tests/projects/flux-capitado',
        name: 'FLUX Capitado',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
        authDir: 'playwright/.auth/osde-capitado',
    },
];

export default sites;
