import { test as base } from '@playwright/test';
import { step } from 'allure-js-commons';
import {
    VetifyWebappCalendarSchedulingComponent,
    VetifyWebappCancelVideocallModal,
    VetifyWebappHomePage,
    VetifyWebappLoginPage,
    VetifyWebappMyProfilePage,
    VetifyWebappPolicyValidationPage,
    VetifyWebappRegistrationPage,
    VetifyWebappRescheduleVideocallPage,
    VetifyWebappServicesPage,
    VetifyWebappSideMenuSection,
    VetifyWebappVideocallFormPage,
    VetifyWebappVideocallViewPage,
} from '@pages/vetify/webapp';
import { TestUser, UserProvider, type UserRequest } from '@providers/user';
import { allureAnnotations, setAllureDetails } from './report-annotations-setup';
import { VetifyWebappMyPetsPage } from '@pages/vetify/webapp/MyPetsPage';
import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';
import { VetifyWebappAddPetFormPage } from '@pages/vetify/webapp/credentials/AddPetFormPage';
import { VetifyWebappViewPetPage } from '@pages/vetify/webapp/credentials/ViewPetPage';

const test = base.extend<{
    user: TestUser | undefined;
    userRequest: UserRequest | undefined;
    vetifyWebappApiClient: VetifyWebappApiClient;
    homePage: VetifyWebappHomePage;
    loginPage: VetifyWebappLoginPage;
    myProfilePage: VetifyWebappMyProfilePage;
    servicesPage: VetifyWebappServicesPage;
    registrationPage: VetifyWebappRegistrationPage;
    policyValidationPage: VetifyWebappPolicyValidationPage;
    sideMenuSection: VetifyWebappSideMenuSection;
    videocallFormPage: VetifyWebappVideocallFormPage;
    videocallViewPage: VetifyWebappVideocallViewPage;
    rescheduleVideocallPage: VetifyWebappRescheduleVideocallPage;
    cancelVideocallModal: VetifyWebappCancelVideocallModal;
    calendarSchedulingComponent: VetifyWebappCalendarSchedulingComponent;
    myPetsPage: VetifyWebappMyPetsPage;
    addPetFormPage: VetifyWebappAddPetFormPage;
    viewPetPage: VetifyWebappViewPetPage;
    videocallId: string | undefined;
    petId: string | undefined;
    allureAnnotations: void;
}>({
    videocallId: [undefined, { option: true }],
    petId: [undefined, { option: true }],
    userRequest: [undefined, { option: true }],
    vetifyWebappApiClient: async ({ page }, use) => {
        const vetifyWebappApiClient = await VetifyWebappApiClient.getApiClient(page);
        await use(vetifyWebappApiClient);
    },
    homePage: async ({ page }, use) => {
        const homePage = new VetifyWebappHomePage(page);
        await use(homePage);
    },
    loginPage: async ({ page }, use) => {
        const loginPage = new VetifyWebappLoginPage(page);
        await use(loginPage);
    },
    myProfilePage: async ({ page }, use) => {
        const myProfilePage = new VetifyWebappMyProfilePage(page);
        await use(myProfilePage);
    },
    servicesPage: async ({ page }, use) => {
        const servicesPage = new VetifyWebappServicesPage(page);
        await use(servicesPage);
    },
    registrationPage: async ({ page }, use) => {
        const registrationPage = new VetifyWebappRegistrationPage(page);
        await use(registrationPage);
    },
    policyValidationPage: async ({ page }, use) => {
        const policyValidationPage = new VetifyWebappPolicyValidationPage(page);
        await use(policyValidationPage);
    },
    sideMenuSection: async ({ page }, use) => {
        const sideMenuSection = new VetifyWebappSideMenuSection(page);
        await use(sideMenuSection);
    },
    videocallFormPage: async ({ page }, use) => {
        const videocallFormPage = new VetifyWebappVideocallFormPage(page);
        await use(videocallFormPage);
    },
    videocallViewPage: async ({ page, videocallId }, use) => {
        const videocallViewPage = new VetifyWebappVideocallViewPage(page, videocallId!);
        await use(videocallViewPage);
    },
    rescheduleVideocallPage: async ({ page, videocallId }, use) => {
        const rescheduleVideocallPage = new VetifyWebappRescheduleVideocallPage(page, videocallId!);
        await use(rescheduleVideocallPage);
    },
    cancelVideocallModal: async ({ page, videocallId }, use) => {
        const cancelVideocallModal = new VetifyWebappCancelVideocallModal(page, videocallId!);
        await use(cancelVideocallModal);
    },
    calendarSchedulingComponent: async ({ page }, use) => {
        const calendarSchedulingComponent = new VetifyWebappCalendarSchedulingComponent(page);
        await use(calendarSchedulingComponent);
    },
    myPetsPage: async ({ page }, use) => {
        const myPetsPage = new VetifyWebappMyPetsPage(page);
        await use(myPetsPage);
    },
    addPetFormPage: async ({ page, petId }, use) => {
        const addPetFormPage = new VetifyWebappAddPetFormPage(page, petId);
        await use(addPetFormPage);
    },
    viewPetPage: async ({ page, petId }, use) => {
        const viewPetPage = new VetifyWebappViewPetPage(page, petId);
        await use(viewPetPage);
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
