import { expect, test } from '@playwright/test';
import { getRandomEmail, getRandomPassword, getRandomIdentificationNumber } from '@helpers/Utils';
import { UserHelper } from '@helpers/UsersHelper';
import { VetifyWebAppRegistrationPage } from '@pages/vetify/webapp/RegistrationPage';
import { VetifyWebappHomePage } from '@pages/vetify/webapp/HomePage';
import { VetifyWebAppPolicyValidationPage } from '@pages/vetify/webapp/PalicyValidationPage';


test.describe('TS02: Vetify - Registración', () => {

  test('[CP-02.01] Vetify - Registración - DNI sin plan', async ({ page }) => {
    const dataSet = {
      firstName: 'Test',
      lastName: 'AUTOMATION',
      email: getRandomEmail(),
      password: getRandomPassword(),
      identification: {
        number: getRandomIdentificationNumber(),
        type: 'DNI'
      }
    }

    // Open the vetify webapp and register a new user
    const registrationPage = new VetifyWebAppRegistrationPage(page);
    await registrationPage.load();

    await registrationPage.register({
      email: dataSet.email,
      password: dataSet.password,
    });

    const policyValidationPage = new VetifyWebAppPolicyValidationPage(page);

    // Enter the DNI used in the purchase flow
    await policyValidationPage.validatePolicy({
      firstName: dataSet.firstName,
      lastName: dataSet.lastName,
      identification: {
        number: dataSet.identification.number,
        type: dataSet.identification.type,
      }
    });

    // Validate the success message is diplayed saying that there is a plan
    const validationMessage = await policyValidationPage.getValidationMessage();
    expect(validationMessage).toContain('Aún no tenés cobertura con vetify');

  });

  test('[CP-02.02] Vetify - Registración - DNI con plan - Sin usuario', { tag: '@NewVetify' }, async ({ page }) => {
    const testUser = await UserHelper.getTestUser();
    test.skip(testUser === undefined);

    // Open the vetify webapp and register a new user
    const registrationPage = new VetifyWebAppRegistrationPage(page);
    await registrationPage.load();

    await registrationPage.register({
      email: testUser!.email,
      password: testUser!.password,
    });

    const policyValidationPage = new VetifyWebAppPolicyValidationPage(page);

    // Enter the DNI used in the purchase flow
    await policyValidationPage.validatePolicy({
      firstName: 'Test',
      lastName: 'AUTOMATION',
      identification: testUser!.identification
    });

    // Validate the success message is diplayed saying that there is a plan
    const validationMessage = await policyValidationPage.getValidationMessage();
    expect(validationMessage).toContain('Ya tenés cobertura con vetify');

    await policyValidationPage.confirmValidation();

    // Validate that is able to access
    // User is redirected to the WebApp home page
    const homePage = new VetifyWebappHomePage(page);
    await page.waitForURL(homePage.getUrl());

    // Open the profile
    // Validate the information in the profile

    // Validate the existance of the plan (waiting to add a mascot)
  });

  test('[CP-02.03] Vetify - Registración - DNI con plan - Con usuario', async ({ page }) => {
    // ToDo: In a future replace this constant for a search in database of active plans
    const ALREADY_REGISTER_IDENTIFICATION_NUMBER = '36416999';

    const dataSet = {
      firstName: 'Test',
      lastName: 'AUTOMATION',
      email: getRandomEmail(),
      password: getRandomPassword(),
      identification: {
        number: ALREADY_REGISTER_IDENTIFICATION_NUMBER,
        type: 'DNI'
      }
    }

    // Open the vetify webapp and register a new user
    const registrationPage = new VetifyWebAppRegistrationPage(page);
    await registrationPage.load();

    await registrationPage.register({
      email: dataSet.email,
      password: dataSet.password,
    });

    const policyValidationPage = new VetifyWebAppPolicyValidationPage(page);

    // Enter the DNI used in the purchase flow
    await policyValidationPage.validatePolicy(
      {
        firstName: dataSet.firstName,
        lastName: dataSet.lastName,
        identification: {
          number: dataSet.identification.number,
          type: dataSet.identification.type,
        }
      },
      {
        updateForSignupResponseStatus: 400
      }
    );

    // Validate the success message is diplayed saying that there is a plan
    const validationMessage = await policyValidationPage.getValidationMessage();
    expect(validationMessage).toContain('Ya existe usuario asociado al numero de identificación');

  });

  test('[CP-02.04] Vetify - Registración - Email ya registrado', async ({ page }) => {
    // ToDo: Reemplace it with a search looking for already existing users
    const ALREADY_REGISTER_EMAIL = 'jcaballero.ext@ikeasistencia.com.ar';

    const dataSet = {
      email: ALREADY_REGISTER_EMAIL,
      password: getRandomPassword(),
    }

    // Open the vetify webapp and register a new user
    const registrationPage = new VetifyWebAppRegistrationPage(page);
    await registrationPage.load();

    await registrationPage.register(
      {
        email: dataSet.email,
        password: dataSet.password,
      },
      {
        registrationSuccessful: false,
      }
    );

    const validationMessage = await registrationPage.getValidationMessage();
    expect(validationMessage).toContain('Ya existe usuario asociado al mail ingresado');
  });
});
