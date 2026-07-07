import { UserFactory } from '@providers/user/user-factory';
import { chromium } from '@playwright/test';
import { TestUser, UserTag } from '@providers/user';
import { GENERAL_COOKIES_STORAGE_STATE_PATH } from '@config/test-configuration';
import { VetifyWebappLoginPage, VetifyWebappPolicyValidationPage, VetifyWebappRegistrationPage } from '@pages/vetify/webapp';

function shouldActivate(account: TestUser) {
    return account.registration && account.tags.includes(UserTag.UNREGISTERED);
}

async function activateAccount(account: TestUser, page: any) {
    if (!shouldActivate(account)) {
        return;
    }

    console.log(`▶ Activating ${account.email}`);
    const { email, password, identification } = account;
    try {
        await page.context().setStorageState(GENERAL_COOKIES_STORAGE_STATE_PATH);
        // Instantiate the pages
        const loginPage = new VetifyWebappLoginPage(page);
        const registrationPage = new VetifyWebappRegistrationPage(page);
        const policyValidationPage = new VetifyWebappPolicyValidationPage(page);
        // Navigate to the login page and fill in the form
        await registrationPage.load();

        await registrationPage.register({
            email,
            password,
        });

        // Enter the DNI used in the purchase flow
        await policyValidationPage.validatePolicy({
            firstName: 'Test',
            lastName: 'AUTOMATION',
            identification,
        });
        // Save the storage state to a file

        await Promise.all([loginPage.waitForPageLoaded(), loginPage.load()]);

        await loginPage.loginWithUserRequest(account);
        const filteredTags: UserTag[] = account.tags.filter((tag) => tag !== UserTag.UNREGISTERED);
        account.tags = [...filteredTags, UserTag.ACTIVE];
        console.log(`✔ Activated ${account.email}`);
    } catch (error) {
        console.error(`✘ Failed ${account.email}`, error);
        account.tags.push(UserTag.ERROR);
    }
}

export async function activateFreshAccounts() {
    // Activate all fresh accounts in the UserFactory
    const freshAccounts = UserFactory.getFreshAccounts();

    if (freshAccounts.length === 0) {
        console.log('  - No fresh accounts to activate.');
        return;
    }

    const browser = await chromium.launch({
        headless: process.env.ACCOUNT_ACTIVATION_HEADLESS !== 'false',
    });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (const account of freshAccounts) {
        await activateAccount(account, page);
    }

    await context.close();
    await browser.close();

    UserFactory.updateFreshAccounts(freshAccounts);
}
