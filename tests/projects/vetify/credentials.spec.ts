import { expect, Page } from '@playwright/test';
import { setAllureDetails, step, test } from '../../framework/vetify-base-test';
import { environment } from '@config/environment';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { getPetAge, getRandomElement, getRandomInt } from '@helpers/automation-utils';
import { DateTime } from 'luxon';
import { Response } from 'playwright-core';

function getPetProfilePicture(petType: string): string {
    return `src/fixtures/images/${petType === 'Perro' ? 'dog' : 'cat'}-profile-photo.jpg`;
}

test.describe('Credenciales Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Visualización de Planes
    // =========================================================================
    test.describe('TS-01 Visualización de Planes', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('CP-01 - Credencial - Vetify - Usuario con plan - Plan sin mascota asociada', { tag: ['@critical'] }, async ({ myPetsPage, page }) => {
                // Precondiciones:
                // - Usuario registrado con un plan vigente.
                // - Plan vigente sin mascota asociada.

                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.', 'Plan vigente sin mascota asociada.'],
                    steps: [
                        'Iniciar sesión con un usuario con un plan vigente que no tenga mascota asociada a al menos un plan.',
                        'Navegar a la pantalla de mascotas.',
                        'Visualizar un plan sin mascota asignada.',
                    ],
                    expectedResult: ['Hay un mensaje indicando que el plan no tiene una mascota asignada.', 'El plan presenta un botón para cargar los datos.'],
                });
                // Pasos:
                await step('1. Navegar a la pantalla de mascotas.', async () => {
                    await Promise.all([myPetsPage.load(), myPetsPage.waitForPageLoaded()]);
                });
                // Resultado esperado:
                await step('Hay un mensaje indicando que el plan no tiene una mascota asignada.', async () => {
                    await expect(page.getByText('Dejá su credencial lista')).toBeVisible();
                });
                await step('El plan presenta un botón para cargar los datos.', async () => {
                    await expect(myPetsPage.addPetToPlanBtn).toBeVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('CP-02 - Credencial - Vetify - Usuario con plan - Plan con mascota asociada', { tag: ['@critical'] }, async ({ myPetsPage }) => {
                // Precondiciones:
                // - Usuario registrado con un plan vigente.
                // - Plan vigente con mascota asociada.
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.', 'Plan vigente sin mascota asociada.'],
                    steps: [
                        'Iniciar sesión con un usuario con un plan vigente que tenga mascota asociada a al menos un plan.',
                        'Navegar a la pantalla de mascotas.',
                        'Visualizar un plan con mascota asignada.',
                    ],
                    expectedResult: ['El plan muestra los datos de la mascota asociada al plan (foto, nombre) además de un botón/acción para ver/descargar la credencial.'],
                });
                // Pasos:
                await step('1. Navegar a la pantalla de mascotas.', async () => {
                    await Promise.all([myPetsPage.load(), myPetsPage.waitForPageLoaded()]);
                });
                // Resultado esperado:
                await step('El plan muestra los datos de la mascota asociada al plan.', async () => {
                    await expect(myPetsPage.petCards).toBeVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('CP-03 - Credencial - Vetify - Subscribir nueva mascota - Sin planes libres', { tag: ['@critical'] }, async ({ myPetsPage, page }) => {
                // Precondiciones:
                // - Usuario registrado con un plan vigente.
                // - El usuario ha registrado una mascota en cada uno de los planes contratados.
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.', 'El usuario ha registrado una mascota en cada uno de los planes contratados.'],
                    steps: ['Iniciar sesión con un usuario con un plan vigente.', 'Navegar a la pantalla de mascotas.', 'Presionar el botón "Agregar mascota".'],
                    expectedResult: ['El sistema redirecciona a la web institucional de vetify (permitiendo al usuario adquirir un otro plan).'],
                });
                // Pasos:
                await step('1. Navegar a la pantalla de mascotas.', async () => {
                    await Promise.all([myPetsPage.load(), myPetsPage.waitForPageLoaded()]);
                });
                await step('2. Presionar el botón "Agregar mascota".', async () => {
                    await myPetsPage.addNewPlanBtn.click();
                });
                // Resultado esperado:
                await step('El sistema redirecciona a la web institucional de vetify (permitiendo al usuario adquirir un otro plan).', async () => {
                    const goToInstitutionalWebBtn = page.getByRole('button', { name: 'Ir a la web' });
                    await expect(goToInstitutionalWebBtn).toBeVisible();
                    const [newPage] = await Promise.all([page.context().waitForEvent('page'), goToInstitutionalWebBtn.click()]);
                    await expect(newPage).toHaveURL(environment.VETIFY_INSTITUTIONAL_BASE_URL);
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.PLAN_WITHOUT_PET],
                    reserve: false,
                    numberOfPlans: 2,
                    ignoreReserved: true,
                },
            });

            test('CP-04 - Credencial - Vetify - Subscribir nueva mascota - Con planes libres', { tag: ['@critical'] }, async ({ myPetsPage, addPetFormPage }) => {
                // Precondiciones:
                // - Usuario registrado con un plan vigente.
                // - El usuario cuenta con planes sin mascota asignadas.
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.', 'El usuario cuenta con planes sin mascota asignadas.'],
                    steps: ['Iniciar sesión con un usuario con un plan vigente.', 'Navegar a la pantalla de mascotas.', 'Presionar el botón "Agregar mascota".'],
                    expectedResult: ['El sistema abre el modal para cargar la mascota del uno de los planes sin mascotas.'],
                });

                // Pasos:
                await step('1. Navegar a la pantalla de mascotas.', async () => {
                    await Promise.all([myPetsPage.load(), myPetsPage.waitForPageLoaded()]);
                });
                await step('2. Presionar el botón "Agregar mascota".', async () => {
                    await myPetsPage.addNewPlanBtn.click();
                });
                // Resultado esperado:
                await step('El sistema abre el modal para cargar la mascota del uno de los planes sin mascotas.', async () => {
                    await expect(addPetFormPage.startWarningModalTitle).toBeVisible();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 Cargar credencial - Validación de Pasos
    // =========================================================================
    test.describe('TS-02 Cargar credencial - Validación de Pasos', () => {
        let petId: string | undefined;
        const petName = `Test${Date.now()}`;
        const petType = getRandomElement(['Perro', 'Gato'])!;
        const petGender = getRandomElement(['Macho', 'Hembra'])!;
        const dateOfBirth = DateTime.now().minus({
            days: getRandomInt(1, 365),
            years: getRandomInt(0, 10),
        });

        test.use({
            userRequest: {
                source: UserSource.Pooled,
                tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                reserve: false,
                ignoreReserved: true,
            },
        });

        test.beforeEach(async ({ vetifyWebappApiClient }) => {
            const pets = await vetifyWebappApiClient.getUserPets();
            const freePet = pets.find((pet: any) => pet.estado === 'LIBRE');
            petId = freePet ? freePet.id : undefined;
        });

        test.describe(() => {
            test.beforeEach(async ({ addPetFormPage }) => {
                addPetFormPage.setPetId(petId!);
                addPetFormPage.setPetName(petName);
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 0
            // ------------------------------------------------------------------------

            test('CP-01 - Cargar Credencial - Vetify - Inicio - Comenzar carga', { tag: ['@critical'] }, async ({ addPetFormPage }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en la pantalla de comienzo de carga de credencial.

                await step('El usuario se encuentra en la pantalla de comienzo de carga de credencial.', async () => {
                    await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);

                    await addPetFormPage.startWarningContinueBtn.click();
                });

                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El usuario se encuentra en la pantalla de comienzo de carga de credencial.',
                    ],
                    steps: ['Presionar el botón "Continuar".'],
                    expectedResult: ['El usuario es redireccionado correctamente al paso 1.'],
                });
                // Pasos:
                await step('1. Presionar el botón "Continuar".', async () => {
                    await addPetFormPage.continueButton.click();
                });
                // Resultado esperado:
                // - El usuario es redireccionado correctamente al paso 1.
                expect(await addPetFormPage.getStepNumber()).toBe(1);
            });

            test('CP-02 - Cargar Credencial - Vetify - Inicio - Volver al Home', async ({ addPetFormPage, homePage }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en la pantalla de comienzo de carga de credencial.

                await step('El usuario se encuentra en la pantalla de comienzo de carga de credencial.', async () => {
                    await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                    await addPetFormPage.startWarningContinueBtn.click();
                });

                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El usuario se encuentra en la pantalla de comienzo de carga de credencial.',
                    ],
                    steps: ['Presionar el botón atrás.'],
                    expectedResult: ['El sistema redirecciona correctamente a la pantalla de home.'],
                });
                // Pasos:
                await step('1. Presionar el botón atrás.', async () => {
                    await Promise.all([homePage.waitForPageLoaded(), addPetFormPage.backButton.click()]);
                });
                // Resultado esperado:
                await step('El sistema redirecciona correctamente a la pantalla de home.', async () => {
                    await expect(homePage.greetingLbl).toBeVisible();
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 1
            // ------------------------------------------------------------------------

            test('CP-03 - Paso 1 - Nombre - Limite de caracteres', async ({ addPetFormPage }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                    await addPetFormPage.startWarningContinueBtn.click();
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(1);
                });
                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El usuario se encuentra en el paso 1 del proceso de carga de credencial.',
                    ],
                    steps: ['Ingresar un sólo caracter en el campo nombre.'],
                    expectedResult: [
                        'El sistema muestra un mensaje de error indicando que la cantidad de caracteres para el campo nombre debe ser de entre 2 a 100 (extremos incluídos).',
                        'El botón "Continuar" permanece deshabilitado.',
                    ],
                });
                // Pasos:
                await step('1. Ingresar un sólo caracter en el campo nombre.', async () => {
                    await addPetFormPage.petNameInput.fill('a');
                    // Toggle focus on petNameInput
                    await addPetFormPage.stepTitleLbl.click();
                });
                // Resultado esperado:
                await step(
                    'El sistema muestra un mensaje de error indicando que la cantidad de caracteres para el campo nombre debe ser de entre 2 a 100 (extremos incluídos).',
                    async () => {
                        await expect(addPetFormPage.petNameErrorLbl).toBeVisible();
                        await expect(addPetFormPage.petNameErrorLbl).toHaveText('El nombre debe tener al menos 2 caracteres');
                    },
                );
                await step('El botón "Continuar" permanece deshabilitado.', async () => {
                    await expect(addPetFormPage.continueButton).toBeDisabled();
                });
            });

            test('CP-04 - Paso 1 - Nombre - Limite de caracteres (Variación: más de 100 caracteres)', async ({ addPetFormPage }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                    await addPetFormPage.startWarningContinueBtn.click();
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(1);
                });
                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El usuario se encuentra en el paso 1 del proceso de carga de credencial.',
                    ],
                    steps: ['Ingresar más de 100 caracteres en el campo nombre.'],
                    expectedResult: [
                        'El sistema muestra un mensaje de error indicando que la cantidad de caracteres para el campo nombre debe ser de entre 2 a 100 (extremos incluídos).',
                        'El botón "Continuar" permanece deshabilitado.',
                    ],
                });
                // Pasos:
                await step('1. Ingresar más de 100 caracteres en el campo nombre.', async () => {
                    await addPetFormPage.petNameInput.fill('a'.repeat(101));
                    // Toggle focus on petNameInput
                    await addPetFormPage.stepTitleLbl.click();
                });
                // Resultado esperado:
                // TODO: This is a bug - The error message is no acurate, it should say "El nombre debe tener no más de 100 caracteres"
                // await step(
                //   'El sistema muestra un mensaje de error indicando que la cantidad de caracteres para el campo nombre debe ser de entre 2 a 100 (extremos incluídos).',
                //   async () => {
                //     await expect(addPetFormPage.petNameErrorLbl).toBeVisible();
                //     await expect(addPetFormPage.petNameErrorLbl).toHaveText('El nombre debe tener no más de 100 caracteres');
                //   },
                // );
                await step('El botón "Continuar" permanece deshabilitado.', async () => {
                    await expect(addPetFormPage.continueButton).toBeDisabled();
                });
            });

            test('CP-05 - Paso 1 - Navegar al paso 2', { tag: ['@critical'] }, async ({ addPetFormPage }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                    await addPetFormPage.startWarningContinueBtn.click();
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(1);
                });
                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El usuario se encuentra en el paso 1 del proceso de carga de credencial.',
                    ],
                    steps: ['Ingresar un nombre de mascota (entre 2 a 100 caracteres).', 'Presionar el botón "Continuar".'],
                    expectedResult: ['El sistema redirecciona al usuario al paso 2 del proceso de carga de credencial.'],
                });
                // Pasos:
                await step('1. Ingresar un nombre de mascota (entre 2 a 100 caracteres).', async () => {
                    await addPetFormPage.petNameInput.fill(petName);
                });
                await step('2. Presionar el botón "Continuar".', async () => {
                    await addPetFormPage.continueButton.click();
                });
                // Resultado esperado:
                await step('El sistema redirecciona al usuario al paso 2 del proceso de carga de credencial.', async () => {
                    expect(await addPetFormPage.getStepNumber()).toBe(2);
                });
            });

            test('CP-06 - Paso 1 - Volver a la pantalla de comienzo', async ({ addPetFormPage }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                    await addPetFormPage.startWarningContinueBtn.click();
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(1);
                });
                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El usuario se encuentra en el paso 1 del proceso de carga de credencial.',
                    ],
                    steps: ['Presionar el botón atrás.'],
                    expectedResult: ['El sistema redirecciona al usuario a la pantalla de home.', 'Todos los datos ingresados son descartados.'],
                });
                // Pasos:
                await step('1. Presionar el botón atrás', async () => {
                    await addPetFormPage.backButton.click();
                });
                // Resultado esperado:
                await step('El sistema redirecciona al usuario a la pantalla de home.', async () => {
                    expect(await addPetFormPage.getStepNumber()).toBe(0);
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 2
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach(async ({ addPetFormPage }) => {
                    await step('El usuario se encuentra en el paso 2 del proceso de carga de credencial.', async () => {
                        await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                        await addPetFormPage.startWarningContinueBtn.click();
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(1);
                        await addPetFormPage.petNameInput.fill(petName);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(2);
                    });
                });

                test('CP-07 - Paso 2 - Seleccionar sólo tipo de mascota', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 2 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 2 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar el tipo de mascota.'],
                        expectedResult: ['El botón "Continuar" permanece deshabilitado.'],
                    });
                    // Pasos:
                    await step('1. Seleccionar el tipo de mascota.', async () => {
                        await addPetFormPage.selectPetType(petType);
                    });
                    // Resultado esperado:
                    await step('El botón "Continuar" permanece deshabilitado.', async () => {
                        expect(addPetFormPage.continueButton).toBeDisabled();
                    });
                });

                test('CP-08 - Paso 2 - Seleccionar sólo género', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 2 del proceso de carga de credencial.
                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 2 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar el género.'],
                        expectedResult: ['El botón "Continuar" permanece deshabilitado.'],
                    });
                    // Pasos:
                    await step('1. Seleccionar el género.', async () => {
                        await addPetFormPage.selectPetGender(petGender);
                    });
                    // Resultado esperado:
                    await step('El botón "Continuar" permanece deshabilitado.', async () => {
                        expect(addPetFormPage.continueButton).toBeDisabled();
                    });
                });

                test('CP-09 - Paso 2 - Navegar al paso 3', { tag: ['@critical'] }, async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 2 del proceso de carga de credencial.
                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 2 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar el género.', 'Seleccionar el tipo de mascota.', 'Presionar el botón "Continuar".'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 3 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Seleccionar el género.', async () => {
                        await addPetFormPage.selectPetGender(petGender);
                    });
                    await step('2. Seleccionar el tipo de mascota.', async () => {
                        await addPetFormPage.selectPetType(petType);
                    });
                    await step('3. Presionar el botón "Continuar".', async () => {
                        await addPetFormPage.continueButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 3 del proceso de carga de credencial.', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                    });
                });

                test('CP-10 - Paso 2 - Volver al paso 1', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 2 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 2 del proceso de carga de credencial.',
                        ],
                        steps: ['Presionar el botón atrás.'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 1 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Presionar el botón atrás.', async () => {
                        await addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 1 del proceso de carga de credencial.', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(1);
                    });
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 3
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach(async ({ addPetFormPage }) => {
                    await step('El usuario se encuentra en el paso 2 del proceso de carga de credencial.', async () => {
                        await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                        await addPetFormPage.startWarningContinueBtn.click();
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(1);
                        await addPetFormPage.petNameInput.fill(petName);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(2);
                        await addPetFormPage.selectPetGender(petGender);
                    });
                });

                test('CP-11 - Paso 3 - Validar listado de raza - Tipo perro', { tag: ['@critical'] }, async ({ addPetFormPage, vetifyWebappApiClient }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 3 del proceso de carga de credencial.
                    // - El usuario seleccionó tipo de mascota "Perro" en el paso 3 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 3 del proceso de carga de credencial.',
                            'El usuario seleccionó tipo de mascota "Perro" en el paso 3 del proceso de carga de credencial.',
                        ],
                        steps: ['Deplegar el selector de la raza de mascota.'],
                        expectedResult: ['El sistema lista correctamente todas las razas de perro.'],
                    });
                    // Pasos:
                    await step('1. Desplegar el selector de la raza de mascota.', async () => {
                        await addPetFormPage.selectPetType('Perro');
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                    });
                    // Resultado esperado:
                    await step('El sistema lista correctamente todas las razas de perro.', async () => {
                        const petBreedOptions = await addPetFormPage.petBreedOptions.all();
                        const existingPetBreeds = await Promise.all(petBreedOptions.map(async (breedOption) => await breedOption.innerText()));

                        const data: any[] = await vetifyWebappApiClient.getPetBreeds();
                        const expectedDogBreeds = data.find((type: any) => type.descripcion === 'PERRO').razas.map((b: any) => b.descripcion);

                        expect(existingPetBreeds.sort().join(', ')).toBe(expectedDogBreeds.sort().join(', '));
                    });
                });

                test('CP-12 - Paso 3 - Validar listado de raza - Tipo gato', { tag: ['@critical'] }, async ({ addPetFormPage, vetifyWebappApiClient }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 3 del proceso de carga de credencial.
                    // - El usuario seleccionó tipo de mascota "Gato" en el paso 3 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 3 del proceso de carga de credencial.',
                            'El usuario seleccionó tipo de mascota "Gato" en el paso 3 del proceso de carga de credencial.',
                        ],
                        steps: ['Desplegar el selector de la raza de mascota.'],
                        expectedResult: ['El sistema lista correctamente todas las razas de gato.'],
                    });
                    // Pasos:
                    await step('1. Desplegar el selector de la raza de mascota.', async () => {
                        await addPetFormPage.selectPetType('Gato');
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                    });
                    // Resultado esperado:
                    await step('El sistema lista correctamente todas las razas de gato.', async () => {
                        const petBreedOptions = await addPetFormPage.petBreedOptions.all();
                        const existingPetBreeds = await Promise.all(petBreedOptions.map(async (breedOption) => await breedOption.innerText()));

                        const data: any[] = await vetifyWebappApiClient.getPetBreeds();
                        const expectedDogBreeds = data.find((type: any) => type.descripcion === 'GATO').razas.map((b: any) => b.descripcion);

                        expect(existingPetBreeds.sort().join(', ')).toBe(expectedDogBreeds.sort().join(', '));
                    });
                });

                test('CP-13 - Paso 3 - Navegar al paso 4', { tag: ['@critical'] }, async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 3 del proceso de carga de credencial.
                    await step('El usuario se encuentra en el paso 3 del proceso de carga de credencial.', async () => {
                        await addPetFormPage.selectPetType(petType);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                    });

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 3 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar una raza.', 'Presionar el botón continuar.'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 4 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Seleccionar una raza.', async () => {
                        await addPetFormPage.selectRandomPetBreed();
                    });
                    await step('2. Presionar el botón continuar.', async () => {
                        await addPetFormPage.continueButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 4 del proceso de carga de credencial.', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(4);
                    });
                });

                test('CP-14 - Paso 3 - Volver al paso 2', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 3 del proceso de carga de credencial.
                    await step('El usuario se encuentra en el paso 3 del proceso de carga de credencial.', async () => {
                        await addPetFormPage.selectPetGender(petGender);
                        await addPetFormPage.selectPetType(petType);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                    });

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 3 del proceso de carga de credencial.',
                        ],
                        steps: ['Presionar el botón atrás.'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 2 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Presionar el botón atrás.', async () => {
                        await addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 2 del proceso de carga de credencial.', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(2);
                    });
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 4
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach(async ({ addPetFormPage }) => {
                    await step('El usuario se encuentra en el paso 2 del proceso de carga de credencial.', async () => {
                        await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                        await addPetFormPage.startWarningContinueBtn.click();
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(1);
                        await addPetFormPage.petNameInput.fill(petName);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(2);
                        await addPetFormPage.selectPetGender(petGender);
                        await addPetFormPage.selectPetType(petType);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                        await addPetFormPage.selectRandomPetBreed();
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(4);
                    });
                });

                test('CP-15 - Paso 4 - Seleccionar una fecha futura', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 4 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 4 del proceso de carga de credencial.',
                        ],
                        steps: ['Ingresar una fecha futura.'],
                        expectedResult: ['El sistema rechaza la fecha ingresada (puede mostrar mensaje de error).', 'El botón "Continuar" permanece deshabilitado.'],
                    });
                    test.skip(true, 'El nuevo selector no permite seleccionar una fecha futura, por lo que no se puede testear esta validación.');
                    // Pasos:
                    await step('1. Ingresar una fecha futura.', async () => {
                        const futureDate = DateTime.now().plus({
                            days: getRandomInt(1, 365),
                        });
                        await addPetFormPage.selectPetAge(futureDate);
                    });
                    // Resultado esperado:
                    await step('El botón "Continuar" permanece deshabilitado.', async () => {
                        await expect(addPetFormPage.continueButton).toBeDisabled();
                    });
                });

                test('CP-16 - Paso 4 - Navegar al paso 5', { tag: ['@critical'] }, async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 4 del proceso de carga de credencial.
                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 4 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar una fecha (pasada).', 'Presionar el botón continuar.'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 5 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Seleccionar una fecha (pasada).', async () => {
                        const pastDate = DateTime.now().minus({
                            days: getRandomInt(1, 365),
                            years: getRandomInt(0, 3),
                        });
                        await addPetFormPage.selectPetAge(pastDate);
                    });
                    await step('2. Presionar el botón continuar.', async () => {
                        await addPetFormPage.continueButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 5 del proceso de carga de credencial.', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(5);
                    });
                });

                test('CP-17 - Paso 4 - Volver al paso 3', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 4 del proceso de carga de credencial.
                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 4 del proceso de carga de credencial.',
                        ],
                        steps: ['Presionar el botón atrás.'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 3 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Presionar el botón atrás.', async () => {
                        await addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 3 del proceso de carga de credencial.', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                    });
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 5
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach('Precondiciones', async ({ addPetFormPage }) => {
                    await step('El usuario se encuentra en el paso 5 del proceso de carga de credencial.', async () => {
                        await Promise.all([addPetFormPage.load(), addPetFormPage.waitForPageLoaded()]);
                        await addPetFormPage.startWarningContinueBtn.click();
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(1);
                        await addPetFormPage.petNameInput.fill(petName);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(2);
                        await addPetFormPage.selectPetType(petType);
                        await addPetFormPage.selectPetGender(petGender);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(3);
                        await addPetFormPage.selectRandomPetBreed();
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(4);
                        await addPetFormPage.selectPetAge(dateOfBirth);
                        await addPetFormPage.continueButton.click();
                        expect(await addPetFormPage.getStepNumber()).toBe(5);
                    });
                });

                test.skip('CP-18 - Paso 5 - Usar cámara - Cámara no disponible', async () => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.
                    // - La cámara no se encuentra disponible para ser usada (desktop).

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                            'La cámara no se encuentra disponible para ser usada (desktop).',
                        ],
                        steps: ['VIsualizar la pantalla del paso 5.'],
                        expectedResult: ['La opción de usar cámara queda deshabilitado.'],
                    });
                    // Pasos:
                    // 1. VIsualizar la pantalla del paso 5.
                    // Resultado esperado:
                    // - La opción de usar cámara queda deshabilitado.

                    test.skip(true, 'Test not implemented yet.');
                });

                test.skip('CP-19 - Paso 5 - Usar cámara - Cámara disponible', async () => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.
                    // - La cámara se encuentra disponible para ser usada (desktop).

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                            'La cámara se encuentra disponible para ser usada (desktop).',
                        ],
                        steps: ['Presionar el botón "Usar cámara".'],
                        expectedResult: ['El sistema carga correctamente la funcionalidad de la cámara permitiendole al usuario tomar una foto.'],
                    });
                    // Pasos:
                    // 1. Presionar el botón "Usar cámara".
                    // Resultado esperado:
                    // - El sistema carga correctamente la funcionalidad de la cámara permitiendole al usuario tomar una foto.

                    test.skip(true, 'Test not implemented yet.');
                });

                test.skip('CP-20 - Paso 5 - Usar cámara - Cámara disponible (Variación: tomar una foto)', async () => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.
                    // - La cámara se encuentra disponible para ser usada (desktop).

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                            'La cámara se encuentra disponible para ser usada (desktop).',
                        ],
                        steps: ['Tomar una foto.'],
                        expectedResult: ['El sitema toma la foto correctamente.', 'El botón continuar queda habilitado.'],
                    });
                    // Pasos:
                    // 1. Tomar una foto.
                    // Resultado esperado:
                    // - El sitema toma la foto correctamente.
                    // - El botón continuar queda habilitado.

                    test.skip(true, 'Test not implemented yet.');
                });

                test.skip('CP-21 - Paso 5 - Subir foto - Archivo en formato no permitido', async () => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                        ],
                        steps: ['A través de la opción de carga de foto, seleccionar un archivo que no sea de tipo imágen (.jpg, .png).'],
                        expectedResult: ['El sistema no permite seleccionar archivos que no sean de tipo imágen.'],
                    });
                    // Pasos:
                    // 1. A través de la opción de carga de foto, seleccionar un archivo que no sea de tipo imágen (.jpg, .png).
                    // Resultado esperado:
                    // - El sistema no permite seleccionar archivos que no sean de tipo imágen.

                    test.skip(true, 'Test not implemented yet.');
                });

                test.skip('CP-22 - Paso 5 - Subir foto - Imágen demasiado grande', async () => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.

                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar una imágen de más de 5Mb de tamaño.'],
                        expectedResult: ['El sistema muestra un mensaje de error indicando que el tamaño de imágen seleccionado es demasiado grande.'],
                    });
                    // Pasos:
                    // 1. Seleccionar una imágen de más de 5Mb de tamaño.
                    // Resultado esperado:
                    // - El sistema muestra un mensaje de error indicando que el tamaño de imágen seleccionado es demasiado grande.

                    test.skip(true, 'Test not implemented yet.');
                });

                test('CP-23 - Paso 5 - Subir foto correctamente', { tag: ['@critical'] }, async ({ addPetFormPage, page }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.
                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                        ],
                        steps: ['Seleccionar una foto.'],
                        expectedResult: ['La foto es subida correctamente.', 'El usuario puede seleccionar otra imágen.', 'El botón continuar queda habilitado.'],
                    });
                    const imgPath = getPetProfilePicture(petType);
                    // Pasos:
                    await step('1. Seleccionar una foto.', async () => {
                        await addPetFormPage.uploadPetFilePhoto(imgPath);
                    });
                    // Resultado esperado:
                    await step('La foto es subida correctamente.', async () => {
                        await expect(addPetFormPage.petPhotoPreviewImg).toBeVisible();
                        await expect(page.getByText(imgPath.split('/').pop() ?? '')).toBeVisible();
                    });
                    await step('El usuario puede seleccionar otra imágen.', async () => {
                        await expect(addPetFormPage.changePhotoBtn).toBeEnabled();
                    });
                    await step('El botón continuar queda habilitado.', async () => {
                        await expect(addPetFormPage.continueButton).toBeEnabled();
                    });
                });

                test('CP-23 - Paso 5 - Volver al paso 4', async ({ addPetFormPage }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.
                    await setAllureDetails({
                        preconditions: [
                            'Usuario autenticado.',
                            'Usuario con al menos un plan sin mascota.',
                            'El usuario se encuentra en el paso 5 del proceso de carga de credencial.',
                        ],
                        steps: ['Presionar el botón atrás.'],
                        expectedResult: ['El sistema redirecciona al usuario al paso 4 del proceso de carga de credencial.'],
                    });
                    // Pasos:
                    await step('1. Presionar el botón atrás.', async () => {
                        await addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 4 del proceso de carga de credencial..', async () => {
                        expect(await addPetFormPage.getStepNumber()).toBe(4);
                    });
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-03 Crear Credencial
    // =========================================================================
    test.describe('TS-03 Crear Credencial', { tag: '@NewVetifyUser' }, () => {
        let petId: string | undefined;
        const petName = `Test${Date.now()}`;
        const petType = getRandomElement(['Perro', 'Gato'])!;
        const petGender = getRandomElement(['Macho', 'Hembra'])!;
        const dateOfBirth = DateTime.now().minus({
            days: getRandomInt(1, 365),
            years: getRandomInt(0, 3),
        });

        test.use({
            userRequest: {
                source: UserSource.Fresh,
                tags: [UserTag.ACTIVE, UserTag.NO_PET, UserTag.PLAN_WITHOUT_PET],
                numberOfPlans: 1,
            },
        });

        test.describe(() => {
            test('CP-01 - Cargar credencial con foto', { tag: ['@critical'] }, async ({ homePage, myPetsPage, addPetFormPage, page, vetifyWebappApiClient }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 5 del proceso de carga de credencial.
                await setAllureDetails({
                    preconditions: ['Usuario autenticado.', 'Usuario con al menos un plan sin mascota.'],
                    steps: [
                        'Navegar a la pantalla de Mascotas',
                        'Seleccionar una mascota',
                        'Comenzar la carga de credenciales',
                        'Ingresar el nombre de la mascota',
                        'Seleccionar sexo y tipo de mascota',
                        'Seleccionar la raza de la mascota',
                        'Seleccionar la fecha de nacimiento',
                        'Seleccionar una foto / tomar una foto.',
                        'Presionar el botón continuar',
                    ],
                    expectedResult: ['El sistema realiza la carga de la credencial de forma exitosa (con la foto).'],
                });
                let fileId: string | undefined;
                let response: Response | undefined | null;
                // Pasos:
                await step('1. Navegar a la pantalla de Mascotas', async () => {
                    await Promise.all([homePage.waitForPageLoaded(), homePage.load()]);
                    await Promise.all([
                        page.waitForResponse((response) => response.url().includes('/api/services/assistance/history') && response.status() === 200),
                        myPetsPage.load(),
                    ]);
                });
                await step('2. Seleccionar una mascota', async () => {
                    const userPets = await vetifyWebappApiClient.getUserPets();
                    const selectedPlan = userPets.find((p: any) => p.estado === 'LIBRE');
                    petId = selectedPlan?.id;
                    test.skip(!petId, 'No se encontró un plan sin mascota para el usuario de prueba.');
                    addPetFormPage.setPetId(petId!);
                    await Promise.all([addPetFormPage.waitForPageLoaded(), myPetsPage.addPetToPlanBtn.click()]);
                });
                await step('3. Comenzar la carga de credenciales', async () => {
                    await addPetFormPage.startWarningContinueBtn.click();
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(1);
                });
                await step('4. Ingresar el nombre de la mascota', async () => {
                    await addPetFormPage.petNameInput.fill(petName);
                    addPetFormPage.setPetName(petName);
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(2);
                });
                await step('5. Seleccionar sexo y tipo de mascota', async () => {
                    await addPetFormPage.selectPetGender(petGender);
                    await addPetFormPage.selectPetType(petType);
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(3);
                });
                await step('6. Seleccionar la raza de la mascota', async () => {
                    await addPetFormPage.selectRandomPetBreed();
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(4);
                });
                await step('7. Seleccionar la fecha de nacimiento', async () => {
                    await addPetFormPage.selectPetAge(dateOfBirth);
                    await addPetFormPage.continueButton.click();
                    expect(await addPetFormPage.getStepNumber()).toBe(5);
                });
                await step('8. Seleccionar una foto / tomar una foto.', async () => {
                    const imgPath = getPetProfilePicture(petType);
                    fileId = await addPetFormPage.uploadPetFilePhoto(imgPath);
                });
                await step('9. Presionar el botón continuar.', async () => {
                    console.log(`Waiting for request: /api/services/pets/products/${petId}`);
                    const waitForRequest = await Promise.all([
                        page.waitForRequest((request) => request.url().includes(`/api/services/pets/products/${petId}`) && request.method() === 'PUT'),
                        page.waitForResponse((response) => response.url().includes(`/api/services/pets/products/${petId}`) && response.status() === 200),
                        addPetFormPage.continueButton.click(),
                    ]);
                    response = await waitForRequest[0].response();
                    expect(response).toBeDefined();
                    expect(response?.status()).toBe(200);
                });
                // Resultado esperado:
                await step('El sistema realiza la carga de la credencial de forma exitosa (con la foto).', async () => {
                    expect(response).toBeDefined();
                    expect(response!.ok()).toBeTruthy();
                    const data: any = await response!.json();
                    expect.soft(data.estado).toBe('OCUPADO');
                    expect.soft(data.mascota.nombre).toBe(petName);
                    expect.soft(data.mascota.especie.descripcion).toBe(petType.toUpperCase());
                    expect.soft(data.mascota.raza.descripcion).toBeDefined();
                    // TODO: Fix the expected date format since the UI is using the current day of the month
                    //expect.soft(data.mascota.fecha_nacimiento.slice(0, 7)).toBe(dateOfBirth.toFormat('yyyy-MM'));
                    expect.soft(data.mascota.foto_url).toBeDefined();
                    expect.soft(data.mascota.foto_url).toContain(fileId);
                });
                await step('El usuario es redireccionado a la home', async () => {
                    await expect.soft(page.getByText(`¡${petName} ya tiene su credencial lista!`)).toBeVisible();
                    await expect.soft(page.getByText(`Desde la sección Mascotas podés consultar su información.`)).toBeVisible();
                    await expect(addPetFormPage.goToHomeBtn).toBeVisible();
                    await addPetFormPage.goToHomeBtn.click();
                    await homePage.expectLoaded();
                    await expect.soft(homePage.greetingLbl).toBeVisible();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-04 Ver Credenciales
    // =========================================================================
    test.describe('TS-04 Ver Credenciales', () => {
        test.use({
            userRequest: {
                source: UserSource.Pooled,
                tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                numberOfPlans: 1,
                reserve: false,
                ignoreReserved: true,
            },
        });

        test('CP-01 - Credencial - Vetify - Ver crendencial', { tag: ['@critical'] }, async ({ myPetsPage, page, vetifyWebappApiClient }) => {
            // Precondiciones:
            // - Usuario registrado con un plan vigente.
            // - Plan vigente con mascota asociada.
            await setAllureDetails({
                preconditions: ['Usuario registrado con un plan vigente.', 'Plan vigente con mascota asociada.'],
                steps: ['Ir a la tab de "Mascotas".', 'Hacer click en una credencial'],
                expectedResult: ['El sistema muestra correctamente los datos de la mascota asociada al plan.'],
            });
            // Pasos:
            await step('1. Ir a la tab de "Mascotas"', async () => {
                await Promise.all([myPetsPage.load(), myPetsPage.waitForPageLoaded()]);
            });
            await step('2. Hacer click en una credencial', async () => {
                const petCards = await myPetsPage.petCards.all();
                await getRandomElement(petCards)?.click();
            });
            // Resultado esperado:
            await step('El sistema muestra correctamente los datos de la mascota asociada al plan.', async () => {
                const pets = await vetifyWebappApiClient.getUserPets();
                const planData = pets[0];
                // Pet Name
                expect.soft(page.getByText(planData.mascota.nombre)).toBeVisible();
                // Pet Breed
                expect.soft(page.getByText(planData.mascota.raza.descripcion)).toBeVisible();
                // Pet Age
                const age = getPetAge(DateTime.fromFormat(planData.mascota.fecha_nacimiento, 'yyyy-MM-dd'));
                expect.soft(page.getByText(age)).toBeVisible();
                // Plan Name
                // TODO: Implement a convertion plan name table
                //expect(page.getByText(planData.descripcion_producto)).toBeVisible();
            });
        });

        test('CP-02 - Credencial - Vetify - Descargar credencial', { tag: ['@critical'] }, async ({ myPetsPage, viewPetPage, page, vetifyWebappApiClient }) => {
            let newPage: Page;
            // Precondiciones:
            // - Usuario registrado con un plan vigente.
            // - Plan vigente con mascota asociada.
            await setAllureDetails({
                preconditions: ['Usuario registrado con un plan vigente.', 'Plan vigente con mascota asociada.'],
                steps: ['Ir a la tab de "Mascotas".', 'Hacer click en una credencial', 'Presionar el botón "Bajar credencial"'],
                expectedResult: ['La credencial es descargada existosamente en un formato PDF con todos los datos correcto de la mascota.'],
            });
            // Pasos:
            await step('1. Ir a la tab de "Mascotas"', async () => {
                await Promise.all([myPetsPage.waitForPageLoaded(), myPetsPage.load()]);
            });
            await step('2. Hacer click en una credencial', async () => {
                await expect.poll(async () => await myPetsPage.petCards.count()).toBeGreaterThan(0);
                const petCards = await myPetsPage.petCards.all();
                await Promise.all([getRandomElement(petCards)?.click(), viewPetPage.waitForPageLoaded()]);
            });
            await step('3. Presionar el botón "Bajar credencial"', async () => {
                const promisesResult = await Promise.all([page.context().waitForEvent('page'), viewPetPage.downloadCredentialBtn.click()]);
                newPage = promisesResult[0];
            });
            // Resultado esperado:
            await step('La credencial es descargada existosamente en un formato PDF con todos los datos correcto de la mascota.', async () => {
                const pets = await vetifyWebappApiClient.getUserPets();
                expect(newPage).toHaveURL(`https://api.staging.mascotas.ikeargentina.com.ar/v1/cliente/mascotas/${pets[0].id}/credencial?brand=vetify`);
            });
        });
    });
});
