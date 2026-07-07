import { test as base } from '@playwright/test';
import { step } from 'allure-js-commons';
import { OsdeAdquirienteInstitutionalPage } from '@pages/osde/institutional/InstitutionalPage';
import { OsdeAdquirienteCheckoutPage } from '@pages/osde/institutional/CheckoutPage';
import { TestUser, UserProvider, type UserRequest } from '@providers/user';
import { allureAnnotations, setAllureDetails } from './report-annotations-setup';
import { VetifyWebappLoginPage } from '@pages/vetify/webapp';

const test = base.extend<{
    user: TestUser | undefined;
    userRequest: UserRequest | undefined;
    institutionalPage: OsdeAdquirienteInstitutionalPage;
    checkoutPage: OsdeAdquirienteCheckoutPage;
    loginPage: VetifyWebappLoginPage;
    allureAnnotations: void;
}>({
    userRequest: [undefined, { option: true }],
    institutionalPage: async ({ page }, use) => {
        const institutionalPage = new OsdeAdquirienteInstitutionalPage(page);
        await use(institutionalPage);
    },
    checkoutPage: async ({ page }, use) => {
        const checkoutPage = new OsdeAdquirienteCheckoutPage(page);
        await use(checkoutPage);
    },
    loginPage: async ({ page }, use) => {
        const loginPage = new VetifyWebappLoginPage(page);
        await use(loginPage);
    },
    user: [
        async ({ userRequest, loginPage }, use) => {
            if (userRequest) {
                const user = await loginPage.loginWithUserRequest(userRequest);
                base.skip(user === undefined, `No available test user with source: ${userRequest.source} and tags: ${userRequest.tags?.join(', ')}`);
                await use(user);
            } else {
                await use(undefined);
            }
        },
        { scope: 'test', auto: true, title: 'Authentication' },
    ],
    allureAnnotations: [
        async ({}, use, testInfo) => {
            await allureAnnotations(testInfo);
            await use();
        },
        { scope: 'test', auto: true, title: 'Allure Annotations' },
    ],
});

test.afterEach(async ({ user }) => {
    if (user) {
        UserProvider.releaseUser(user);
    }
});

export { test, step, setAllureDetails };
