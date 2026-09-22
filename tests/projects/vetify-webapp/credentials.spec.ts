import { environment, SiteId } from '@config/environment';
import { getPetAge, getRandomElement, getRandomInt } from '@helpers/automation-utils';
import { expect, Page } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';
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
            // UserSource.Fresh (no Pooled): esta cuenta tiene que arrancar SIN mascota de forma
            // garantizada. Una cuenta pooled compartida (reserve:false/ignoreReserved:true) puede
            // ganar una mascota real por otro test que corrió antes en el mismo pool -- confirmado
            // 2026-09-04 (ver docs/impedimentos-bloqueos.md / qa-workspace/known-issues.md): rompía
            // por strict-mode-violation o por "Dejá su credencial lista" ausente según cuántas
            // mascotas había acumulado la cuenta compartida al momento de correr.
            test.use({
                userRequest: {
                    source: UserSource.Fresh,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                    numberOfPlans: 1,
                },
            });

            test('TC-01 - Credencial - Vetify - Usuario con plan - Plan sin mascota asociada', { tag: ['@critical'] }, async ({ container, page }) => {
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
                    await Promise.all([container.vetify.webapp.myPetsPage.load(), container.vetify.webapp.myPetsPage.waitForPageLoaded()]);
                });
                // Resultado esperado:
                await step('Hay un mensaje indicando que el plan no tiene una mascota asignada.', async () => {
                    await expect(page.getByText('Dejá su credencial lista')).toBeVisible();
                });
                await step('El plan presenta un botón para cargar los datos.', async () => {
                    await expect(container.vetify.webapp.myPetsPage.addPetToPlanBtn).toBeVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            // @unstable 2026-08-20: causa real confirmada 2026-09-04 — cuenta pooled compartida
            // (reserve:false/ignoreReserved:true) cuyo conteo real de mascotas varía entre corridas
            // (0, 1 o 2 según qué otros tests la tocaron antes), y también inestabilidad intermitente
            // del backend (my-products devolviendo [] pese a datos reales — ver docs/bugs/BUG-033).
            // La verificación de abajo convierte ambos casos en un skip honesto en vez de un timeout
            // confuso de 30s.
            test('TC-02 - Credencial - Vetify - Usuario con plan - Plan con mascota asociada', { tag: ['@critical', '@unstable'] }, async ({ container, page }) => {
                // Precondiciones:
                // - Usuario registrado con un plan vigente.
                // - Plan vigente con mascota asociada.
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente.', 'Plan vigente con mascota asociada.'],
                    steps: [
                        'Iniciar sesión con un usuario con un plan vigente que tenga mascota asociada a al menos un plan.',
                        'Navegar a la pantalla de mascotas.',
                        'Visualizar un plan con mascota asignada.',
                    ],
                    expectedResult: ['El plan muestra los datos de la mascota asociada al plan (foto, nombre) además de un botón/acción para ver/descargar la credencial.'],
                });
                // Pasos:
                await step('0. Verificar que la cuenta tenga al menos una mascota real cargada.', async () => {
                    const apiClient = await container.vetify.getApiClient(page);
                    const pets = await apiClient.getUserPets();
                    test.skip(pets.length === 0, 'La cuenta de prueba no tiene mascotas reales en este momento (drift de estado de la cuenta pooled o backend inestable) — ver docs/bugs/BUG-033.');
                });
                await step('1. Navegar a la pantalla de mascotas.', async () => {
                    await Promise.all([container.vetify.webapp.myPetsPage.load(), container.vetify.webapp.myPetsPage.waitForPageLoaded()]);
                });
                // Resultado esperado:
                await step('El plan muestra los datos de la mascota asociada al plan.', async () => {
                    await expect(container.vetify.webapp.myPetsPage.petCards.first()).toBeVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-03 - Credencial - Vetify - Subscribir nueva mascota - Sin planes libres', { tag: ['@critical'] }, async ({ container, page }) => {
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
                    await Promise.all([container.vetify.webapp.myPetsPage.load(), container.vetify.webapp.myPetsPage.waitForPageLoaded()]);
                });
                await step('2. Presionar el botón "Agregar mascota".', async () => {
                    await container.vetify.webapp.myPetsPage.addNewPlanBtn.click();
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
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.PLAN_WITHOUT_PET],
                    reserve: false,
                    numberOfPlans: 2,
                    ignoreReserved: true,
                },
            });

            test('TC-04 - Credencial - Vetify - Subscribir nueva mascota - Con planes libres', { tag: ['@critical'] }, async ({ container }) => {
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
                    await Promise.all([container.vetify.webapp.myPetsPage.load(), container.vetify.webapp.myPetsPage.waitForPageLoaded()]);
                });
                await step('2. Presionar el botón "Agregar mascota".', async () => {
                    await container.vetify.webapp.myPetsPage.addNewPlanBtn.click();
                });
                // Resultado esperado:
                await step('El sistema abre el modal para cargar la mascota del uno de los planes sin mascotas.', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.startWarningModalTitle).toBeVisible();
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
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                reserve: false,
                ignoreReserved: true,
            },
        });

        test.beforeEach(async ({ container, page }) => {
            const apiClient = await container.vetify.getApiClient(page);
            const pets = await apiClient.getUserPets();
            const freePet = pets.find((pet: any) => pet.estado === 'LIBRE');
            petId = freePet ? freePet.id : undefined;
        });

        test.describe(() => {
            test.beforeEach(async ({ container }) => {
                container.vetify.webapp.addPetFormPage.setPetId(petId!);
                container.vetify.webapp.addPetFormPage.setPetName(petName);
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 0
            // ------------------------------------------------------------------------

            test('TC-01 - Cargar Credencial - Vetify - Inicio - Comenzar carga', { tag: ['@critical'] }, async ({ container }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en la pantalla de comienzo de carga de credencial.

                await step('El usuario se encuentra en la pantalla de comienzo de carga de credencial.', async () => {
                    await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);

                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
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
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                });
                // Resultado esperado:
                // - El usuario es redireccionado correctamente al paso 1.
                expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
            });

            test('TC-02 - Cargar Credencial - Vetify - Inicio - Volver al Home', async ({ container }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en la pantalla de comienzo de carga de credencial.

                await step('El usuario se encuentra en la pantalla de comienzo de carga de credencial.', async () => {
                    await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
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
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.addPetFormPage.backButton.click()]);
                });
                // Resultado esperado:
                await step('El sistema redirecciona correctamente a la pantalla de home.', async () => {
                    await expect(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 1
            // ------------------------------------------------------------------------

            test('TC-03 - Paso 1 - Nombre - Limite de caracteres', async ({ container }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
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
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill('a');
                    // Toggle focus on petNameInput
                    await container.vetify.webapp.addPetFormPage.stepTitleLbl.click();
                });
                // Resultado esperado:
                await step(
                    'El sistema muestra un mensaje de error indicando que la cantidad de caracteres para el campo nombre debe ser de entre 2 a 100 (extremos incluídos).',
                    async () => {
                        await expect(container.vetify.webapp.addPetFormPage.petNameErrorLbl).toBeVisible();
                        await expect(container.vetify.webapp.addPetFormPage.petNameErrorLbl).toHaveText('El nombre debe tener al menos 2 caracteres');
                    },
                );
                await step('El botón "Continuar" permanece deshabilitado.', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.continueButton).toBeDisabled();
                });
            });

            test('TC-04 - Paso 1 - Nombre - Limite de caracteres (Variación: más de 100 caracteres)', async ({ container }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
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
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill('a'.repeat(101));
                    // Toggle focus on petNameInput
                    await container.vetify.webapp.addPetFormPage.stepTitleLbl.click();
                });
                // Resultado esperado:
                // TODO: This is a bug - The error message is no acurate, it should say "El nombre debe tener no más de 100 caracteres"
                // await step(
                //   'El sistema muestra un mensaje de error indicando que la cantidad de caracteres para el campo nombre debe ser de entre 2 a 100 (extremos incluídos).',
                //   async () => {
                //     await expect(container.vetify.webapp.addPetFormPage.petNameErrorLbl).toBeVisible();
                //     await expect(container.vetify.webapp.addPetFormPage.petNameErrorLbl).toHaveText('El nombre debe tener no más de 100 caracteres');
                //   },
                // );
                await step('El botón "Continuar" permanece deshabilitado.', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.continueButton).toBeDisabled();
                });
            });

            test('TC-05 - Paso 1 - Navegar al paso 2', { tag: ['@critical'] }, async ({ container }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
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
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                });
                await step('2. Presionar el botón "Continuar".', async () => {
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                });
                // Resultado esperado:
                await step('El sistema redirecciona al usuario al paso 2 del proceso de carga de credencial.', async () => {
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                });
            });

            test('TC-06 - Paso 1 - Volver a la pantalla de comienzo', async ({ container }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El usuario se encuentra en el paso 1 del proceso de carga de credencial.
                await step('El usuario se encuentra en el paso 1 del proceso de carga de credencial.', async () => {
                    await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
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
                    await container.vetify.webapp.addPetFormPage.backButton.click();
                });
                // Resultado esperado:
                await step('El sistema redirecciona al usuario a la pantalla de home.', async () => {
                    // No se usa getStepNumber() acá a propósito: para cuentas con 2+ planes libres
                    // (ver comentario en AddPetFormPage.getStepNumber()), "atrás" desde el paso 1
                    // aterriza en el paso de selección de plan, no en "¡Vamos a empezar!" — ambas son
                    // pantallas sin datos ingresados, cualquiera de las 2 confirma el resultado real
                    // (volver al principio, sin arrastrar nada del paso 1).
                    await expect(container.vetify.webapp.addPetFormPage.stepTitleLbl).toHaveText(/^(¡Vamos a empezar!|Asigná el plan de la credencial)$/);
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 2
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach(async ({ container }) => {
                    await step('El usuario se encuentra en el paso 2 del proceso de carga de credencial.', async () => {
                        await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                        await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
                        await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                    });
                });

                test('TC-07 - Paso 2 - Seleccionar sólo tipo de mascota', async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                    });
                    // Resultado esperado:
                    await step('El botón "Continuar" permanece deshabilitado.', async () => {
                        expect(container.vetify.webapp.addPetFormPage.continueButton).toBeDisabled();
                    });
                });

                test('TC-08 - Paso 2 - Seleccionar sólo género', async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    });
                    // Resultado esperado:
                    await step('El botón "Continuar" permanece deshabilitado.', async () => {
                        expect(container.vetify.webapp.addPetFormPage.continueButton).toBeDisabled();
                    });
                });

                test('TC-09 - Paso 2 - Navegar al paso 3', { tag: ['@critical'] }, async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    });
                    await step('2. Seleccionar el tipo de mascota.', async () => {
                        await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                    });
                    await step('3. Presionar el botón "Continuar".', async () => {
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 3 del proceso de carga de credencial.', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                    });
                });

                test('TC-10 - Paso 2 - Volver al paso 1', async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 1 del proceso de carga de credencial.', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
                    });
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 3
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach(async ({ container }) => {
                    await step('El usuario se encuentra en el paso 2 del proceso de carga de credencial.', async () => {
                        await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                        await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
                        await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                        await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    });
                });

                test('TC-11 - Paso 3 - Validar listado de raza - Tipo perro', { tag: ['@critical'] }, async ({ container, page }) => {
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
                        await container.vetify.webapp.addPetFormPage.selectPetType('Perro');
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                    });
                    // Resultado esperado:
                    await step('El sistema lista correctamente todas las razas de perro.', async () => {
                        const petBreedOptions = await container.vetify.webapp.addPetFormPage.petBreedOptions.all();
                        const existingPetBreeds = await Promise.all(petBreedOptions.map(async (breedOption) => await breedOption.innerText()));

                        const apiClient = await container.vetify.getApiClient(page);
                        const data: any[] = await apiClient.getPetBreeds();
                        const expectedDogBreeds = data.find((type: any) => type.descripcion === 'PERRO').razas.map((b: any) => b.descripcion);

                        expect(existingPetBreeds.sort().join(', ')).toBe(expectedDogBreeds.sort().join(', '));
                    });
                });

                test('TC-12 - Paso 3 - Validar listado de raza - Tipo gato', { tag: ['@critical'] }, async ({ container, page }) => {
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
                        await container.vetify.webapp.addPetFormPage.selectPetType('Gato');
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                    });
                    // Resultado esperado:
                    await step('El sistema lista correctamente todas las razas de gato.', async () => {
                        const petBreedOptions = await container.vetify.webapp.addPetFormPage.petBreedOptions.all();
                        const existingPetBreeds = await Promise.all(petBreedOptions.map(async (breedOption) => await breedOption.innerText()));

                        const apiClient = await container.vetify.getApiClient(page);
                        const data: any[] = await apiClient.getPetBreeds();
                        const expectedDogBreeds = data.find((type: any) => type.descripcion === 'GATO').razas.map((b: any) => b.descripcion);

                        expect(existingPetBreeds.sort().join(', ')).toBe(expectedDogBreeds.sort().join(', '));
                    });
                });

                test('TC-13 - Paso 3 - Navegar al paso 4', { tag: ['@critical'] }, async ({ container }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 3 del proceso de carga de credencial.
                    await step('El usuario se encuentra en el paso 3 del proceso de carga de credencial.', async () => {
                        await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
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
                        await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                    });
                    await step('2. Presionar el botón continuar.', async () => {
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 4 del proceso de carga de credencial.', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(4);
                    });
                });

                test('TC-14 - Paso 3 - Volver al paso 2', async ({ container }) => {
                    // Precondiciones:
                    // - Usuario autenticado.
                    // - Usuario con al menos un plan sin mascota.
                    // - El usuario se encuentra en el paso 3 del proceso de carga de credencial.
                    await step('El usuario se encuentra en el paso 3 del proceso de carga de credencial.', async () => {
                        await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                        await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
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
                        await container.vetify.webapp.addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 2 del proceso de carga de credencial.', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                    });
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 4
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach(async ({ container }) => {
                    await step('El usuario se encuentra en el paso 2 del proceso de carga de credencial.', async () => {
                        await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                        await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
                        await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                        await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                        await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                        await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(4);
                    });
                });

                // TC-15 "Paso 4 - Seleccionar una fecha futura" (Casos de Prueba.xlsx, hoja
                // Credenciales) no aplica: el selector de edad cambió de un input de fecha de
                // nacimiento a un dropdown de años/meses (AGE_SELECTOR_MODE = 'YearsMonthsSelect',
                // ver AddPetFormPage.ts) — ambos valores parten de 0 y solo suman, no hay forma de
                // seleccionar una edad negativa (equivalente a una fecha de nacimiento futura).
                // Confirmado 2026-09-10: no es que falte el test, es que la UI actual no permite
                // construir el estado inválido que el CP quiere probar. No requiere ninguna decisión
                // externa — cerrado.

                test('TC-16 - Paso 4 - Navegar al paso 5', { tag: ['@critical'] }, async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.selectPetAge(pastDate);
                    });
                    await step('2. Presionar el botón continuar.', async () => {
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 5 del proceso de carga de credencial.', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(5);
                    });
                });

                test('TC-17 - Paso 4 - Volver al paso 3', async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 3 del proceso de carga de credencial.', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                    });
                });
            });

            // ------------------------------------------------------------------------
            // CATEGORY: TS-02 Cargar credencial - Validación de Pasos - Paso 5
            // ------------------------------------------------------------------------

            test.describe(() => {
                test.beforeEach('Precondiciones', async ({ container }) => {
                    await step('El usuario se encuentra en el paso 5 del proceso de carga de credencial.', async () => {
                        await Promise.all([container.vetify.webapp.addPetFormPage.load(), container.vetify.webapp.addPetFormPage.waitForPageLoaded()]);
                        await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
                        await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                        await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                        await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                        await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(4);
                        await container.vetify.webapp.addPetFormPage.selectPetAge(dateOfBirth);
                        await container.vetify.webapp.addPetFormPage.continueButton.click();
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(5);
                    });
                });

                // TC-18/19/20 (Usar cámara) NO viven en este bloque -- confirmado en vivo 2026-09-07 que
                // el asistente genérico de "Paso 5" al que llega este beforeEach (navegación directa a
                // /pets, sin un plan puntual seleccionado) nunca ofrece la opción "Usar cámara", solo
                // "Cargá el archivo" (confirmado 2 veces: accessibility snapshot sin el botón, ni en modo
                // aislado ni en paralelo). La opción de cámara SÍ existe, pero en la pantalla real de
                // alta de mascota sobre un plan puntual (/pets/{slotId}) — ver TS-03 Crear Credencial
                // TC-02/TC-03, que reproduce esa pantalla real.

                test('TC-21 - Paso 5 - Subir foto - Archivo en formato no permitido', { tag: ['@critical'] }, async ({ container, page }) => {
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
                        steps: ['A través de la opción de carga de foto, seleccionar un archivo que no sea de tipo imágen (ej. .txt).'],
                        expectedResult: ['El sistema rechaza el archivo con el mensaje "No se pudo cargar la foto" y "Continuar" permanece deshabilitado.'],
                    });
                    // Pasos:
                    await step('1. A través de la opción de carga de foto, seleccionar un archivo que no sea de tipo imágen (ej. .txt).', async () => {
                        await container.vetify.webapp.addPetFormPage.petPhotoFileInput.setInputFiles('src/fixtures/files/invalid-format.txt');
                    });
                    // Resultado esperado:
                    await step('El sistema rechaza el archivo con el mensaje "No se pudo cargar la foto" y "Continuar" permanece deshabilitado.', async () => {
                        await expect(page.getByText('No se pudo cargar la foto')).toBeVisible();
                        await expect(container.vetify.webapp.addPetFormPage.continueButton).toBeDisabled();
                    });
                });

                test('TC-22 - Paso 5 - Subir foto - Imágen demasiado grande', async ({ container, page }) => {
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
                    await step('Seleccionar una imágen de más de 5Mb de tamaño.', async () => {
                        const imgPath = `src/fixtures/images/oversize_img_10MB.jpg`;
                        await container.vetify.webapp.addPetFormPage.petPhotoFileInput.setInputFiles(imgPath);
                    });
                    // Resultado esperado:
                    // - El sistema muestra un mensaje de error indicando que el tamaño de imágen seleccionado es demasiado grande.
                    await step('El sistema muestra un mensaje de error indicando que el tamaño de imágen seleccionado es demasiado grande.', async () => {
                        await expect(page.getByText('La foto que estás intentando subir es demasiado grande')).toBeVisible();
                    });
                });

                test('TC-23 - Paso 5 - Subir foto correctamente', { tag: ['@critical'] }, async ({ container, page }) => {
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
                        await container.vetify.webapp.addPetFormPage.uploadPetFilePhoto(imgPath);
                    });
                    // Resultado esperado:
                    await step('La foto es subida correctamente.', async () => {
                        await expect(container.vetify.webapp.addPetFormPage.petPhotoPreviewImg).toBeVisible();
                        await expect(page.getByText(imgPath.split('/').pop() ?? '')).toBeVisible();
                    });
                    await step('El usuario puede seleccionar otra imágen.', async () => {
                        await expect(container.vetify.webapp.addPetFormPage.changePhotoBtn).toBeEnabled();
                    });
                    await step('El botón continuar queda habilitado.', async () => {
                        await expect(container.vetify.webapp.addPetFormPage.continueButton).toBeEnabled();
                    });
                });

                test('TC-24 - Paso 5 - Volver al paso 4', async ({ container }) => {
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
                        await container.vetify.webapp.addPetFormPage.backButton.click();
                    });
                    // Resultado esperado:
                    await step('El sistema redirecciona al usuario al paso 4 del proceso de carga de credencial..', async () => {
                        expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(4);
                    });
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-03 Crear Credencial
    // =========================================================================
    test.describe('TS-03 Crear Credencial', { tag: '@NewVetifyB2CUser' }, () => {
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
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE, UserTag.NO_PET, UserTag.PLAN_WITHOUT_PET],
                numberOfPlans: 1,
            },
        });

        test.describe(() => {
            test('TC-01 - Cargar credencial con foto', { tag: ['@critical'] }, async ({ container, page }) => {
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
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                    await Promise.all([container.vetify.webapp.myPetsPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.load()]);
                });
                await step('2. Seleccionar una mascota', async () => {
                    const apiClient = await container.vetify.getApiClient(page);
                    const userPets = await apiClient.getUserPets();
                    const selectedPlan = userPets.find((p: any) => p.estado === 'LIBRE');
                    petId = selectedPlan?.id;
                    test.skip(!petId, 'No se encontró un plan sin mascota para el usuario de prueba.');
                    container.vetify.webapp.addPetFormPage.setPetId(petId!);
                    await Promise.all([container.vetify.webapp.addPetFormPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.addPetToPlanBtn.click()]);
                });
                await step('3. Comenzar la carga de credenciales', async () => {
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(1);
                });
                await step('4. Ingresar el nombre de la mascota', async () => {
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                    container.vetify.webapp.addPetFormPage.setPetName(petName);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(2);
                });
                await step('5. Seleccionar sexo y tipo de mascota', async () => {
                    await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(3);
                });
                await step('6. Seleccionar la raza de la mascota', async () => {
                    await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(4);
                });
                await step('7. Seleccionar la fecha de nacimiento', async () => {
                    await container.vetify.webapp.addPetFormPage.selectPetAge(dateOfBirth);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(5);
                });
                await step('8. Seleccionar una foto / tomar una foto.', async () => {
                    const imgPath = getPetProfilePicture(petType);
                    fileId = await container.vetify.webapp.addPetFormPage.uploadPetFilePhoto(imgPath);
                });
                await step('9. Presionar el botón continuar.', async () => {
                    console.log(`Waiting for request: /api/services/pets/products/${petId}`);
                    const waitForRequest = await Promise.all([
                        page.waitForRequest((request) => request.url().includes(`/api/services/pets/products/${petId}`) && request.method() === 'PUT'),
                        page.waitForResponse((response) => response.url().includes(`/api/services/pets/products/${petId}`) && response.status() === 200),
                        container.vetify.webapp.addPetFormPage.continueButton.click(),
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
                    await expect(container.vetify.webapp.addPetFormPage.goToHomeBtn).toBeVisible();
                    await container.vetify.webapp.addPetFormPage.goToHomeBtn.click();
                    await container.vetify.webapp.homePage.expectLoaded();
                    await expect.soft(container.vetify.webapp.homePage.greetingLbl).toBeVisible();
                });
            });

            // NOTA sobre TC-18 ("cámara no disponible") de la matriz original: confirmado en vivo
            // 2026-09-07 que la visibilidad de "Usar cámara" en esta pantalla depende de la detección
            // real de cámara del navegador (probablemente `navigator.mediaDevices`), no de la cuenta ni
            // del plan -- con la MISMA cuenta 100% nueva, el botón apareció en una corrida y no en otra.
            // Sin flags de Playwright (`--use-fake-device-for-media-stream`) para forzar un estado
            // determinístico, no se puede automatizar de forma confiable ni "disponible" ni "no
            // disponible" como 2 casos separados -- por eso este test solo verifica el camino que SÍ es
            // determinístico (el input de archivo funciona sin importar si el navegador detecta cámara
            // real o no, ya que Playwright fija el archivo directo sobre el input). Ver
            // docs/lecciones-aprendidas.md 2026-09-07 y docs/backlog-automatizacion.md.
            test('TC-02 - Paso 5 - Usar cámara - Tomar una foto sube la credencial correctamente', { tag: ['@critical'] }, async ({ container, page }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                await setAllureDetails({
                    preconditions: ['Usuario autenticado.', 'Usuario con al menos un plan sin mascota.'],
                    steps: ['Navegar hasta el paso 5 (foto) del alta de mascota sobre un plan real.', 'Presionar "Usar cámara" y tomar una foto.'],
                    expectedResult: ['La foto se sube correctamente.', 'El botón continuar queda habilitado.'],
                });
                // Pasos:
                await step('1. Navegar hasta el paso 5 sobre un plan real.', async () => {
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                    await Promise.all([container.vetify.webapp.myPetsPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.load()]);
                    const apiClient = await container.vetify.getApiClient(page);
                    const userPets = await apiClient.getUserPets();
                    const selectedPlan = userPets.find((p: any) => p.estado === 'LIBRE');
                    test.skip(!selectedPlan?.id, 'No se encontró un plan sin mascota para el usuario de prueba.');
                    container.vetify.webapp.addPetFormPage.setPetId(selectedPlan!.id);
                    await Promise.all([container.vetify.webapp.addPetFormPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.addPetToPlanBtn.click()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                    container.vetify.webapp.addPetFormPage.setPetName(petName);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectPetAge(dateOfBirth);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(5);
                });
                // Resultado esperado:
                await step('2. Presionar "Usar cámara" y tomar una foto.', async () => {
                    await container.vetify.webapp.addPetFormPage.uploadPetCameraPhoto(getPetProfilePicture(petType));
                });
                await step('La foto se sube correctamente.', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.petPhotoPreviewImg).toBeVisible();
                });
                await step('El botón continuar queda habilitado.', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.continueButton).toBeEnabled();
                });
            });

            // IMP-019 (docs/impedimentos-bloqueos.md): la visibilidad real de "Usar cámara" depende de
            // navigator.mediaDevices.enumerateDevices() del navegador, no de la cuenta -- confirmado en
            // vivo 2026-09-07 que la misma cuenta daba resultados inconsistentes entre corridas. Se fija
            // de forma determinística sobreescribiendo enumerateDevices() vía page.addInitScript() ANTES
            // de cualquier navegación, para los 2 casos (disponible / no disponible) como tests separados
            // en vez de depender del hardware real de la máquina que corre el test.
            test('TC-03 - Paso 5 - "Usar cámara" visible cuando el navegador reporta una cámara disponible', { tag: ['@critical'] }, async ({ container, page }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El navegador reporta al menos un dispositivo de video (cámara) disponible.
                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El navegador reporta al menos un dispositivo de video (cámara) disponible.',
                    ],
                    steps: ['Navegar hasta el paso 5 (foto) del alta de mascota sobre un plan real.'],
                    expectedResult: ['El botón "Usar cámara" está visible.'],
                });
                // Pasos:
                await step('0. Forzar que el navegador reporte una cámara disponible.', async () => {
                    await page.addInitScript(() => {
                        const fakeDevice = {
                            deviceId: 'fake-camera',
                            kind: 'videoinput',
                            label: 'Fake Camera',
                            groupId: 'fake-group',
                            toJSON() {
                                return this;
                            },
                        } as MediaDeviceInfo;
                        navigator.mediaDevices.enumerateDevices = async () => [fakeDevice];
                    });
                });
                await step('1. Navegar hasta el paso 5 sobre un plan real.', async () => {
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                    await Promise.all([container.vetify.webapp.myPetsPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.load()]);
                    const apiClient = await container.vetify.getApiClient(page);
                    const userPets = await apiClient.getUserPets();
                    const selectedPlan = userPets.find((p: any) => p.estado === 'LIBRE');
                    test.skip(!selectedPlan?.id, 'No se encontró un plan sin mascota para el usuario de prueba.');
                    container.vetify.webapp.addPetFormPage.setPetId(selectedPlan!.id);
                    await Promise.all([container.vetify.webapp.addPetFormPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.addPetToPlanBtn.click()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                    container.vetify.webapp.addPetFormPage.setPetName(petName);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectPetAge(dateOfBirth);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(5);
                });
                // Resultado esperado:
                await step('El botón "Usar cámara" está visible.', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.usarCamaraBtn).toBeVisible();
                });
            });

            test('TC-04 - Paso 5 - "Usar cámara" no aparece cuando el navegador no reporta ninguna cámara', async ({ container, page }) => {
                // Precondiciones:
                // - Usuario autenticado.
                // - Usuario con al menos un plan sin mascota.
                // - El navegador no reporta ningún dispositivo de video (cámara).
                await setAllureDetails({
                    preconditions: [
                        'Usuario autenticado.',
                        'Usuario con al menos un plan sin mascota.',
                        'El navegador no reporta ningún dispositivo de video (cámara).',
                    ],
                    steps: ['Navegar hasta el paso 5 (foto) del alta de mascota sobre un plan real.'],
                    expectedResult: ['El botón "Usar cámara" no está visible (solo la opción de cargar archivo).'],
                });
                // Pasos:
                await step('0. Forzar que el navegador no reporte ninguna cámara.', async () => {
                    await page.addInitScript(() => {
                        navigator.mediaDevices.enumerateDevices = async () => [];
                    });
                });
                await step('1. Navegar hasta el paso 5 sobre un plan real.', async () => {
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                    await Promise.all([container.vetify.webapp.myPetsPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.load()]);
                    const apiClient = await container.vetify.getApiClient(page);
                    const userPets = await apiClient.getUserPets();
                    const selectedPlan = userPets.find((p: any) => p.estado === 'LIBRE');
                    test.skip(!selectedPlan?.id, 'No se encontró un plan sin mascota para el usuario de prueba.');
                    container.vetify.webapp.addPetFormPage.setPetId(selectedPlan!.id);
                    await Promise.all([container.vetify.webapp.addPetFormPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.addPetToPlanBtn.click()]);
                    await container.vetify.webapp.addPetFormPage.startWarningContinueBtn.click();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.petNameInput.fill(petName);
                    container.vetify.webapp.addPetFormPage.setPetName(petName);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectPetGender(petGender);
                    await container.vetify.webapp.addPetFormPage.selectPetType(petType);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await container.vetify.webapp.addPetFormPage.selectPetAge(dateOfBirth);
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    expect(await container.vetify.webapp.addPetFormPage.getStepNumber()).toBe(5);
                });
                // Resultado esperado:
                await step('El botón "Usar cámara" no está visible (solo la opción de cargar archivo).', async () => {
                    await expect(container.vetify.webapp.addPetFormPage.usarCamaraBtn).toBeHidden();
                    await expect(container.vetify.webapp.addPetFormPage.petPhotoFileInput).toBeAttached();
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
                siteId: SiteId.VETIFY_ADQUIRENTE,
                tags: [UserTag.ACTIVE, UserTag.WITH_PET],
                numberOfPlans: 1,
                reserve: false,
                ignoreReserved: true,
            },
        });

        test('TC-01 - Credencial - Vetify - Ver crendencial', { tag: ['@critical'] }, async ({ container, page }) => {
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
                await Promise.all([container.vetify.webapp.myPetsPage.load(), container.vetify.webapp.myPetsPage.waitForPageLoaded()]);
            });
            await step('2. Hacer click en una credencial', async () => {
                const petCards = await container.vetify.webapp.myPetsPage.petCards.all();
                await getRandomElement(petCards)?.click();
            });
            // Resultado esperado:
            await step('El sistema muestra correctamente los datos de la mascota asociada al plan.', async () => {
                const apiClient = await container.vetify.getApiClient(page);
                const pets = await apiClient.getUserPets();

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

        test('TC-02 - Credencial - Vetify - Descargar credencial', { tag: ['@critical'] }, async ({ container, page }) => {
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
                await Promise.all([container.vetify.webapp.myPetsPage.waitForPageLoaded(), container.vetify.webapp.myPetsPage.load()]);
            });
            await step('2. Hacer click en una credencial', async () => {
                await expect.poll(async () => await container.vetify.webapp.myPetsPage.petCards.count()).toBeGreaterThan(0);
                const petCards = await container.vetify.webapp.myPetsPage.petCards.all();
                await Promise.all([getRandomElement(petCards)?.click(), container.vetify.webapp.viewPetPage.waitForPageLoaded()]);
            });
            await step('3. Presionar el botón "Bajar credencial"', async () => {
                const promisesResult = await Promise.all([page.context().waitForEvent('page'), container.vetify.webapp.viewPetPage.downloadCredentialBtn.click()]);
                newPage = promisesResult[0];
            });
            // Resultado esperado:
            await step('La credencial es descargada existosamente en un formato PDF con todos los datos correcto de la mascota.', async () => {
                const apiClient = await container.vetify.getApiClient(page);
                const pets = await apiClient.getUserPets();
                await expect(newPage).toHaveURL(`https://api.staging.mascotas.ikeargentina.com.ar/v1/cliente/mascotas/${pets[0].id}/credencial?brand=vetify`);
            });
        });
    });
});
