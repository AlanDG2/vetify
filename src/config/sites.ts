import { SiteId } from '@config/environment';

export type Site = {
    id: SiteId;
    name: string;
    testFolder: string;
    baseUrlEnvVar: string;
};

export const sites: Site[] = [
    {
        id: SiteId.VETIFY_ADQUIRENTE,
        testFolder: './tests/projects/vetify-webapp',
        name: 'Vetify WebApp',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
    },
    {
        id: SiteId.VETIFY_ADQUIRENTE,
        testFolder: './tests/projects/vetify-b2c',
        name: 'Vetify Adquirente [B2C]',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
    },
    {
        id: SiteId.OSDE_CAPITADO,
        testFolder: './tests/projects/osde-capitado',
        name: 'OSDE Capitado',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
    },
    {
        id: SiteId.OSDE_ADQUIRENTE,
        testFolder: './tests/projects/osde-adquirente',
        name: 'OSDE Adquirente',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
    },
    {
        id: SiteId.FLUX_CAPITADO,
        testFolder: './tests/projects/flux-capitado',
        name: 'FLUX Capitado',
        baseUrlEnvVar: 'VETIFY_WEBAPP_BASE_URL',
    },
];

export default sites;
