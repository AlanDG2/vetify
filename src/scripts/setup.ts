import { UserHelper } from '@helpers/UsersHelper';
import { wait } from '@helpers/Utils';
import { execSync } from 'child_process'


async function newUserCreationProcessor(tags: string[]): Promise<boolean> {
    // ===== Vetify ====
    // Get vetify user creations
    const vetifyUserTags = tags.filter(t => t.startsWith('@NewVetify'));

    console.log(`  ➡ Number of Vetify users to create: ${vetifyUserTags.length}`);

    if (vetifyUserTags.length === 0) return false;

    try {
        await UserHelper.generateTestUsers(vetifyUserTags.map((vut: string) => ({
            numberOfPlans: vut.includes('+') ? parseInt(vut.split('+')[1]) : 1,
            registration: vut.startsWith('NewVetifyUser'),
        })));
        return true;
    } catch (err: any) {
        console.error('⚠️ Failed to create Vetify users:', err?.message ?? err);
        console.warn('The API for creating users seems unavailable — skipping user creation and continuing setup.');
        return false;
    }
}

export async function execute(): Promise<void> {
    console.log('🚀 Setup started');
    console.log('🔍 Scanning tests (listing, no execution)...');

    // 1. Ask Playwright to output the test list as json without running them
    let rawJson = '[]';
    try {
        rawJson = execSync('npx playwright test --list --reporter=./src/scripts/tag-analyzer-setup.ts', { encoding: 'utf-8' });
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
