import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';
import { getRandomElement, getRandomInt } from '@helpers/automation-utils';
import { VetifyWebappVideocallFormPage } from '@pages/vetify/webapp/videocall/VideocallFormPage';
import { VetifyWebappVideocallViewPage } from '@pages/vetify/webapp/videocall/VideocallViewPage';
import { expect, type Response } from '@playwright/test';
import { DateTime } from 'luxon';
import * as path from 'path';
import { setAllureDetails, step, test } from '../framework/base-test';

// TODO: Improve the dataset to avoid collisions
test.describe.configure({ mode: 'serial' });

// TODO: Remove skip when the tests are stable and ready to run (new data-set)
test.describe.skip('Videollamadas Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 Iniciar flujo (Initiate Flow)
    // =========================================================================
    // TODO: Improve the selection of users to avoid conflicts
    test.describe.skip('TS-01 Iniciar flujo', () => {
        test('CP-01 - Iniciar flujo desde home', { tag: ['@critical'] }, async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente'],
                steps: ['En la página de Home, presionar el botón Videollamada (o "Ir a videollamadas")'],
                expectedResult: ['El sistema redirige al usuario a la pantalla de solicitud de videollamada'],
            });

            await step('Cargar la pantalla de home', async () => {
                await container.vetify.webapp.homePage.load();
            });

            await step('Navegar a la pantalla de solicitud de videollamada', async () => {
                await Promise.all([
                    // Navigate
                    container.vetify.webapp.homePage.goToVideocallBtn.click(),
                    // Wait for page to load
                    container.vetify.webapp.videocallFormPage.waitForPageLoaded(),
                ]);
            });

            await step('Validar que la página se cargó correctamente', async () => {
                // Validate that the page loaded
                expect(container.vetify.webapp.videocallFormPage.pageTitle).toBeVisible();
                expect(container.vetify.webapp.videocallFormPage.pageTitle).toHaveText('Detalles para la asistencia');
            });
        });

        test('CP-02 - Iniciar flujo desde página de servicios', { tag: ['@critical'] }, async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente'],
                steps: ['Navegar a la página de "Servicios"', 'Presionar sobre la opción "Videollamada"'],
                expectedResult: ['El sistema redirige al usuario a la pantalla de solicitud de videollamada'],
            });

            await container.vetify.webapp.servicesPage.load();

            await step('Navegar a la pantalla de solicitud de videollamada', async () => {
                await Promise.all([
                    // Navigate
                    container.vetify.webapp.servicesPage.goToRequestVideocall(),
                    // Wait for page to load
                    container.vetify.webapp.videocallFormPage.waitForPageLoaded(),
                ]);
            });

            await step('Validar que la página se cargó correctamente', async () => {
                // Validate that the page loaded
                expect(container.vetify.webapp.videocallFormPage.pageTitle).toBeVisible();
                expect(container.vetify.webapp.videocallFormPage.pageTitle).toHaveText('Detalles para la asistencia');
            });
        });

        test('CP-03 - Iniciar flujo desde side-panel', { tag: ['@critical'] }, async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente'],
                steps: ['En la página de Home, abrir el menu lateral', 'Presionar la opción "Videollamada"'],
                expectedResult: ['El sistema redirige al usuario a la pantalla de solicitud de videollamada'],
            });

            await container.vetify.webapp.homePage.load();

            // Open side-menu
            await container.vetify.webapp.homePage.openSideMenu();

            await step('Navegar a la pantalla de solicitud de videollamada', async () => {
                await Promise.all([
                    // Navigate
                    container.vetify.webapp.homePage.sideMenuSection.videocallEntry.click(),
                    // Wait for page to load
                    container.vetify.webapp.videocallFormPage.waitForPageLoaded(),
                ]);
            });

            await step('Validar que la página se cargó correctamente', async () => {
                // Validate that the page loaded
                expect(container.vetify.webapp.videocallFormPage.pageTitle).toBeVisible();
                expect(container.vetify.webapp.videocallFormPage.pageTitle).toHaveText('Detalles para la asistencia');
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 Agendar Videollamada - Paso 1
    // =========================================================================
    test.describe('TS-02 Agendar Videollamada - Paso 1', () => {
        let videocallPage: VetifyWebappVideocallFormPage;

        test.beforeEach(async ({ container }) => {
            await step('Cargar la página de solicitud de videollamada', async () => {
                videocallPage = container.vetify.webapp.videocallFormPage;
                await Promise.all([videocallPage.waitForPageLoaded(), videocallPage.load()]);
            });
        });

        test('CP-01 - Listar mascotas - Sin Mascotas', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente sin mascota cargadas', 'El usuario se encuentra en la página de "Solicitar Videollamada"'],
                steps: ['Cargar la página de solicitud de videollamada'],
                expectedResult: ['El sistema muestra el botón/link para cargar credencial'],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-02 - Validar error de mascota obligatoria al continuar sin selección', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente sin mascota cargadas', 'El usuario se encuentra en la página de "Solicitar Videollamada"'],
                steps: ['Visualizar la página de solicitud de videollamada', 'Presionar el botón continuar'],
                expectedResult: ['El sistema muestra un mensaje de error indicando que la selección de mascota es obligatoria'],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-03 - Listar mascotas - 1 Mascota', async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con un solo plan activo',
                    'Plan con mascota asociado',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: ['Visualizar la página de solicitud de videollamada'],
                expectedResult: ['El sistema muestra a la única mascota listada como seleccionada'],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-04 - Listar mascotas - Multiples mascotas', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con más de un plan activo',
                    'Al menos dos planes tienen mascotas asociadas',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: ['Visualizar la página de solicitud de videollamada'],
                expectedResult: ['El sistema lista todas las mascotas cargadas para el usuario', 'Ninguna mascota se encuentra seleccioanda'],
            });

            let petsNameApiResponse: string[] = [];
            const petNames: string[] = [];

            await step('Obtener listado de mascotas desde la API', async () => {
                const vetifyApiClient = await container.vetify.getApiClient(page);
                const petsApiResponse = await vetifyApiClient.getUserPets();

                petsNameApiResponse = petsApiResponse
                    .filter((p: any) => p.estado === 'OCUPADO')
                    .map((p: any) => p.mascota.nombre)
                    .sort();
            });

            await step('Validar que UI lista las mismas mascotas disponibles', async () => {
                const petItems = await videocallPage.petOptions.all();
                expect(petItems).toHaveLength(petsNameApiResponse.length);

                for (const p of petItems) {
                    const label = p.locator('p');
                    petNames.push(await label.innerText());
                }

                expect(petNames.sort().toString()).toEqual(petsNameApiResponse.toString());
            });
        });

        test('CP-05 - Campos obligatorios', { tag: ['@critical'] }, async ({ page }) => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con al menos un plan activo',
                    'El usuario tiene al menos una mascota cargada',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: ['Visualizar la página de solicitud de videollamada', 'Presionar el botón continuar'],
                expectedResult: ['El sitema muestra que los siguientes campos son obligatorios:', '- Motivo de la consulta', '- Fecha y Hora de la consulta', '- Mascota'],
            });

            await step('Intentar continuar sin completar campos requeridos', async () => {
                await videocallPage.continueBtn.click();
            });

            await step('Validar errores de campos obligatorios', async () => {
                const reasonErrorMessageLocator = page.locator('[data-cy="textErrorMessage"]');
                expect(reasonErrorMessageLocator).toBeVisible();
                expect(reasonErrorMessageLocator).toHaveText('Este campo es requerido');

                const dateTimeErrorMessageLocator = page.locator('[data-cy="Error in Calendar component"]');
                expect(dateTimeErrorMessageLocator).toBeVisible();
                expect(dateTimeErrorMessageLocator).toHaveText('Debe seleccionar una fecha y un horario');
            });
        });

        test('CP-06 - Selección de fecha', { tag: ['@critical'] }, async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con al menos un plan activo',
                    'El usuario tiene al menos una mascota cargada',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: ['Visualizar la página de solicitud de videollamada', 'Seleccionar una fecha'],
                expectedResult: [
                    'El sistema carga las horas donde los prestadores están disponible',
                    'El sistema solo permite seleccionar la fecha actual o fechas futuras (no fechas pasadas)',
                    'Si la fecha es del mismo día la próxima disponibilidad es al minimo 30 minutos despues de la hora actual',
                ],
            });

            function timeToMinutes(timeStr: string): number {
                const [hours, minutes] = timeStr.trim().split(':').map(Number);
                return hours * 60 + minutes;
            }

            const monthOffset = getRandomInt(0, 3);
            const dayOffset = getRandomInt(1, 10);
            const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

            const timeStrings: string[] = [];

            await step('Seleccionar una fecha de asistencia disponible', async () => {
                await videocallPage.calendarComponent.selectAssistanceDay(selectedDay);
                const timeSlots = await videocallPage.calendarComponent.timeOptions.all();

                for (const ts of timeSlots) {
                    const text = await ts.innerText();
                    timeStrings.push(text);
                }
            });

            await step('Validar intervalos de disponibilidad horaria', async () => {
                const timeInMinutes = timeStrings.map(timeToMinutes);

                for (let i = 0; i < timeInMinutes.length - 1; i++) {
                    const current = timeInMinutes[i];
                    const next = timeInMinutes[i + 1];

                    const diff = next - current;

                    expect(diff, `Gap between ${timeStrings[i]} and ${timeStrings[i + 1]} was ${diff} minutes instead of 30`).toBeGreaterThanOrEqual(30);
                }
            });
        });

        test('CP-07 - Selección de Hora', async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con al menos un plan activo',
                    'El usuario tiene al menos una mascota cargada',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: ['Visualizar la página de solicitud de videollamada', 'Seleccionar una fecha', 'Seleccionar una hora'],
                expectedResult: ['El usuario puede seleccionar una hora correctamente'],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-08 - Continuar correctamente al paso 2', { tag: ['@critical'] }, async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con al menos un plan activo',
                    'El usuario tiene al menos una mascota cargada',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: [
                    'Visualizar la página de solicitud de videollamada',
                    'Seleccionar una mascota',
                    'Ingresar un motivo de consulta',
                    'Seleccionar una fecha',
                    'Seleccionar una hora',
                ],
                expectedResult: ['El sistema redirecciona correctament al segundo paso de la solicitud de videollamada'],
            });

            await step('Completar datos del paso 1 y continuar', async () => {
                await videocallPage.fillStepOne();
                await videocallPage.continueBtn.click();
            });

            await step('Validar navegación al paso 2', async () => {
                expect(videocallPage.commentInput).toBeVisible();
                expect(videocallPage.additionalFilesInput).toBeAttached();
            });
        });

        test('CP-09 - Cancelar y reingresar borra la información', async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'Usuario con al menos un plan activo',
                    'El usuario tiene al menos una mascota cargada',
                    'El usuario se encuentra en la página de "Solicitar Videollamada"',
                ],
                steps: [
                    'Visualizar la página de solicitud de videollamada',
                    'Seleccionar una mascota',
                    'Ingresar un motivo de consulta',
                    'Seleccionar una fecha',
                    'Seleccionar una hora',
                    'Presionar el botón "Atras" (cancelar la solicitud)',
                    'Volver a ingresar a la página de solicitud de videollamada',
                ],
                expectedResult: ['El sistema muestra todos los campos vacios. Todas la información ingresada ha sido ignorada'],
            });
            test.skip(true, 'Test not implemented yet');
        });
    });

    // =========================================================================
    // CATEGORY: TS-03 Agendar Videollamada - Paso 2
    // =========================================================================
    test.describe('TS-03 Agendar Videollamada - Paso 2', () => {
        let videocallPage: VetifyWebappVideocallFormPage;
        let assistanceId: string | undefined;

        test.beforeEach(async ({ container }) => {
            await step('Preparar flujo en paso 2 de videollamada', async () => {
                assistanceId = undefined;
                videocallPage = container.vetify.webapp.videocallFormPage;
                await Promise.all([videocallPage.waitForPageLoaded(), videocallPage.load()]);
                await videocallPage.fillStepOne();
                await videocallPage.continueBtn.click();
            });
        });

        test.afterEach(async ({ container, page }) => {
            await step('Limpiar videollamada creada durante el test', async () => {
                if (assistanceId) {
                    const vetifyApiClient = await container.vetify.getApiClient(page);
                    try {
                        await vetifyApiClient.cancelVideoCall(assistanceId);
                    } catch (error) {
                        console.error(`Error canceling videocall with ID ${assistanceId}:`, error);
                    }
                }
            });
        });

        test('CP-01 - Adjuntar archivo', { tag: ['@critical'] }, async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario con al menos un plan activo', 'El usuario tiene al menos una mascota cargada'],
                steps: ['Ingresar todos los datos obligatorios del paso 1', 'Presionar el botón "Continuar"', 'Adjuntar un archivo (sin restricción de formato)'],
                expectedResult: ['El sistema permite subir un archivo correctamente'],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-02 - Solicitar asistencia sin datos adicionales', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario con al menos un plan activo', 'El usuario tiene al menos una mascota cargada'],
                steps: ['Ingresar todos los datos obligatorios del paso 1', 'Presionar el botón "Continuar"', 'Presionar el botón "Solicitar asistencia"'],
                expectedResult: [
                    'El sistema registra correctamente la solicitud de videollamada',
                    'En SISE se visualiza correctamente la generación de un expediente con todos los datos ingresados',
                    'El usuario recibe un email de confirmación de la solicitud de videollamada',
                ],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-03 - Solicitar asistencia solo con archivo', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario con al menos un plan activo', 'El usuario tiene al menos una mascota cargada'],
                steps: ['Ingresar todos los datos obligatorios del paso 1', 'Presionar el botón "Continuar"', 'Adjuntar un archivo', 'Presionar el botón "Solicitar asistencia"'],
                expectedResult: [
                    'El sistema registra correctamente la solicitud de videollamada',
                    'En SISE se visualiza correctamente la generación de un expediente con todos los datos ingresados',
                    'El usuario recibe un email de confirmación de la solicitud de videollamada',
                ],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-04 - Solicitar asistencia solo con comentarios', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario con al menos un plan activo', 'El usuario tiene al menos una mascota cargada'],
                steps: [
                    'Ingresar todos los datos obligatorios del paso 1',
                    'Presionar el botón "Continuar"',
                    'Ingresar un comentario adicionar',
                    'Presionar el botón "Solicitar asistencia"',
                ],
                expectedResult: [
                    'El sistema registra correctamente la solicitud de videollamada',
                    'En SISE se visualiza correctamente la generación de un expediente con todos los datos ingresados',
                    'El usuario recibe un email de confirmación de la solicitud de videollamada',
                ],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-05 - Solicitar asistencia con comentarios y archivo', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario con al menos un plan activo', 'El usuario tiene al menos una mascota cargada'],
                steps: [
                    'Ingresar todos los datos obligatorios del paso 1',
                    'Presionar el botón "Continuar"',
                    'Adjuntar un archivo',
                    'Ingresar un comentario adicionar',
                    'Presionar el botón "Solicitar asistencia"',
                ],
                expectedResult: [
                    'El sistema registra correctamente la solicitud de videollamada',
                    'En SISE se visualiza correctamente la generación de un expediente con todos los datos ingresados',
                    'El usuario recibe un email de confirmación de la solicitud de videollamada',
                ],
            });

            const filePath: string = path.join(process.cwd(), 'src/fixtures/files/test-pdf.pdf');
            const additionalComment = `Comentarios adicionales de la consulta. ${Date.now()}`;
            let fileId: string | undefined;
            let response: Response | undefined;

            await step('Completar información adicional y solicitar asistencia', async () => {
                await videocallPage.commentInput.fill(additionalComment);
                fileId = await videocallPage.selectAdditionalFile(filePath);
                [response] = await Promise.all([
                    page.waitForResponse((response) => response.url().includes('/api/services/assistance/493/create')),
                    videocallPage.requestAssistanceBtn.click(),
                ]);
            });

            await step('Validar la llamada de API', async () => {
                expect(response?.status()).toBe(200);

                const videocallRequest = await response?.request();
                const videocallRequestBody = await videocallRequest?.postDataJSON();

                expect(videocallRequestBody?.additionalInformation.message).toBe(additionalComment);
                expect(videocallRequestBody?.additionalInformation.medias).toHaveLength(1);
                expect(videocallRequestBody?.additionalInformation.medias[0].id).toBe(fileId);

                const videocallResponse = await response?.json();
                expect(videocallResponse?.assistanceId).toBeDefined();
                assistanceId = videocallResponse?.assistanceId;
            });

            await step('Validar mensaje de éxito y retorno a home', async () => {
                await expect(page.getByText('¡Listo! Tu turno está reservado')).toBeVisible();

                const homePage = container.vetify.webapp.homePage;
                await homePage.waitForPageLoaded();
                expect(homePage.greetingLbl).toBeVisible();
            });

            // TODO: Validations
            // Listing the scheduled videocall
            // Validate that the videocall has been scheduled for the selected date and time
            // Validate that a videocall record has been created in SISE system
        });
    });

    // =========================================================================
    // CATEGORY: TS-04 Videollamadas agendadas
    // =========================================================================
    // TODO: Improve the seleccion of users to avoid conflicts
    test.describe.skip('TS-04 Videollamadas agendadas', () => {
        const videocallIds: string[] = [];
        let vetifyApiClient: VetifyWebappApiClient;

        async function scheduleVideocall() {
            const dataSet = await vetifyApiClient.scheduleVideocall();

            if (dataSet.assistanceId) {
                videocallIds.push(dataSet.assistanceId);
            }
        }

        function formatVideocallsApiResponse(videocallApiListResponse: any[]) {
            return videocallApiListResponse
                .sort((a: any, b: any) => a.date - b.date)
                .map((vc: any) => ({
                    assistanceId: vc.assistanceId,
                    date: DateTime.fromMillis(vc.date).setZone('UTC').toFormat('dd/MM/yy, hh:mm a').replace('PM', 'p. m.').replace('AM', 'a. m.'),
                }));
        }

        test.beforeAll(async ({ container, page }) => {
            vetifyApiClient = await container.vetify.getApiClient(page);

            await step('El usuario tiene una videollamada agendada', async () => {
                const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
                await Promise.all(
                    videocallApiListResponse.map(async (vc) => {
                        try {
                            await vetifyApiClient.cancelVideoCall(vc.assistanceId);
                        } catch (error) {
                            console.error(`Error canceling videocall with ID ${vc.assistanceId}:`, error);
                        }
                    }),
                );

                await scheduleVideocall();
            });
        });

        test.afterAll(async () => {
            await step('Eliminar videollamadas creadas por la suite', async () => {
                await Promise.all(
                    videocallIds.map(async (id) => {
                        try {
                            await vetifyApiClient.cancelVideoCall(id);
                        } catch (error) {
                            console.error(`Error canceling videocall with ID ${id}:`, error);
                        }
                    }),
                );
            });
        });

        test('CP-01 - Listado en la Home - Una videollamada', { tag: ['@critical'] }, async ({ container, page }) => {
            // Precondiciones:
            // - Iniciar sesión con un usuario adquirente
            // - Usuario tiene una única videollamada agendada

            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario tiene una única videollamada agendada'],
                steps: ['Ingresar a la pantalla de Home'],
                expectedResult: ['El sistema muestra correctamente la videollamada en la página de home'],
            });

            const homePage = container.vetify.webapp.homePage;

            await step('Ingresar a home con una única videollamada', async () => {
                await homePage.load();
                await expect(homePage.upcomingAppointmentsToggleBtn).toBeHidden();
            });

            await step('Validar listado de videollamadas en home contra API', async () => {
                const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
                const videocallApiList = formatVideocallsApiResponse(videocallApiListResponse);
                const videocallElements = await page.locator(`//p[contains(text(), 'Turno:  Videollamada Veterinaria')]/../..`).all();

                expect(videocallElements).toHaveLength(1);
                await expect(videocallElements[0].locator('//div[2]/p[3]')).toHaveText(videocallApiList[0].date);
            });
        });

        test('CP-02 - Listado en la Home - Multiples videollamadas', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario tiene más de una videollamada agendada'],
                steps: ['Ingresar a la pantalla de Home'],
                expectedResult: [
                    'El sistema muestra todas las videollamadas solicitadas (futuras) ordenadas de más próxima a más lejana (segun la fecha seleccionada de atención)',
                ],
            });

            const AMOUNT_OF_NEW_VIDEOCALLS = 2;

            await step('Crear videollamadas adicionales para validar listado múltiple', async () => {
                for (let i = 0; i < AMOUNT_OF_NEW_VIDEOCALLS; i++) {
                    await scheduleVideocall();
                }
            });

            await step('Ingresar a home y expandir próximas videollamadas', async () => {
                await container.vetify.webapp.homePage.load();
                await expect.soft(container.vetify.webapp.homePage.upcomingAppointmentsToggleBtn).toBeVisible();
                await container.vetify.webapp.homePage.upcomingAppointmentsToggleBtn.click();
            });

            await step('Validar que el listado en UI coincide con API', async () => {
                const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
                const videocallApiList = formatVideocallsApiResponse(videocallApiListResponse);
                const videocallElements = await page.locator(`//p[contains(text(), 'Turno:  Videollamada Veterinaria')]/../..`).all();

                expect.soft(videocallElements).toHaveLength(videocallApiList.length);

                for (const idx in videocallElements) {
                    await expect(videocallElements[idx].locator('//div[2]/p[3]')).toHaveText(videocallApiList[idx].date);
                }
            });
        });

        test('CP-03 - Videollamadas - Ver', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'Usuario con al menos un plan activo', 'El usuario tiene al menos una mascota cargada'],
                steps: ['Ingresar a la pantalla de Home', 'Hacer click en una solicitud de videollamada'],
                expectedResult: ['El sistema carga correctamente la página de visualización de la solicitud de videollamada'],
            });

            let selectedVideocallId: string;
            let viewVideocallPage: VetifyWebappVideocallViewPage;
            let expectedScheduleDatetime: DateTime;
            let videocallDetails: any;

            await step('Ingresar a home y abrir una videollamada agendada', async () => {
                await Promise.all([
                    page.waitForResponse((response) => response.url().includes('/api/services/assistance/local/programmed?filterByProvider=true') && response.status() === 200),
                    container.vetify.webapp.homePage.load(),
                ]);

                const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
                const videocallApiList = formatVideocallsApiResponse(videocallApiListResponse);

                // eslint-disable-next-line playwright/no-conditional-in-test
                if (videocallApiList.length > 1) {
                    await container.vetify.webapp.homePage.upcomingAppointmentsToggleBtn.click();
                }

                const videocallElements = await page.locator(`//p[contains(text(), 'Turno:  Videollamada Veterinaria')]/../..`).all();
                const randomIdx = getRandomElement([...Array(videocallElements.length).keys()])!;
                await videocallElements[randomIdx].click();

                selectedVideocallId = videocallApiList[randomIdx].assistanceId;
                viewVideocallPage = container.vetify.webapp.createVideocallViewPage(selectedVideocallId!);
                await viewVideocallPage.expectLoaded();

                videocallDetails = await vetifyApiClient.getScheduledVideoCallById(selectedVideocallId);
                expectedScheduleDatetime = DateTime.fromFormat(`${videocallDetails.fecha} ${videocallDetails.hora}`, 'yyyy-MM-dd HH:mm:ss');
            });

            await step('Validar datos de videollamada en pantalla de detalle', async () => {
                expect(viewVideocallPage.pageTitle).toHaveText('Videollamada programada');
                expect(viewVideocallPage.pageSubTitle).toHaveText(expectedScheduleDatetime.toFormat('dd/MM/yyyy - HH:mm'));
                expect(viewVideocallPage.reasonInput).toHaveValue(videocallDetails.motivo_consulta);
                expect(viewVideocallPage.scheduledDateLbl).toHaveText(expectedScheduleDatetime.toFormat('dd/MM/yyyy'));
                expect(viewVideocallPage.scheduledTimeLbl).toHaveText(expectedScheduleDatetime.toFormat('HH:mm'));
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-05 Editar Videollamada
    // =========================================================================
    test.describe('TS-05 Editar Videollamada', () => {
        const videocallIds: string[] = [];
        let vetifyApiClient: VetifyWebappApiClient;
        let viewVideocallPage: VetifyWebappVideocallViewPage;
        let selectedVideocallId: string | undefined;

        test.beforeAll(async ({ container, page }) => {
            vetifyApiClient = await container.vetify.getApiClient(page);
        });

        test.beforeEach(async ({ container }) => {
            await step('Preparar una videollamada para edición', async () => {
                const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();

                if (videocallApiListResponse.length === 0) {
                    const dataSet = await vetifyApiClient.scheduleVideocall();
                    videocallIds.push(dataSet.assistanceId);
                    selectedVideocallId = dataSet.assistanceId;
                } else {
                    selectedVideocallId = videocallApiListResponse[0].assistanceId;
                }

                viewVideocallPage = container.vetify.webapp.createVideocallViewPage(selectedVideocallId!);

                await Promise.all([viewVideocallPage.load(), viewVideocallPage.waitForPageLoaded()]);
            });
        });

        test.afterAll(async () => {
            await step('Eliminar videollamadas creadas durante edición', async () => {
                async function cancelVideocall(id: string) {
                    try {
                        await vetifyApiClient.cancelVideoCall(id);
                    } catch (error) {
                        console.error(`Error canceling videocall with ID ${id}:`, error);
                    }
                }

                await Promise.all(videocallIds.map((id) => cancelVideocall(id)));
            });
        });

        test('CP-01 - Editar - Cambiar mascota', async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'El usuario tiene al menos dos mascotas cargadas',
                    'El usuario tiene al menos una videollamada agendada a una fecha futura',
                ],
                steps: ['Ingresar a la pantalla de Home', 'Hacer click en una solicitud de videollamada', 'Seleccionar otra mascota'],
                expectedResult: ['El sistema permite seleccionar otra mascota', 'El botón "Guardar" queda activo'],
            });

            let newSelectedPetName: string;

            await step('Seleccionar otra mascota y guardar cambios', async () => {
                const petsList = await viewVideocallPage.petsList.all();
                const newRandomPet = getRandomElement(petsList)!;
                newSelectedPetName = (await newRandomPet.locator('p').textContent()) as string;
                await newRandomPet.click();
                await viewVideocallPage.saveBtn.click();
            });

            await step('Reabrir la videollamada y validar persistencia de mascota', async () => {
                await Promise.all([viewVideocallPage.load(), viewVideocallPage.waitForPageLoaded()]);

                const actualSelectedPet = await viewVideocallPage.getSelectedPet();
                expect(actualSelectedPet.locator('p')).toHaveText(newSelectedPetName!);
            });
        });

        test('CP-02 - Editar - Reprogramar', { tag: ['@critical'] }, async ({ container }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura'],
                steps: [
                    'Ingresar a la pantalla de Home',
                    'Hacer click en una solicitud de videollamada',
                    'Hacer click en el botón "Reprogramar"',
                    'Confirmar la reprogramación',
                    'Seleccionar una fecha',
                    'Seleccionar una hora',
                    'Presionar el botón "Continuar"',
                ],
                expectedResult: [
                    'El sistema reprograma correctamente la videollamada',
                    'El sistema muestra un mensaje para confirmar la reprogramación',
                    'El botón guardar no queda activo',
                    'La nueva fecha/hora se visualiza en la pantalla de ver la videollamada agendada',
                ],
            });

            const monthOffset = getRandomInt(0, 3);
            const dayOffset = getRandomInt(1, 10);
            const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

            await step('Iniciar flujo de reprogramación y seleccionar nueva fecha/hora', async () => {
                await viewVideocallPage.rescheduleBtn.click();
                await viewVideocallPage.rescheduleModalConfirmBtn.click();

                const rescheduleVideocallPage = container.vetify.webapp.createRescheduleVideocallPage(selectedVideocallId!);
                await rescheduleVideocallPage.calendarComponent.selectAssistanceDay(selectedDay);
                await rescheduleVideocallPage.calendarComponent.selectAssistanceTime();
                await rescheduleVideocallPage.saveBtn.click();
            });

            await step('Validar confirmación de reprogramación', async () => {
                expect(viewVideocallPage.rescheduleConfirmationModalTitleLbl).toBeVisible();
                expect(viewVideocallPage.rescheduleConfirmationModalTitleLbl).toHaveText('Tu turno ha sido reprogramado');

                await viewVideocallPage.rescheduleConfirmationModalOkBtn.click();
                expect(viewVideocallPage.rescheduleConfirmationModalTitleLbl).toBeHidden();
            });
        });

        test('CP-03 - Editar - Cambiar motivo de consulta', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura'],
                steps: ['Ingresar a la pantalla de Home', 'Hacer click en una solicitud de videollamada', 'Cambiar el motivo de consulta'],
                expectedResult: ['El motivo de consulta no queda guardado', 'El botón "Guardar" queda activo'],
            });

            const newRason = `New reason ${Date.now()}`;

            await step('Actualizar motivo de consulta y guardar', async () => {
                expect(viewVideocallPage.saveBtn).toBeDisabled();
                await viewVideocallPage.reasonInput.fill(newRason);
                expect(viewVideocallPage.saveBtn).toBeEnabled();
                await viewVideocallPage.saveBtn.click();
            });

            await step('Reabrir la videollamada y validar motivo persistido', async () => {
                await Promise.all([viewVideocallPage.load(), viewVideocallPage.waitForPageLoaded()]);

                expect(viewVideocallPage.reasonInput).toHaveValue(newRason);
            });
        });

        test('CP-04 - Editar - Cambiar adjunto - Sin Archivo Adjunto previo', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura sin archivo adjunto'],
                steps: ['Ingresar a la pantalla de Home', 'Hacer click en una solicitud de videollamada sin un archivo adjunto', 'Seleccionar el menos un archivo'],
                expectedResult: [
                    'El botón "Guardar" queda activo',
                    'Por cada nuevo archivo: es subido (no guardado), el nombre del archivo es mostrado correctamente y permite ser descartado',
                ],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-05 - Editar - Cambiar adjunto - Con Archivo Adjunto existente', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura con archivo adjunto'],
                steps: ['Ingresar a la pantalla de Home', 'Hacer click en una solicitud de videollamada con un archivo adjunto', 'Seleccionar el menos un archivo'],
                expectedResult: [
                    'El botón "Guardar" queda activo',
                    'Los archivos existentes no sufren cambios',
                    'Por cada nuevo archivo: es subido (no guardado), el nombre del archivo es mostrado correctamente y permite ser descartado',
                ],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-06 - Editar - Cancelar modificaciones', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada', 'El usuario tiene al menos dos mascota cargada'],
                steps: [
                    'Ingresar a la pantalla de Home',
                    'Hacer click en una solicitud de videollamada',
                    'Seleccionar otra mascota',
                    'Cambiar el motivo de consulta',
                    'Cambiar el archivo adjunto',
                    'Presionar el botón "Cancelar"',
                ],
                expectedResult: ['El sistema cierra la pantalla y retorna a la home', 'Ningún cambio es registrado'],
            });
            test.skip(true, 'Test not implemented yet');
        });

        test('CP-07 - Editar', { tag: ['@critical'] }, async () => {
            await setAllureDetails({
                preconditions: [
                    'Iniciar sesión con un usuario adquirente',
                    'El usuario tiene al menos una videollamada agendada a una fecha futura',
                    'El usuario tiene al menos dos mascota cargada',
                ],
                steps: [
                    'Ingresar a la pantalla de Home',
                    'Hacer click en una solicitud de videollamada',
                    'Seleccionar otra mascota',
                    'Cambiar el motivo de consulta',
                    'Cambiar el archivo adjunto',
                    'Presionar el botón "Guardar"',
                ],
                expectedResult: [
                    'El sistema cierra la pantalla y retorna a la home',
                    'Todos los cambios han sido modificado correctamente',
                    'El usuario recibe un email con la modificación de la solicitud de videollamada',
                ],
            });

            const newRason = `New reason ${Date.now()}`;
            let newSelectedPetName: string;

            await step('Editar mascota y motivo de consulta, luego guardar', async () => {
                const petsList = await viewVideocallPage.petsList.all();
                const newRandomPet = getRandomElement(petsList)!;
                newSelectedPetName = (await newRandomPet.locator('p').textContent()) as string;
                await newRandomPet.click();

                await viewVideocallPage.reasonInput.fill(newRason);

                // Upload a photo or file
                // TODO: Add the logic to upload photo or file
                await viewVideocallPage.saveBtn.click();
            });

            await step('Reabrir la videollamada y validar persistencia de cambios', async () => {
                await Promise.all([viewVideocallPage.load(), viewVideocallPage.waitForPageLoaded()]);

                expect(viewVideocallPage.reasonInput).toHaveValue(newRason);
                const actualSelectedPet = await viewVideocallPage.getSelectedPet();
                expect(actualSelectedPet.locator('p')).toHaveText(newSelectedPetName!);
            });
        });
    });

    // =========================================================================
    // CATEGORY: Cancelar Videollamada
    // =========================================================================
    test.describe('TS-06 Cancelar Videollamada', () => {
        const videocallIds: string[] = [];
        let vetifyApiClient: VetifyWebappApiClient;
        let viewVideocallPage: VetifyWebappVideocallViewPage;
        let selectedVideocallId: string | undefined;

        test.beforeAll(async ({ container, page }) => {
            vetifyApiClient = await container.vetify.getApiClient(page);
        });

        test.beforeEach(async ({ container }) => {
            await step('Preparar una videollamada para cancelación', async () => {
                const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();

                if (videocallApiListResponse.length === 0) {
                    const dataSet = await vetifyApiClient.scheduleVideocall();
                    videocallIds.push(dataSet.assistanceId);
                    selectedVideocallId = dataSet.assistanceId;
                } else {
                    selectedVideocallId = videocallApiListResponse[0].assistanceId;
                }

                viewVideocallPage = container.vetify.webapp.createVideocallViewPage(selectedVideocallId!);

                await Promise.all([viewVideocallPage.load(), viewVideocallPage.waitForPageLoaded()]);
            });
        });

        test.afterAll(async () => {
            await step('Eliminar videollamadas creadas durante cancelación', async () => {
                async function cancelVideocall(id: string) {
                    try {
                        await vetifyApiClient.cancelVideoCall(id);
                    } catch (error) {
                        console.error(`Error canceling videocall with ID ${id}:`, error);
                    }
                }

                await Promise.all(videocallIds.map((id) => cancelVideocall(id)));
            });
        });

        test('CP-01 - Cancelar Turno - Listados de motivos', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura'],
                steps: [
                    'Ingresar a la pantalla de Home',
                    'Hacer click en una solicitud de videollamada',
                    'Presionar el botón de "Cancelar" (cancelar videollamada)',
                    'Desplegar el listado de motivos de cancelación',
                ],
                expectedResult: ['El sistema muestra correctamente los motivos de cancelación optenidos desde la API'],
            });
        });

        test('CP-02 - Cancelar Turno - No cancelar', async () => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura'],
                steps: [
                    'Ingresar a la pantalla de Home',
                    'Hacer click en una solicitud de videollamada',
                    'Presionar el botón de "Cancelar" (cancelar videollamada)',
                    'Cerrar el modal de selección de motivo de cancelación',
                ],
                expectedResult: ['El modal de selección de motivo de cancelación es cerrado', 'La videollamada no es cancelada'],
            });
        });

        test('CP-03 - Cancelar Turno - Confirmar cancelación', { tag: ['@critical'] }, async ({ container, page }) => {
            await setAllureDetails({
                preconditions: ['Iniciar sesión con un usuario adquirente', 'El usuario tiene al menos una videollamada agendada a una fecha futura'],
                steps: [
                    'Ingresar a la pantalla de Home',
                    'Hacer click en una solicitud de videollamada',
                    'Presionar el botón de "Cancelar" (cancelar videollamada)',
                    'Seleccionar un motivo de cancelación',
                    'Presionar el botón "Cancelar turno"',
                ],
                expectedResult: ['El turno es cancelado correctamente', 'El usuario recibe un email de cancelación de turno', 'El turno es cancelado correctamente en SISE'],
            });

            const cancelVideocallModal = container.vetify.webapp.createCancelVideocallModal(selectedVideocallId!);

            await step('Abrir modal de cancelación y elegir motivo', async () => {
                await Promise.all([viewVideocallPage.cancelVideocallBtn.click(), cancelVideocallModal.waitForComponentLoaded()]);
                const reasonsElements = await cancelVideocallModal.reasonsOptions.all();
                const reasonsTxts = await Promise.all(reasonsElements.map((e) => e.textContent()));

                await cancelVideocallModal.reasonSelect.selectOption({
                    label: getRandomElement(reasonsTxts.slice(1).filter((e) => e !== 'Otros'))!.trim(),
                });
            });

            await step('Confirmar cancelación y esperar retorno a home', async () => {
                await Promise.all([
                    cancelVideocallModal.confirmCancelation(),
                    page.waitForResponse((response) => response.url().includes('/api/services/sse/assistance_updates') && response.status() === 200),
                    container.vetify.webapp.homePage.waitForPageLoaded(),
                ]);
            });

            await step('Validar cancelación en API', async () => {
                const listOfAvailableVideocalls = await vetifyApiClient.getScheduledVideocalls();
                expect(listOfAvailableVideocalls.map((avc) => avc.assistanceId)).not.toContain(selectedVideocallId!);

                const videocallApiData = await vetifyApiClient.getScheduledVideoCallById(selectedVideocallId!);
                expect(videocallApiData.estado).toBe('CANCELADO');
            });
        });
    });
});
