import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';
import { blockThirdParty } from '@helpers/blockThirdParty';
import { FluxCapitadoInstitutionalPage } from '@pages/osde/institutional-flux-capitado/InstitutionalPage';
import { OsdeAdquirenteCheckoutPage } from '@pages/osde/institutional-osde-adquirente/CheckoutPage';
import { OsdeAdquirenteInstitutionalPage } from '@pages/osde/institutional-osde-adquirente/InstitutionalPage';
import { OsdeCapitadoInstitutionalPage } from '@pages/osde/institutional-osde-capitado/InstitutionalPage';
import { VetifyCheckoutPage } from '@pages/vetify/institutional/CheckoutPage';
import { VetifyInstitutionalPage } from '@pages/vetify/institutional/InstitutionalPage';
import { VetifyWebappHomePage } from '@pages/vetify/webapp/HomePage';
import { VetifyWebappLoginPage } from '@pages/vetify/webapp/LoginPage';
import { VetifyWebappMyPetsPage } from '@pages/vetify/webapp/MyPetsPage';
import { VetifyWebappMyProfilePage } from '@pages/vetify/webapp/MyProfilePage';
import { VetifyWebappPolicyValidationPage } from '@pages/vetify/webapp/PolicyValidationPage';
import { VetifyWebappRegistrationPage } from '@pages/vetify/webapp/RegistrationPage';
import { VetifyWebappServicesPage } from '@pages/vetify/webapp/ServicesPage';
import { VetifyWebappSideMenuSection } from '@pages/vetify/webapp/SideMenuSection';
import { VetifyWebappAddPetFormPage } from '@pages/vetify/webapp/credentials/AddPetFormPage';
import { VetifyWebappViewPetPage } from '@pages/vetify/webapp/credentials/ViewPetPage';
import {
    VetifyWebappCalendarSchedulingComponent,
    VetifyWebappCancelVideocallModal,
    VetifyWebappRescheduleVideocallPage,
    VetifyWebappVideocallFormPage,
    VetifyWebappVideocallViewPage,
} from '@pages/vetify/webapp/videocall';
import { Page, test as base } from '@playwright/test';
import { TestUser, UserProvider, type UserRequest } from '@providers/user';
import { step } from 'allure-js-commons';
import { allureAnnotations, setAllureDetails } from './report-annotations-setup';

type VetifyWebappContainer = {
    homePage: VetifyWebappHomePage;
    loginPage: VetifyWebappLoginPage;
    myProfilePage: VetifyWebappMyProfilePage;
    servicesPage: VetifyWebappServicesPage;
    registrationPage: VetifyWebappRegistrationPage;
    policyValidationPage: VetifyWebappPolicyValidationPage;
    sideMenuSection: VetifyWebappSideMenuSection;
    videocallFormPage: VetifyWebappVideocallFormPage;
    createVideocallViewPage: (assistanceId: string) => VetifyWebappVideocallViewPage;
    createRescheduleVideocallPage: (assistanceId: string) => VetifyWebappRescheduleVideocallPage;
    createCancelVideocallModal: (assistanceId: string) => VetifyWebappCancelVideocallModal;
    calendarSchedulingComponent: VetifyWebappCalendarSchedulingComponent;
    myPetsPage: VetifyWebappMyPetsPage;
    addPetFormPage: VetifyWebappAddPetFormPage;
    viewPetPage: VetifyWebappViewPetPage;
};

export type TestContainer = {
    osdeAdquiriente: {
        landingPage: OsdeAdquirenteInstitutionalPage;
        checkoutPage: OsdeAdquirenteCheckoutPage;
    };
    osdeCapitado: {
        landingPage: OsdeCapitadoInstitutionalPage;
    };
    fluxCapitado: {
        landingPage: FluxCapitadoInstitutionalPage;
    };
    b2c: {
        landingPage: VetifyInstitutionalPage;
        checkoutPage: VetifyCheckoutPage;
    };
    vetify: {
        getApiClient: (page: Page) => Promise<VetifyWebappApiClient>;
        webapp: VetifyWebappContainer;
    };
};

const test = base.extend<{
    container: TestContainer;
    videocallId: string | undefined;
    user: TestUser | undefined;
    userRequest: UserRequest | undefined;
    allureAnnotations: void;
    institutionalPage: OsdeAdquirenteInstitutionalPage;
    checkoutPage: OsdeAdquirenteCheckoutPage;
    osdeCapitadoLandingPage: OsdeCapitadoInstitutionalPage;
    fluxCapitadoLandingPage: FluxCapitadoInstitutionalPage;
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
}>({
    userRequest: [undefined, { option: true }],
    videocallId: [undefined, { option: true }],
    container: async ({ page }, use) => {
        const webapp = {
            homePage: new VetifyWebappHomePage(page),
            loginPage: new VetifyWebappLoginPage(page),
            myProfilePage: new VetifyWebappMyProfilePage(page),
            servicesPage: new VetifyWebappServicesPage(page),
            registrationPage: new VetifyWebappRegistrationPage(page),
            policyValidationPage: new VetifyWebappPolicyValidationPage(page),
            sideMenuSection: new VetifyWebappSideMenuSection(page),
            videocallFormPage: new VetifyWebappVideocallFormPage(page),
            createVideocallViewPage: (assistanceId: string) => new VetifyWebappVideocallViewPage(page, assistanceId),
            createRescheduleVideocallPage: (assistanceId: string) => new VetifyWebappRescheduleVideocallPage(page, assistanceId),
            createCancelVideocallModal: (assistanceId: string) => new VetifyWebappCancelVideocallModal(page, assistanceId),
            calendarSchedulingComponent: new VetifyWebappCalendarSchedulingComponent(page),
            myPetsPage: new VetifyWebappMyPetsPage(page),
            addPetFormPage: new VetifyWebappAddPetFormPage(page),
            viewPetPage: new VetifyWebappViewPetPage(page),
        };

        await use({
            osdeAdquiriente: {
                landingPage: new OsdeAdquirenteInstitutionalPage(page),
                checkoutPage: new OsdeAdquirenteCheckoutPage(page),
            },
            osdeCapitado: {
                landingPage: new OsdeCapitadoInstitutionalPage(page),
            },
            fluxCapitado: {
                landingPage: new FluxCapitadoInstitutionalPage(page),
            },
            b2c: {
                landingPage: new VetifyInstitutionalPage(page),
                checkoutPage: new VetifyCheckoutPage(page),
            },
            vetify: {
                getApiClient: async (page: Page) => VetifyWebappApiClient.getApiClient(page),
                webapp,
            },
        });
    },
    institutionalPage: async ({ container }, use) => {
        await use(container.osdeAdquiriente.landingPage);
    },
    checkoutPage: async ({ container }, use) => {
        await use(container.osdeAdquiriente.checkoutPage);
    },
    osdeCapitadoLandingPage: async ({ container }, use) => {
        await use(container.osdeCapitado.landingPage);
    },
    fluxCapitadoLandingPage: async ({ container }, use) => {
        await use(container.fluxCapitado.landingPage);
    },
    homePage: async ({ container }, use) => {
        await use(container.vetify.webapp.homePage);
    },
    loginPage: async ({ container }, use) => {
        await use(container.vetify.webapp.loginPage);
    },
    myProfilePage: async ({ container }, use) => {
        await use(container.vetify.webapp.myProfilePage);
    },
    servicesPage: async ({ container }, use) => {
        await use(container.vetify.webapp.servicesPage);
    },
    registrationPage: async ({ container }, use) => {
        await use(container.vetify.webapp.registrationPage);
    },
    policyValidationPage: async ({ container }, use) => {
        await use(container.vetify.webapp.policyValidationPage);
    },
    sideMenuSection: async ({ container }, use) => {
        await use(container.vetify.webapp.sideMenuSection);
    },
    videocallFormPage: async ({ container }, use) => {
        await use(container.vetify.webapp.videocallFormPage);
    },
    videocallViewPage: async ({ container, videocallId }, use) => {
        await use(container.vetify.webapp.createVideocallViewPage(videocallId!));
    },
    rescheduleVideocallPage: async ({ container, videocallId }, use) => {
        await use(container.vetify.webapp.createRescheduleVideocallPage(videocallId!));
    },
    cancelVideocallModal: async ({ container, videocallId }, use) => {
        await use(container.vetify.webapp.createCancelVideocallModal(videocallId!));
    },
    calendarSchedulingComponent: async ({ container }, use) => {
        await use(container.vetify.webapp.calendarSchedulingComponent);
    },
    myPetsPage: async ({ container }, use) => {
        await use(container.vetify.webapp.myPetsPage);
    },
    addPetFormPage: async ({ container }, use) => {
        await use(container.vetify.webapp.addPetFormPage);
    },
    viewPetPage: async ({ container }, use) => {
        await use(container.vetify.webapp.viewPetPage);
    },
    user: [
        async ({ userRequest, container }, use) => {
            if (userRequest) {
                const user = await container.vetify.webapp.loginPage.loginWithUserRequest(userRequest);
                base.skip(user === undefined, `No available test user with source: ${userRequest.source}, siteId: ${userRequest.siteId} and tags: ${userRequest.tags?.join(', ')}`);
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

test.beforeEach(async ({ context }) => {
    await blockThirdParty(context);
});

test.afterEach(async ({ user }) => {
    if (user) {
        UserProvider.releaseUser(user);
    }
});

export { setAllureDetails, step, test };
