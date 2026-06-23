import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';
import * as path from 'path';
import { getRandomElement, getRandomInt } from '@helpers/Utils';
import { VetifyWebappApiClient } from '@api/vetify/webapp/VetifyWebAppApiClient';
import { VetifyWebappHomePage } from '@pages/vetify/webapp/HomePage';
import { VetifyWebappServicesPage } from '@pages/vetify/webapp/ServicesPage';
import { VetifyWebappVideocallFormPage } from '@pages/vetify/webapp/videocall/VideocallFormPage';
import { VetifyWebappVideocallViewPage } from '@pages/vetify/webapp/videocall/VideocallViewPage';
import { VetifyWebappRescheduleVideocallPage } from '@pages/vetify/webapp/videocall/RescheduleVideocallPage';
import { VetifyWebappCancelVideocallModal } from '@pages/vetify/webapp/videocall/CancelVideocallModal';


const storageStatePath = 'playwright/.auth/user_with_multiple_pets.json';
test.use({ storageState: storageStatePath });

// This is a temporal configuration 
test.describe.configure({ mode: 'serial' });

test.describe('Videollamadas Test Suite', () => {

    // TODO: Improve the dataset to avoid collisions
    test.describe.configure({ mode: 'serial' });

    // =========================================================================
    // CATEGORY: TS-01 Iniciar flujo (Initiate Flow)
    // =========================================================================
    test.describe('TS-01 Iniciar flujo', () => {
        test('CP-01 - Iniciar flujo desde home', { tag: ['@critical'] }, async ({ page }) => {
            const homePage = new VetifyWebappHomePage(page);
            await homePage.load();

            const videocallPage = new VetifyWebappVideocallFormPage(page);

            await Promise.all([
                // Navigate
                homePage.goToVideocallBtn.click(),
                // Wait for page to load
                videocallPage.waitForPageLoaded(),
            ]);

            // Validate that the page loaded
            expect(videocallPage.pageTitle).toBeVisible();
            expect(videocallPage.pageTitle).toHaveText('Detalles para la asistencia');
        });

        test('CP-02 - Iniciar flujo desde página de servicios', { tag: ['@critical'] }, async ({ page }) => {
            const servicesPage = new VetifyWebappServicesPage(page);
            await servicesPage.load();

            const videocallPage = new VetifyWebappVideocallFormPage(page);

            await Promise.all([
                // Navigate
                servicesPage.goToRequestVideocall(),
                // Wait for page to load
                videocallPage.waitForPageLoaded(),
            ]);

            // Validate that the page loaded
            expect(videocallPage.pageTitle).toBeVisible();
            expect(videocallPage.pageTitle).toHaveText('Detalles para la asistencia');
        });

        test('CP-03 - Iniciar flujo desde side-panel', { tag: ['@critical'] }, async ({ page }) => {
            const homePage = new VetifyWebappHomePage(page);
            await homePage.load();

            // Open side-menu
            await homePage.openSideMenu();

            const videocallPage = new VetifyWebappVideocallFormPage(page);

            await Promise.all([
                // Navigate
                homePage.sideMenuSection.videocallEntry.click(),
                // Wait for page to load
                videocallPage.waitForPageLoaded(),
            ]);

            // Validate that the page loaded
            expect(videocallPage.pageTitle).toBeVisible();
            expect(videocallPage.pageTitle).toHaveText('Detalles para la asistencia');
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 Agendar Videollamada - Paso 1
    // =========================================================================
    test.describe('TS-02 Agendar Videollamada - Paso 1', () => {
        let videocallPage: VetifyWebappVideocallFormPage;

        test.beforeEach(async ({ page }) => {
            videocallPage = new VetifyWebappVideocallFormPage(page);
            await Promise.all([
                videocallPage.waitForPageLoaded(),
                videocallPage.load(),
            ]);
        });

        //     test('CP-01 - Listar mascotas - Sin Mascotas', async () => {
        //         // API Mock: Override user profile to return 0 pets
        //         await videocallPage.page.route('**/api/user/pets', async route => route.fulfill({ json: [] }));
        //         await videocallPage.page.reload();
        //         await expect(videocallPage.uploadCredentialLink).toBeVisible();
        //     });

        //     test('CP-02 - Validar error de mascota obligatoria al continuar sin selección', async () => {
        //         await videocallPage.continueBtn.click();
        //         await expect(videocallPage.errorMessage).toBeVisible();
        //         await expect(videocallPage.errorMessage).toContainText('la selección de mascota es obligatoria');
        //     });

        //     test('CP-03 - Listar mascotas - 1 Mascota', async () => {
        //         // API Mock: Return exactly 1 pet
        //         await videocallPage.page.route('**/api/user/pets', async route => route.fulfill({ json: [{ id: 101, name: 'Luna' }] }));
        //         await videocallPage.page.reload();

        //         // System must default-select the single pet
        //         await expect(videocallPage.petSelect).toHaveValue('101');
        //     });

        test('CP-04 - Listar mascotas - Multiples mascotas', { tag: ['@critical'] }, async ({ page }) => {
            const vetifyApiClient = await VetifyWebappApiClient.getApi(page);
            const petsApiResponse = await vetifyApiClient.getUserPets();

            const petsNameApiResponse: string[] = petsApiResponse
                .filter((p: any) => p.estado === 'OCUPADO')
                .map((p: any) => p.mascota.nombre)
                .sort();

            const petItems = await videocallPage.petOptions.all();

            expect(petItems).toHaveLength(petsNameApiResponse.length);

            const petNames = [];
            for (const p of petItems) {
                const label = p.locator('p');
                petNames.push((await label.innerText()));
            }

            expect(petNames.sort().toString()).toEqual(petsNameApiResponse.toString());
        });

        test('CP-05 - Campos obligatorios', { tag: ['@critical'] }, async ({ page }) => {
            await videocallPage.continueBtn.click();

            // Validations
            const reasonErrorMessageLocator = page.locator('[data-cy="textErrorMessage"]');
            expect(reasonErrorMessageLocator).toBeVisible();
            expect(reasonErrorMessageLocator).toHaveText('Este campo es requerido');

            const dateTimeErrorMessageLocator = page.locator('[data-cy="Error in Calendar component"]');
            expect(dateTimeErrorMessageLocator).toBeVisible();
            expect(dateTimeErrorMessageLocator).toHaveText('Debe seleccionar una fecha y un horario');
        });

        test('CP-06 - Selección de fecha', { tag: ['@critical'] }, async () => {
            function timeToMinutes(timeStr: string): number {
                const [hours, minutes] = timeStr.trim().split(':').map(Number);
                return hours * 60 + minutes;
            }

            const monthOffset = getRandomInt(0, 3);
            const dayOffset = getRandomInt(1, 10);
            const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

            await videocallPage.calendarComponent.selectAssistanceDay(selectedDay);

            // Verify hours list filters out slots sooner than 30 minutes away
            const timeSlots = await videocallPage.calendarComponent.timeOptions.all()
            const timeStrings: string[] = [];

            for (const ts of timeSlots) {
                const text = await ts.innerText();
                timeStrings.push(text);
            }

            // Convert ['09:00', '09:30', ...] to [540, 570, 600, ...]
            const timeInMinutes = timeStrings.map(timeToMinutes);

            // Validate the delta between each sequential pair
            for (let i = 0; i < timeInMinutes.length - 1; i++) {
                const current = timeInMinutes[i];
                const next = timeInMinutes[i + 1];

                const diff = next - current;

                // Explains exactly which times failed if a gap is found
                expect(diff, `Gap between ${timeStrings[i]} and ${timeStrings[i + 1]} was ${diff} minutes instead of 30`).toBe(30);
            }
        });

        //     test('CP-07 - Selección de Hora', async () => {
        //         await videocallPage.dateInput.fill('2026-12-25');
        //         await videocallPage.timeSelect.selectOption('10:00');
        //         await expect(videocallPage.timeSelect).toHaveValue('10:00');
        //     });

        test('CP-08 - Continuar correctamente al paso 2', { tag: ['@critical'] }, async () => {
            await videocallPage.fillStepOne();

            await videocallPage.continueBtn.click();

            expect.soft(videocallPage.commentInput).toBeVisible();
            expect.soft(videocallPage.additionalFilesInput).toBeAttached();
        });

        //     test('CP-09 - Cancelar y reingresar borra la información', async () => {
        //         await videocallPage.fillStepOne({ petName: 'Luna', reason: 'Control', date: '2026-12-25', time: '10:00' });
        //         await videocallPage.backBtn.click();
        //         await videocallPage.page.goto('/solicitar-videollamada');

        //         await expect(videocallPage.petSelect).toHaveValue('');
        //         await expect(videocallPage.reasonInput).toHaveValue('');
        //     });
    });

    // =========================================================================
    // CATEGORY: TS-03 Agendar Videollamada - Paso 2
    // =========================================================================
    test.describe('TS-03 Agendar Videollamada - Paso 2', () => {
        let videocallPage: VetifyWebappVideocallFormPage;
        let assistanceId: string | undefined;

        test.beforeEach(async ({ page }) => {
            assistanceId = undefined;
            videocallPage = new VetifyWebappVideocallFormPage(page);
            await Promise.all([
                videocallPage.waitForPageLoaded(),
                videocallPage.load(),
            ]);
            await videocallPage.fillStepOne();
            await videocallPage.continueBtn.click();
        });

        test.afterEach(async ({ page }) => {
            if (assistanceId) {
                const vetifyApiClient = await VetifyWebappApiClient.getApi(page);
                await vetifyApiClient.cancelVideoCall(assistanceId);
            }
        });

        //     test('CP-01 - Adjuntar archivo ', { tag: ['@critical'] }, async ({ page }) => {
        //         await videocallPage.fileInput.setInputFiles({
        //             name: 'test_report.pdf',
        //             mimeType: 'application/pdf',
        //             buffer: Buffer.from('mock pdf content')
        //         });
        //         await expect(videocallPage.fileFeedbackName).toContainText('test_report.pdf');
        //     });

        //     test('CP-02 - Solicitar asistencia sin datos adicionales', async ({ page }) => {
        //     });

        //     test('CP-03 - Solicitar asistencia solo con archivo', async ({ page }) => {
        //     });

        //     test('CP-04 - Solicitar asistencia solo con comentarios', async ({ page }) => {
        //     });

        test('CP-05 - Solicitar asistencia con comentarios y archivo', { tag: ['@critical'] }, async ({ page }) => {
            const filePath: string = path.join(process.cwd(), 'src/fixtures/files/test-pdf.pdf');
            const additionalComment = `Comentarios adicionales de la consulta. ${Date.now()}`;

            await videocallPage.commentInput.fill(additionalComment);
            const fileId = await videocallPage.selectAdditionalFile(filePath);
            const [response] = await Promise.all([
                page.waitForResponse(response =>
                    response.url().includes('/api/services/assistance/493/create')
                ),
                videocallPage.requestAssistanceBtn.click()
            ]);

            expect(response.status()).toBe(200);

            const videocallRequest = await response.request();
            const videocallRequestBody = await videocallRequest.postDataJSON();

            expect.soft(videocallRequestBody.additionalInformation.message).toBe(additionalComment);
            expect.soft(videocallRequestBody.additionalInformation.medias).toHaveLength(1);
            expect.soft(videocallRequestBody.additionalInformation.medias[0].id).toBe(fileId);

            const videocallResponse = await response.json();

            expect(videocallResponse.assistanceId).toBeDefined();

            assistanceId = videocallResponse.assistanceId;

            await expect.soft(page.getByText('¡Listo! Tu turno está reservado')).toBeVisible();

            const homePage = new VetifyWebappHomePage(page);
            await homePage.waitForPageLoaded();

            expect(homePage.greetingLbl).toBeVisible();

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
    test.describe('TS-04 Videollamadas agendadas', () => {
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
                    date: DateTime
                        .fromMillis(vc.date)
                        .setZone('UTC')
                        .toFormat('dd/MM/yy, hh:mm a')
                        .replace('PM', 'p. m.')
                        .replace('AM', 'a. m.')
                }))
        }

        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            vetifyApiClient = await VetifyWebappApiClient.getApi(page);

            const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
            await Promise.all(videocallApiListResponse.map((vc) => vetifyApiClient.cancelVideoCall(vc.assistanceId)));

            await scheduleVideocall();
        });

        test.afterAll(async () => {
            // Delete all the videocalls
            await Promise.all(videocallIds.map((id) => vetifyApiClient.cancelVideoCall(id)));
        });

        test('CP-01 - Listado en la Home - Una videollamada', { tag: ['@critical'] }, async ({ page }) => {
            const homePage = new VetifyWebappHomePage(page);
            await homePage.load();

            await expect(homePage.upcomingAppointmentsToggleBtn).toBeHidden();

            // API: Get the list of videocalls
            const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
            const videocallApiList = formatVideocallsApiResponse(videocallApiListResponse);

            const videocallElements = await page.locator(`//p[contains(text(), 'Turno:  Videollamada Veterinaria')]/../..`).all();

            expect(videocallElements).toHaveLength(1);
            await expect(videocallElements[0].locator('//div[2]/p[3]')).toHaveText(videocallApiList[0].date)
        });

        test('CP-02 - Listado en la Home - Multiples videollamadas', { tag: ['@critical'] }, async ({ page }) => {
            const vetifyApiClient = await VetifyWebappApiClient.getApi(page);
            const AMOUNT_OF_NEW_VIDEOCALLS = 2;

            for (let i = 0; i < AMOUNT_OF_NEW_VIDEOCALLS; i++) {
                await scheduleVideocall();
            }

            const homePage = new VetifyWebappHomePage(page);
            await homePage.load();

            expect(homePage.upcomingAppointmentsToggleBtn).toBeVisible();

            // Expand the list of scheduled videocalls to be visible
            await homePage.upcomingAppointmentsToggleBtn.click();

            // API: Get the list of videocalls
            const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
            const videocallApiList = formatVideocallsApiResponse(videocallApiListResponse);

            const videocallElements = await page.locator(`//p[contains(text(), 'Turno:  Videollamada Veterinaria')]/../..`).all();

            expect(videocallElements).toHaveLength(videocallApiList.length);

            for (const idx in videocallElements) {
                await expect(videocallElements[idx].locator('//div[2]/p[3]')).toHaveText(videocallApiList[idx].date)
            }
        });

        test('CP-03 - Ver', { tag: ['@critical'] }, async ({ page }) => {
            const homePage = new VetifyWebappHomePage(page);
            await Promise.all([
                page.waitForResponse(response =>
                    response.url().includes('/api/services/assistance/local/programmed?filterByProvider=true') && response.status() === 200
                ),
                homePage.load(),
            ]);

            // API: Get the list of videocalls
            const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();
            const videocallApiList = formatVideocallsApiResponse(videocallApiListResponse);

            // eslint-disable-next-line playwright/no-conditional-in-test
            if (videocallApiList.length > 1) {
                await homePage.upcomingAppointmentsToggleBtn.click();
            }

            const videocallElements = await page.locator(`//p[contains(text(), 'Turno:  Videollamada Veterinaria')]/../..`).all();
            const randomIdx = getRandomElement([...Array(videocallElements.length).keys()])!;
            await videocallElements[randomIdx].click();
            const selelectedVideocallId = videocallApiList[randomIdx].assistanceId;
            const viewVideocallPage = new VetifyWebappVideocallViewPage(page, selelectedVideocallId);
            await viewVideocallPage.expectLoaded();
            const videocallDetails = await vetifyApiClient.getScheduledVideoCallById(selelectedVideocallId);

            // Validations
            const expectedScheduleDatetime = DateTime.fromFormat(
                `${videocallDetails.fecha} ${videocallDetails.hora}`,
                'yyyy-MM-dd HH:mm:ss'
            );

            expect(viewVideocallPage.pageTitle).toHaveText('Videollamada programada');
            expect(viewVideocallPage.pageSubTitle).toHaveText(expectedScheduleDatetime.toFormat('dd/MM/yyyy - HH:mm'));
            expect(viewVideocallPage.reasonInput).toHaveValue(videocallDetails.motivo_consulta)
            expect(viewVideocallPage.scheduledDateLbl).toHaveText(expectedScheduleDatetime.toFormat('dd/MM/yyyy'));
            expect(viewVideocallPage.scheduledTimeLbl).toHaveText(expectedScheduleDatetime.toFormat('HH:mm'));
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

        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            vetifyApiClient = await VetifyWebappApiClient.getApi(page);
        });

        test.beforeEach(async ({ page }) => {
            const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();

            if (videocallApiListResponse.length === 0) {
                const dataSet = await vetifyApiClient.scheduleVideocall();
                videocallIds.push(dataSet.assistanceId);
                selectedVideocallId = dataSet.assistanceId;
            } else {
                selectedVideocallId = videocallApiListResponse[0].assistanceId;
            }

            viewVideocallPage = new VetifyWebappVideocallViewPage(page, selectedVideocallId!);

            await Promise.all([
                viewVideocallPage.load(),
                viewVideocallPage.waitForPageLoaded(),
            ]);
        });

        test.afterAll(async () => {
            // Delete all the videocalls created for this test suite
            await Promise.all(videocallIds.map((id) => vetifyApiClient.cancelVideoCall(id)));
        });

        test('CP-01 - Editar - Cambiar mascota', async () => {
            // Change selected pet
            const petsList = await viewVideocallPage.petsList.all();
            const newRandomPet = getRandomElement(petsList)!;
            const newSelectedPetName: string = (await (newRandomPet.locator('p')).textContent()) as string;
            await newRandomPet.click();

            // Click on save
            await viewVideocallPage.saveBtn.click();

            // Open the page again
            await Promise.all([
                viewVideocallPage.load(),
                viewVideocallPage.waitForPageLoaded(),
            ]);

            // Validate that all the changes are persisted
            const actualSelectedPet = await viewVideocallPage.getSelectedPet();
            expect(actualSelectedPet.locator('p')).toHaveText(newSelectedPetName);
        });

        test('CP-02 - Editar - Reprogramar', { tag: ['@critical'] }, async ({ page }) => {
            const monthOffset = getRandomInt(0, 3);
            const dayOffset = getRandomInt(1, 10);
            const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

            await viewVideocallPage.rescheduleBtn.click();
            await viewVideocallPage.rescheduleModalConfirmBtn.click();

            const rescheduleVideocallPage = new VetifyWebappRescheduleVideocallPage(page, selectedVideocallId!);
            await rescheduleVideocallPage.calendarComponent.selectAssistanceDay(selectedDay);
            await rescheduleVideocallPage.calendarComponent.selectAssistanceTime();
            await rescheduleVideocallPage.saveBtn.click();

            expect(viewVideocallPage.rescheduleConfirmationModalTitleLbl).toBeVisible();
            expect(viewVideocallPage.rescheduleConfirmationModalTitleLbl).toHaveText('Tu turno ha sido reprogramado');

            await viewVideocallPage.rescheduleConfirmationModalOkBtn.click();
            expect(viewVideocallPage.rescheduleConfirmationModalTitleLbl).toBeHidden();
        });

        test('CP-03 - Editar - Cambiar motivo de consulta', async () => {
            const newRason = `New reason ${Date.now()}`;
            // Save button is not enabled until you change the reason
            expect(viewVideocallPage.saveBtn).toBeDisabled();

            // Update reason
            await viewVideocallPage.reasonInput.fill(newRason);

            // Now the save button is enabled
            expect(viewVideocallPage.saveBtn).toBeEnabled();

            // Click on save
            await viewVideocallPage.saveBtn.click();

            // Open the page again
            await Promise.all([
                viewVideocallPage.load(),
                viewVideocallPage.waitForPageLoaded(),
            ]);

            // Validate that all the changes are persisted
            expect(viewVideocallPage.reasonInput).toHaveValue(newRason);
        });

        //     test('CP-04 - Editar - Cambiar adjunto - Sin Archivo Adjunto previo', async () => {
        //         await videocallPage.fileInput.setInputFiles({ name: 'new_image.png', mimeType: 'image/png', buffer: Buffer.from('img') });
        //         await expect(videocallPage.fileFeedbackName).toBeVisible();
        //         await expect(videocallPage.discardFileBtn).toBeVisible();
        //         await expect(videocallPage.saveBtn).toBeEnabled();
        //     });

        //     test('CP-05 - Editar - Cambiar adjunto - Con Archivo Adjunto existente', async () => {
        //         // Component lists current documents and leaves them unaffected when adding a new asset
        //         await videocallPage.fileInput.setInputFiles({ name: 'additional.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf') });
        //         await expect(videocallPage.fileFeedbackName).toHaveCount(2); // Existing + New
        //     });

        //     test('CP-06 - Editar - Cancelar modificaciones', async () => {
        //         await videocallPage.petSelect.selectOption({ label: 'Max' });
        //         await videocallPage.backBtn.click(); // Cancel modifications button
        //         await expect(videocallPage.page).toHaveURL(/.*home/);
        //     });

        test('CP-07 - Editar', { tag: ['@critical'] }, async () => {
            const newRason = `New reason ${Date.now()}`;
            // Change selected pet
            const petsList = await viewVideocallPage.petsList.all();
            const newRandomPet = getRandomElement(petsList)!;
            const newSelectedPetName: string = (await (newRandomPet.locator('p')).textContent()) as string;
            await newRandomPet.click();

            // Update reason
            await viewVideocallPage.reasonInput.fill(newRason);

            // Upload a photo or file
            // TODO: Add the logic to upload photo or file

            // Click on save
            await viewVideocallPage.saveBtn.click();

            // Open the page again
            await Promise.all([
                viewVideocallPage.load(),
                viewVideocallPage.waitForPageLoaded(),
            ]);

            // Validate that all the changes are persisted
            expect(viewVideocallPage.reasonInput).toHaveValue(newRason);
            const actualSelectedPet = await viewVideocallPage.getSelectedPet();
            expect(actualSelectedPet.locator('p')).toHaveText(newSelectedPetName);
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

        test.beforeAll(async ({ browser }) => {
            const page = await browser.newPage();
            vetifyApiClient = await VetifyWebappApiClient.getApi(page);
        });

        test.beforeEach(async ({ page }) => {
            const videocallApiListResponse = await vetifyApiClient.getScheduledVideocalls();

            if (videocallApiListResponse.length === 0) {
                const dataSet = await vetifyApiClient.scheduleVideocall();
                videocallIds.push(dataSet.assistanceId);
                selectedVideocallId = dataSet.assistanceId;
            } else {
                selectedVideocallId = videocallApiListResponse[0].assistanceId;
            }

            viewVideocallPage = new VetifyWebappVideocallViewPage(page, selectedVideocallId!);

            await Promise.all([
                viewVideocallPage.load(),
                viewVideocallPage.waitForPageLoaded(),
            ]);
        });

        test.afterAll(async () => {
            // Delete all the videocalls created for this test suite
            await Promise.all(videocallIds.map((id) => vetifyApiClient.cancelVideoCall(id)));
        });

        //     test('CP-01 - Cancelar Turno - Listados de motivos', async () => {
        //         // Mocking API call that fuels cancellation drop-down select options
        //         await videocallPage.page.route('**/api/motivos-cancelacion', async route => route.fulfill({
        //             json: [{ id: 1, text: 'Problema de horarios' }, { id: 2, text: 'Ya resolví mi problema' }]
        //         }));
        //         await videocallPage.cancelAppointmentBtn.click(); // Re-trigger to capture mocked data load

        //         await expect(videocallPage.cancelReasonSelect.getByText('Problema de horarios')).toBeVisible();
        //     });

        //     test('CP-02 - Cancelar Turno - No cancelar', async () => {
        //         await videocallPage.closeModalBtn.click();
        //         // Ensure element state and window remain active
        //         await expect(videocallPage.cancelReasonSelect).toBeHidden();
        //     });

        test('CP-03 - Cancelar Turno - Confirmar cancelación', { tag: ['@critical'] }, async ({ page }) => {
            /*
            1. Ingresar a la pantalla de Home
            2. Hacer click en una solicitud de videollamada
            3. Presionar el botón de "Cancelar"
            4. Seleccionar un motivo de cancelación
            5. Presionar el botón "Cancelar turno"
            */
            const cancelVideocallModal = new VetifyWebappCancelVideocallModal(page, selectedVideocallId!);
            await Promise.all([
                viewVideocallPage.cancelVideocallBtn.click(),
                cancelVideocallModal.waitForComponentLoaded(),
            ]);
            const reasonsElements = await cancelVideocallModal.reasonsOptions.all();
            const reasonsTxts = await Promise.all(reasonsElements.map(e => e.textContent()));

            await cancelVideocallModal.reasonSelect.selectOption({
                label: getRandomElement(reasonsTxts.slice(1).filter(e => e !== 'Otros'))!.trim()
            });

            const homePage = new VetifyWebappHomePage(page);

            await Promise.all([
                cancelVideocallModal.confirmCancelation(),
                page.waitForResponse(response =>
                    response.url().includes('/api/services/sse/assistance_updates') && response.status() === 200
                ),
                homePage.waitForPageLoaded(),
            ]);

            /*
            - El turno es cancelado correctamente
            - El usuario recibe un email de cancelación de turno
            - El turno es cancelado correctamente en SISE
            */
            const listOfAvailableVideocalls = await vetifyApiClient.getScheduledVideocalls();
            expect(listOfAvailableVideocalls.map(avc => avc.assistanceId)).not.toContain(selectedVideocallId!);

            const videocallApiData = await vetifyApiClient.getScheduledVideoCallById(selectedVideocallId!);
            expect(videocallApiData.estado).toBe('CANCELADO');
        });
    });
});