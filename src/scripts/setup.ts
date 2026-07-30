import { SiteId } from '@config/environment';
import { wait } from '@helpers/automation-utils';
import { UserFactory } from '@providers/user/user-factory';
import { execSync } from 'child_process';

type UserCreationTagConfig = {
    label: string;
    baseTag: string;
    registrationTag: string;
    siteId: SiteId;
};

const USER_CREATION_TAG_CONFIGS: UserCreationTagConfig[] = [
    {
        label: 'Vetify B2C',
        baseTag: '@NewVetifyB2C',
        registrationTag: '@NewVetifyB2CUser',
        siteId: SiteId.VETIFY_ADQUIRENTE,
    },
    {
        label: 'Adquirente OSDE',
        baseTag: '@NewAdquirenteOSDE',
        registrationTag: '@NewAdquirenteOSDEUser',
        siteId: SiteId.OSDE_ADQUIRENTE,
    },
    {
        label: 'Capitado OSDE',
        baseTag: '@NewCapitadoOSDE',
        registrationTag: '@NewCapitadoOSDEUser',
        siteId: SiteId.OSDE_CAPITADO,
    },
    {
        label: 'Capitado Flux',
        baseTag: '@NewCapitadoFlux',
        registrationTag: '@NewCapitadoFluxUser',
        siteId: SiteId.FLUX_CAPITADO,
    },
];

function getNumberOfPlans(tag: string): number {
    if (!tag.includes('+')) return 1;
    const parsedPlanCount = parseInt(tag.split('+')[1], 10);
    return Number.isNaN(parsedPlanCount) ? 1 : parsedPlanCount;
}

async function newUserCreationProcessor(tags: string[]): Promise<boolean> {
    const creationRequests = USER_CREATION_TAG_CONFIGS.flatMap((config) => {
        const typeTags = tags.filter((tag) => tag.startsWith(config.baseTag));
        console.log(`  ➡ Number of ${config.label} users to create: ${typeTags.length}`);

        return typeTags.map((tag) => ({
            numberOfPlans: getNumberOfPlans(tag),
            registration: tag.startsWith(config.registrationTag),
            siteId: config.siteId,
            configLabel: config.label,
        }));
    });

    if (creationRequests.length === 0) return false;

    try {
        const createdCountByLabel = await UserFactory.generateTestUsers(creationRequests);

        USER_CREATION_TAG_CONFIGS.forEach((config) => {
            const planned = creationRequests.filter((req) => req.configLabel === config.label).length;
            const created = createdCountByLabel[config.label] ?? 0;
            if (planned > 0) {
                console.log(`  ✅ Created ${created} of ${planned} ${config.label} users`);
            }
        });

        return true;
    } catch (err: any) {
        console.error('⚠️ Failed to create requested setup users:', err?.message ?? err);
        console.warn('The API for creating users seems unavailable — skipping user creation and continuing setup.');
        return false;
    }
}

export async function execute(): Promise<void> {
    console.log('🚀 Setup started');

    const ignoreUserCreation = (process.env.IGNORE_USER_CREATION ?? '').trim().toLowerCase() === 'true';
    if (ignoreUserCreation) {
        console.log('⏭️ IGNORE_USER_CREATION=true, skipping test user creation setup.');
        console.log('✅ Setup finished');
        return;
    }

    console.log('🔍 Scanning tests (listing, no execution)...');

    // 1. Ask Playwright to output the test list as json without running them
    let rawJson = '[]';
    try {
        rawJson = execSync('npm run get-tags', { encoding: 'utf-8' });
        // Remove the first 4 lines of output (Playwright banner)
        rawJson = rawJson.split('\n').splice(4).join('\n').trim();
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('⚠️ Failed to list Playwright tests:', err?.message ?? err);
        console.warn('Playwright may be unavailable. Proceeding with an empty test list.');
    }

    let allTags: string[] = [];
    try {
        allTags = JSON.parse(rawJson) as string[];
        console.log(`📄 Playwright returned ${allTags.length} tag entries`);
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('⚠️ Could not parse Playwright output as JSON:', err?.message ?? err);
        console.warn('Proceeding with an empty tag list.');
        allTags = [];
    }

    // Detect each creation user tag and proceed with the creation
    // Example: Each @NewVetifyB2CUser tag will result in a Vetify B2C user
    console.log('🛠️ Processing user creation tags...');
    const hasNewUsers = await newUserCreationProcessor(allTags);

    if (hasNewUsers) {
        console.log('⏳ Waiting 15 minutes for data propagation (plans availability)...');
        await wait(1_000 * 60 * 15);
    }

    console.log('✅ Setup finished');
}

if (typeof require !== 'undefined' && require.main === module) {
    execute().catch((err) => {
        // eslint-disable-next-line no-console
        console.error('❌ Setup encountered an unexpected error:', err?.message ?? err);
        console.warn('Continuing despite the error. Check logs for details.');
    });
}
