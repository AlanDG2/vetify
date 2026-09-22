import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';
import { blockThirdParty } from '@helpers/blockThirdParty';
import { IkeWebappHomePage } from '@pages/ike/webapp/HomePage';
import { IkeWebappLoginPage } from '@pages/ike/webapp/LoginPage';
import { FluxCapitadoInstitutionalPage } from '@pages/osde/institutional-flux-capitado/InstitutionalPage';
import { OsdeAdquirenteCheckoutPage } from '@pages/osde/institutional-osde-adquirente/CheckoutPage';
import { OsdeAdquirenteInstitutionalPage } from '@pages/osde/institutional-osde-adquirente/InstitutionalPage';
import { OsdeCapitadoInstitutionalPage } from '@pages/osde/institutional-osde-capitado/InstitutionalPage';
import { VetifyCheckoutPage } from '@pages/vetify/institutional/CheckoutPage';
import { VetifyInstitutionalPage } from '@pages/vetify/institutional/InstitutionalPage';
import { VetifyWebappFeatureUnavailableModal } from '@pages/vetify/webapp/FeatureUnavailableModal';
import { VetifyWebappHomePage } from '@pages/vetify/webapp/HomePage';
import { VetifyWebappLoginPage } from '@pages/vetify/webapp/LoginPage';
import { VetifyWebappMyAppointmentsPage } from '@pages/vetify/webapp/MyAppointmentsPage';
import { VetifyWebappMyPetsPage } from '@pages/vetify/webapp/MyPetsPage';
import { VetifyWebappMyPlansPage } from '@pages/vetify/webapp/MyPlansPage';
import { VetifyWebappMyProfilePage } from '@pages/vetify/webapp/MyProfilePage';
import { VetifyWebappNuevoReintegroPage } from '@pages/vetify/webapp/NuevoReintegroPage';
import { VetifyWebappPolicyValidationPage } from '@pages/vetify/webapp/PolicyValidationPage';
import { VetifyWebappRegistrationPage } from '@pages/vetify/webapp/RegistrationPage';
import { VetifyWebappReintegrosPage } from '@pages/vetify/webapp/ReintegrosPage';
import { VetifyWebappResetPasswordPage } from '@pages/vetify/webapp/ResetPasswordPage';
import { VetifyWebappServicesPage } from '@pages/vetify/webapp/ServicesPage';
import { VetifyWebappSideMenuSection } from '@pages/vetify/webapp/SideMenuSection';
import { VetifyWebappSystemUnavailableComponent } from '@pages/vetify/webapp/SystemUnavailableComponent';
import { VetifyWebappVeterinariasSearchModal } from '@pages/vetify/webapp/VeterinariasSearchModal';
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
    resetPasswordPage: VetifyWebappResetPasswordPage;
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
    myAppointmentsPage: VetifyWebappMyAppointmentsPage;
    myPlansPage: VetifyWebappMyPlansPage;
    reintegrosPage: VetifyWebappReintegrosPage;
    nuevoReintegroPage: VetifyWebappNuevoReintegroPage;
    systemUnavailableComponent: VetifyWebappSystemUnavailableComponent;
    featureUnavailableModal: VetifyWebappFeatureUnavailableModal;
    veterinariasSearchModal: VetifyWebappVeterinariasSearchModal;
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
    ike: {
        webapp: {
            loginPage: IkeWebappLoginPage;
            homePage: IkeWebappHomePage;
        };
    };
};

const test = base.extend<{
    container: TestContainer;
    videocallId: string | undefined;
    user: TestUser | undefined;
    userRequest: UserRequest | undefined;
    allureAnnotations: void;
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
            resetPasswordPage: new VetifyWebappResetPasswordPage(page),
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
            myAppointmentsPage: new VetifyWebappMyAppointmentsPage(page),
            myPlansPage: new VetifyWebappMyPlansPage(page),
            reintegrosPage: new VetifyWebappReintegrosPage(page),
            nuevoReintegroPage: new VetifyWebappNuevoReintegroPage(page),
            systemUnavailableComponent: new VetifyWebappSystemUnavailableComponent(page),
            featureUnavailableModal: new VetifyWebappFeatureUnavailableModal(page),
            veterinariasSearchModal: new VetifyWebappVeterinariasSearchModal(page),
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
            ike: {
                webapp: {
                    loginPage: new IkeWebappLoginPage(page),
                    homePage: new IkeWebappHomePage(page),
                },
            },
        });
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
