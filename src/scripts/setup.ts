import { UserFactory } from '@providers/user/user-factory';
import { wait } from '@helpers/automation-utils';
import { execSync } from 'child_process';
import { SiteId } from '@config/environment';

async function newUserCreationProcessor(tags: string[]): Promise<boolean> {
    // ===== Vetify ====
    // Get vetify user creations
    const vetifyUserTags = tags.filter((t) => t.startsWith('@NewVetify'));
    const osdeUserTags = tags.filter((t) => t.startsWith('@NewOsde'));

    console.log(`  ➡ Number of Vetify users to create: ${vetifyUserTags.length}`);
    console.log(`  ➡ Number of Osde users to create: ${osdeUserTags.length}`);

    if (vetifyUserTags.length === 0 && osdeUserTags.length === 0) return false;

    try {
        await UserFactory.generateTestUsers(
            vetifyUserTags.map((vut: string) => ({
                numberOfPlans: vut.includes('+') ? parseInt(vut.split('+')[1]) : 1,
                registration: vut.startsWith('@NewVetifyUser'),
                brand: SiteId.VETIFY_ADQUIRIENTE,
            })),
        );
        await UserFactory.generateTestUsers(
            osdeUserTags.map((out: string) => ({
                numberOfPlans: out.includes('+') ? parseInt(out.split('+')[1]) : 1,
                registration: out.startsWith('@NewOsdeUser'),
                brand: SiteId.OSDE_ADQUIRIENTE,
            })),
        );
        return true;
    } catch (err: any) {
        console.error('⚠️ Failed to create Vetify users:', err?.message ?? err);
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
    // Example: Each @NewVetifyUser tag will result in a Vetify user
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
