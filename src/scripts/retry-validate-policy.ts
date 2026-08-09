// Temporary standalone script (not part of the test suite) — retries ONLY the policy-validation
// step for a fresh account that already registered successfully but hit the known IMP-004
// propagation-delay pattern (business validation not yet linked). Delete after use.
import { GENERAL_COOKIES_STORAGE_STATE_PATH } from '@config/test-configuration';
import { VetifyWebappLoginPage, VetifyWebappPolicyValidationPage } from '@pages/vetify/webapp';
import { chromium } from '@playwright/test';
import { UserFactory } from '@providers/user/user-factory';
import { UserTag } from '@providers/user/tags';

const TARGET_EMAIL = process.argv[2];
if (!TARGET_EMAIL) {
    console.error('Usage: retry-validate-policy.ts <email>');
    process.exit(1);
}

async function main() {
    const accounts = UserFactory.getFreshAccounts();
    const account = accounts.find((a) => a.email === TARGET_EMAIL);
    if (!account) {
        console.error(`Account ${TARGET_EMAIL} not found in fresh-users.json`);
        process.exit(1);
    }

    const browser = await chromium.launch({ headless: process.env.ACCOUNT_ACTIVATION_HEADLESS !== 'false' });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await context.setStorageState(GENERAL_COOKIES_STORAGE_STATE_PATH);
        const loginPage = new VetifyWebappLoginPage(page);
        const policyValidationPage = new VetifyWebappPolicyValidationPage(page);

        console.log(`Logging in as ${account.email}...`);
        await loginPage.load();
        await loginPage.login(account.email, account.password);

        // Give the SPA a moment to react to the auth token and redirect.
        await page.waitForTimeout(4000);
        const url = page.url();
        console.log('Post-login URL (after 4s wait):', url);

        if (url.includes('/validation/policy')) {
            console.log('Landed on validation/policy again — retrying DNI submission...');
            const [response] = await Promise.all([
                page.waitForResponse((r) => r.url().includes('/api/users/update_for_signup')),
                policyValidationPage.validatePolicy({
                    firstName: 'Test',
                    lastName: 'AUTOMATION',
                    identification: account.identification,
                }).catch((e) => console.log('validatePolicy() threw (non-200 response):', e.message)),
            ]);
            console.log('update_for_signup status:', response.status());
            console.log('update_for_signup body:', await response.text().catch(() => '<unreadable>'));
            await page.waitForTimeout(3000);
            console.log('Post-validation URL:', page.url());
        }

        if (!page.url().includes('/validation/policy') && !page.url().includes('/auth/login')) {
            console.log('SUCCESS: account appears activated.');
            const filteredTags = account.tags.filter((t) => t !== UserTag.UNREGISTERED && t !== UserTag.ERROR);
            account.tags = [...filteredTags, UserTag.ACTIVE];
            const storageState = await page.context().storageState();
            console.log('Final tags:', account.tags.join(','));
            console.log('Storage state cookies count:', storageState.cookies.length);
            UserFactory.updateFreshAccounts(accounts);
            console.log('Updated fresh-users.json');
        } else {
            console.log('STILL FAILING — current URL:', page.url());
        }
    } finally {
        await context.close();
        await browser.close();
    }
}

main().catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
});
