import { SiteId } from '@config/environment';
import { getRandomInt } from '@helpers/automation-utils';
import { expect } from '@playwright/test';
import { UserTag } from '@providers/user/tags';
import { UserSource } from '@providers/user/user-provider';
import { setAllureDetails, step, test } from '@tests/framework/base-test';
import { DateTime } from 'luxon';

test.describe('Videollamada Test Suite', () => {
    // =========================================================================
    // CATEGORY: TS-01 IMAS-3899 - Solicitud sin credencial cargada
    // =========================================================================
    test.describe('TS-01 IMAS-3899 - Solicitud sin credencial cargada', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-01 - Videollamada - Vetify - Bloqueo de avance sin credencial vigente', { tag: ['@critical'] }, async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                const hasAnyPlanWithPet = await apiClient.userHasPlanWithPet();
                // IMP-003 (docs/impedimentos-bloqueos.md): el pool no garantiza de forma estable un usuario
                // sin NINGÚN plan con mascota — si el usuario tiene 2+ planes y al menos uno tiene mascota,
                // el flujo de videollamada auto-selecciona ese plan y nunca llega a la pantalla de credencial
                // faltante. Se verifica en vivo en vez de confiar ciegamente en el tag NO_PET.
                test.skip(hasAnyPlanWithPet, 'IMP-003: el usuario asignado por el pool tiene al menos un plan con mascota; el flujo lo auto-selecciona y nunca bloquea por credencial faltante.');

                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente sin mascota asociada (sin credencial cargada).'],
                    steps: ['Iniciar una nueva solicitud de videollamada.'],
                    expectedResult: [
                        'El sistema muestra la pantalla de credencial faltante.',
                        'Al presionar "Completar credencial" el sistema redirecciona al formulario de alta de mascota.',
                    ],
                });

                // Pasos:
                await step('1. Iniciar una nueva solicitud de videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                });
                // Resultado esperado:
                await step('El sistema muestra la pantalla de credencial faltante.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyMissingCredentialScreenVisible();
                });
                await step('Al presionar "Completar credencial" el sistema redirecciona al formulario de alta de mascota.', async () => {
                    await container.vetify.webapp.videocallFormPage.goToCompleteCredential();
                    await container.vetify.webapp.addPetFormPage.verifyStartStepVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-02 - [Negativo] [API] Videollamada - Vetify - Backend rechaza creación de turno sin credencial vigente', { tag: ['@critical'] }, async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                const planWithoutPet = await apiClient.getPlanWithoutPet();
                test.skip(!planWithoutPet, 'No se encontró un plan sin mascota para este usuario.');

                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente sin mascota asociada.'],
                    steps: ['Solicitar la creación de un turno de videollamada para un plan sin mascota vía API.'],
                    expectedResult: ['El backend rechaza la creación del turno.'],
                });

                // Pasos / Resultado esperado:
                await step('El backend rechaza la creación del turno.', async () => {
                    await expect(async () => {
                        await expect(apiClient.scheduleVideocall({ petId: planWithoutPet.id })).rejects.toThrow();
                    }).toPass();
                });
            });
        });

        test.describe(() => {
            // RETEST 2026-08-07: dev movió IMAS-4102 a "In Validation" sin comentario. Cuenta real
            // (alan.gonzalez@ingenia.la, ver src/fixtures/users/pooled-users.json) confirmada con 1 plan
            // estado LIBRE (mascota:null) — precondición NO_PET/PLAN_WITHOUT_PET verificada en vivo.
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-03 - Videollamada - Vetify - Retomar la solicitud tras completar la credencial (CA05, IMAS-4102)', { tag: ['@critical'] }, async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                const hasAnyPlanWithPet = await apiClient.userHasPlanWithPet();
                // IMP-003 (docs/impedimentos-bloqueos.md): el pool no garantiza de forma estable un usuario
                // sin mascota — el tag NO_PET/PLAN_WITHOUT_PET puede quedar desactualizado si la cuenta se
                // consumió en una corrida previa. Se verifica en vivo, mismo patrón que TC-01.
                test.skip(hasAnyPlanWithPet, 'IMP-003: el usuario asignado por el pool ya tiene una mascota (tag desactualizado) — no reproduce la precondición de credencial faltante.');

                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente sin mascota asociada (sin credencial cargada), derivado al flujo de carga de credencial desde la solicitud de videollamada.'],
                    steps: ['Completar el formulario de credencial de la mascota de punta a punta.', 'Observar la pantalla final tras completar la credencial exitosamente.'],
                    expectedResult: ['El sistema NO vuelve al Home general — lleva a la pantalla de entrada de videollamada ("Agendá nueva videollamada"), ya con la mascota recién cargada disponible para seleccionar.'],
                });

                // RETEST 2026-08-07 (IMAS-4102, dev lo movió a "In Validation" sin comentario). Tras
                // completar la credencial, el sistema lleva a la pantalla de ENTRADA de videollamada
                // (no al selector de motivo directamente, pero tampoco al Home general). Consultado con
                // la PO (Pau) si esto cumple CA05 ("sin pasar por Home") — **confirmado que el
                // comportamiento actual está bien así**, no hace falta que aterrice más adentro del
                // flujo. Bug cerrado — ver docs/bugs/BUG-001-credencial-no-retoma-videollamada.md.

                const petName = `TestCA05${Date.now()}`;

                // Pasos:
                await step('1. Iniciar una solicitud de videollamada y llegar al formulario de carga de credencial.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.verifyMissingCredentialScreenVisible();
                    await container.vetify.webapp.videocallFormPage.goToCompleteCredential();
                });

                await step('2. Completar el formulario de credencial de la mascota de punta a punta.', async () => {
                    await container.vetify.webapp.addPetFormPage.verifyStartStepVisible();
                    await container.vetify.webapp.addPetFormPage.dismissStartWarningModal();
                    await container.vetify.webapp.addPetFormPage.clickContinue();

                    await container.vetify.webapp.addPetFormPage.fillPetName(petName);
                    await container.vetify.webapp.addPetFormPage.clickContinue();

                    await container.vetify.webapp.addPetFormPage.selectPetType('Perro');
                    await container.vetify.webapp.addPetFormPage.selectPetGender('Macho');
                    await container.vetify.webapp.addPetFormPage.clickContinue();

                    await container.vetify.webapp.addPetFormPage.selectRandomPetBreed();
                    await container.vetify.webapp.addPetFormPage.clickContinue();

                    await container.vetify.webapp.addPetFormPage.selectPetAge(DateTime.now().minus({ years: 3 }));
                    await container.vetify.webapp.addPetFormPage.clickContinue();

                    await container.vetify.webapp.addPetFormPage.uploadPetFilePhoto('src/fixtures/images/dog-profile-photo.jpg');
                    await container.vetify.webapp.addPetFormPage.clickContinue();
                });

                // Resultado esperado (confirmado correcto por la PO 2026-08-07 — ver nota arriba):
                await step('El sistema lleva a la pantalla de entrada de videollamada (no al Home general) con la mascota recién cargada disponible.', async () => {
                    await container.vetify.webapp.addPetFormPage.verifyCongratsScreen(petName);
                    await expect(container.vetify.webapp.addPetFormPage.continueButton).toBeVisible();
                    await container.vetify.webapp.addPetFormPage.continueButton.click();
                    await expect(container.vetify.webapp.videocallFormPage.scheduleNewVideocallBtn).toBeVisible();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-02 IMAS-3174 - Rediseño solicitud de turno x 1 mascota
    // =========================================================================
    test.describe('TS-02 IMAS-3174 - Rediseño solicitud de turno x 1 mascota', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test.beforeEach(async ({ container, page }) => {
                // Hace el test idempotente entre reruns: el usuario pooled se comparte entre corridas y
                // el límite real de 2 turnos por mascota (IMAS-3909) bloquearía este flujo feliz si quedaran
                // turnos de una ejecución anterior sin cancelar. Best-effort: TC-01 y TC-02 comparten este
                // mismo usuario (reserve: false) y pueden correr en paralelo — si otro test ya canceló/creó
                // un turno concurrentemente, no bloquear el test actual por esa carrera de por sí inofensiva.
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
            });

            test('TC-01 - Videollamada - Vetify - Flujo feliz completo sin selección de mascota', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente y una única mascota asociada, sin turnos pendientes.'],
                    steps: [
                        'Iniciar una nueva solicitud de videollamada.',
                        'Ingresar un motivo de texto libre que no arroja coincidencias y luego seleccionar el motivo "Vacunas".',
                        'Continuar sin adjuntar archivos.',
                        'Seleccionar un día y horario disponibles.',
                        'Confirmar el turno desde la pantalla de revisión.',
                    ],
                    expectedResult: [
                        'El usuario avanza por todo el wizard sin que el sistema le pida seleccionar una mascota (solo tiene una).',
                        'Las 3 franjas horarias (Mañana, Tarde, Noche) quedan disponibles para revisar desde la pantalla de revisión.',
                        'Se muestra la pantalla de confirmación del turno.',
                        'El turno queda agendado y visible como próximo turno en el home.',
                    ],
                });

                // Pasos:
                await step('1. Iniciar una nueva solicitud de videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.verifyReasonScreenVisible();
                });

                await step('2. Ingresar un motivo de texto libre que no arroja coincidencias y luego seleccionar el motivo "Vacunas".', async () => {
                    await container.vetify.webapp.videocallFormPage.enterFreeTextReason('TextoLibreQueNoExiste123');
                    await container.vetify.webapp.videocallFormPage.verifyReasonNotFound();
                    await container.vetify.webapp.videocallFormPage.selectReason('Vacunas');
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });

                await step('3. Continuar sin adjuntar archivos.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentsScreenVisible();
                    await container.vetify.webapp.videocallFormPage.skipAttachments();
                });

                await step('4. Seleccionar un día y horario disponibles.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyDayTimeScreenVisible();
                    const dayOffset = getRandomInt(1, 25);
                    await container.vetify.webapp.videocallFormPage.completeDayAndTime(DateTime.now().plus({ days: dayOffset }));
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });

                // Resultado esperado:
                await step('Las 3 franjas horarias (Mañana, Tarde, Noche) quedan disponibles para revisar desde la pantalla de revisión.', async () => {
                    // Re-abre el paso de fecha/hora desde la revisión para inspectar las franjas sin perder el
                    // horario ya seleccionado que se usa para confirmar el turno.
                    await container.vetify.webapp.videocallFormPage.verifyTimeBandsAvailableFromReview();
                });

                await step('5. Confirmar el turno desde la pantalla de revisión.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyReviewScreenSinglePet();
                    await container.vetify.webapp.videocallFormPage.confirmVideocall();
                });

                await step('Se muestra la pantalla de confirmación del turno.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyConfirmationScreen();
                });

                await step('El turno queda agendado y visible como próximo turno en el home.', async () => {
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                    await container.vetify.webapp.homePage.verifyUpcomingVideocallVisible();
                });
            });

            test('TC-02 - Videollamada - Vetify - Adjuntos válidos e inválidos (CA04)', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente y una mascota asociada.'],
                    steps: [
                        'Iniciar una nueva solicitud de videollamada y seleccionar el motivo "Vacunas".',
                        'Adjuntar un archivo que excede el peso permitido.',
                        'Adjuntar un archivo válido.',
                    ],
                    expectedResult: [
                        'El sistema rechaza el archivo que excede el peso permitido con un mensaje de error.',
                        'El sistema acepta y muestra el archivo válido adjuntado.',
                    ],
                });

                // Pasos:
                await step('1. Iniciar una nueva solicitud de videollamada y seleccionar el motivo "Vacunas".', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.selectReason('Vacunas');
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentsScreenVisible();
                });

                await step('2. Adjuntar un archivo que excede el peso permitido.', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/oversize_videocall_11MB.jpg');
                });
                // Resultado esperado:
                await step('El sistema rechaza el archivo que excede el peso permitido con un mensaje de error.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentTooLargeError();
                });

                await step('3. Adjuntar un archivo válido.', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/dog-profile-photo.jpg');
                });
                await step('El sistema acepta y muestra el archivo válido adjuntado.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentUploaded('dog-profile-photo.jpg');
                });
            });

            test('TC-03 - [Negativo] Videollamada - Vetify - Motivo obligatorio bloquea el avance (CP03 IMAS-3174)', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente y una mascota asociada.'],
                    steps: ['Iniciar una nueva solicitud de videollamada.', 'Dejar el campo "Motivo" vacío e intentar avanzar.'],
                    expectedResult: ['"Continuar" permanece deshabilitado mientras el motivo no esté completo.'],
                });

                await step('1. Iniciar una nueva solicitud de videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.verifyReasonScreenVisible();
                });

                await step('2. Dejar el campo "Motivo" vacío e intentar avanzar.', async () => {
                    // No-op intencional: no se completa el campo "Motivo" antes de verificar el bloqueo.
                });
                await step('"Continuar" permanece deshabilitado mientras el motivo no esté completo.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyReasonRequiredBlocksContinue();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-03 IMAS-3889 - Adjuntos, calendario y motivo (partes testeables con 1 mascota)
    // =========================================================================
    test.describe('TS-03 IMAS-3889 - Adjuntos, calendario y motivo', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test.beforeEach(async ({ container, page }) => {
                // Mismo usuario pooled que TS-02 (reserve: false) — sin esta limpieza, un turno real
                // dejado por una corrida anterior (o por exploración manual sobre esta cuenta) bloquea
                // días del calendario y produce falsos negativos aquí, ajenos a lo que este test evalúa.
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();

                await step('El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.selectReason('Vacunas');
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });
            });

            test('TC-01 - Videollamada - Vetify - Adjuntos - Rechazo por formato y peso inválido', async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.'],
                    steps: ['Adjuntar un archivo que excede el peso permitido.'],
                    expectedResult: ['El sistema rechaza el archivo con un mensaje de error por tamaño excedido.'],
                });

                await step('1. Adjuntar un archivo que excede el peso permitido.', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/oversize_videocall_11MB.jpg');
                });
                await step('El sistema rechaza el archivo con un mensaje de error por tamaño excedido.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentTooLargeError();
                });
            });

            test('TC-02 - Videollamada - Vetify - Adjuntos - Carga y borrado de archivo válido', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.'],
                    steps: ['Adjuntar un archivo válido.', 'Eliminar el archivo adjuntado.'],
                    expectedResult: ['El sistema muestra el archivo adjuntado correctamente.', 'El sistema elimina el archivo adjuntado sin errores.'],
                });

                await step('1. Adjuntar un archivo válido.', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/dog-profile-photo.jpg');
                });
                await step('El sistema muestra el archivo adjuntado correctamente.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentUploaded('dog-profile-photo.jpg');
                });

                await step('2. Eliminar el archivo adjuntado.', async () => {
                    await container.vetify.webapp.videocallFormPage.deleteAttachedFile('dog-profile-photo.jpg');
                });
            });

            test('TC-03 - Videollamada - Vetify - Calendario - Ventana de 30 días de anticipación', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.'],
                    steps: [
                        'Continuar sin adjuntar archivos hasta la pantalla de selección de fecha y hora.',
                        'Verificar una fecha fuera de la ventana de 30 días de anticipación.',
                        'Verificar una fecha dentro de la ventana de 30 días de anticipación.',
                    ],
                    expectedResult: ['La fecha fuera de la ventana de 30 días no puede seleccionarse.', 'La fecha dentro de la ventana de 30 días puede seleccionarse.'],
                });

                await step('1. Continuar sin adjuntar archivos hasta la pantalla de selección de fecha y hora.', async () => {
                    await container.vetify.webapp.videocallFormPage.skipAttachments();
                    await container.vetify.webapp.videocallFormPage.verifyDayTimeScreenVisible();
                });

                const beyondWindow = DateTime.now().plus({ days: 35 });
                const withinWindow = DateTime.now().plus({ days: 10 });

                await step('La fecha fuera de la ventana de 30 días no puede seleccionarse.', async () => {
                    await container.vetify.webapp.videocallFormPage.calendarComponent.verifyDateIsNotBookable(beyondWindow);
                });
                await step('La fecha dentro de la ventana de 30 días puede seleccionarse.', async () => {
                    await container.vetify.webapp.videocallFormPage.calendarComponent.verifyDateIsBookable(withinWindow);
                });
            });

            test('TC-08 - [Regresión] IMAS-4023/IMAS-3889 CP13 - Bloqueo del selector de archivos al llegar a 5 (mobile)', { tag: ['@critical'] }, async ({ container }, testInfo) => {
                // El motivo de skip original ("requiere el proyecto mobile, deshabilitado") quedó
                // desactualizado desde 2026-08-05 — "Vetify WebApp Android" está habilitado y el resto de
                // la suite ya corre verde ahí. Este test SÍ requiere la plataforma mobile en sí (valida el
                // selector de cámara/archivo específico de ese viewport), así que se sigue restringiendo a
                // Android, pero por motivo real, no por infraestructura faltante.
                test.skip(!testInfo.project.name.includes('Android'), 'IMAS-4023/IMAS-3889 CP13: caso específico de mobile (selector de cámara), no aplica en Desktop.');

                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado, en un viewport mobile.'],
                    steps: ['Adjuntar 5 archivos válidos consecutivos.', 'Observar el selector de carga de archivos (incluye la opción de cámara en mobile).'],
                    expectedResult: ['Al llegar a 5 archivos, el bloque completo de carga (incluida la opción de cámara) deja de ofrecerse.'],
                });

                await step('1. Adjuntar 5 archivos válidos consecutivos.', async () => {
                    // Esperar a que cada archivo quede realmente adjuntado (aparece en la lista) antes de
                    // adjuntar el siguiente — hacerlo sin esperar reinicia la selección del input en vez de
                    // sumar un archivo más (confirmado en vivo: 5 llamadas seguidas sin espera dejan 1 solo
                    // archivo adjuntado, no 5).
                    for (let i = 0; i < 5; i++) {
                        await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/dog-profile-photo.jpg');
                        await expect(container.vetify.webapp.videocallFormPage.attachedFileNameLbl).toHaveCount(i + 1);
                    }
                });
                await step('Al llegar a 5 archivos, el bloque completo de carga (incluida la opción de cámara) deja de ofrecerse.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyUploadWidgetHiddenAtLimit();
                });
            });

            test('TC-07 - [Regresión] IMAS-4023/IMAS-3889 CP10, CP12 - Formato inválido y límite de 5 archivos', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.'],
                    steps: ['Adjuntar un archivo de formato no soportado (.txt).', 'Adjuntar 5 archivos válidos consecutivos.'],
                    expectedResult: [
                        'El sistema rechaza el archivo con "No se pudo subir el archivo. Intentá nuevamente." (CA01/CA02/CA06).',
                        'Al llegar a 5 archivos, el bloque de carga deja de ofrecerse — no se puede adjuntar un 6to (CA01/CA05).',
                    ],
                });

                await step('1. Adjuntar un archivo de formato no soportado (.txt).', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/files/invalid-format.txt');
                });
                await step('El sistema rechaza el archivo con "No se pudo subir el archivo. Intentá nuevamente." (CA01/CA02/CA06).', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyInvalidFormatError();
                });

                await step('2. Adjuntar 5 archivos válidos consecutivos.', async () => {
                    // Ver nota en TC-08: hay que esperar a que cada archivo quede adjuntado antes del
                    // siguiente, si no el input reinicia la selección en vez de sumar.
                    for (let i = 0; i < 5; i++) {
                        await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/dog-profile-photo.jpg');
                        await expect(container.vetify.webapp.videocallFormPage.attachedFileNameLbl).toHaveCount(i + 1);
                    }
                });
                await step('Al llegar a 5 archivos, el bloque de carga deja de ofrecerse — no se puede adjuntar un 6to (CA01/CA05).', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyUploadWidgetHiddenAtLimit();
                });
            });

            test('TC-09 - [Regresión] IMAS-4023 CA03 - Reintento de carga tras error (archivo inválido → válido)', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.'],
                    steps: ['Adjuntar un archivo de formato no soportado (.txt) y recibir el error.', 'Adjuntar un archivo válido a continuación, sin recargar la pantalla.'],
                    expectedResult: ['El sistema permite el reintento: el archivo válido se adjunta correctamente y habilita "Continuar", sin arrastrar el error anterior.'],
                });

                await step('1. Adjuntar un archivo de formato no soportado (.txt) y recibir el error.', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/files/invalid-format.txt');
                    await container.vetify.webapp.videocallFormPage.verifyInvalidFormatError();
                });

                await step('2. Adjuntar un archivo válido a continuación, sin recargar la pantalla.', async () => {
                    await container.vetify.webapp.videocallFormPage.uploadAttachment('src/fixtures/images/dog-profile-photo.jpg');
                });
                await step('El sistema permite el reintento: el archivo válido se adjunta correctamente y habilita "Continuar", sin arrastrar el error anterior.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentUploaded('dog-profile-photo.jpg');
                    await expect(container.vetify.webapp.videocallFormPage.invalidFormatErrorLbl).toBeHidden();
                });
            });

            test('TC-11 - [Negativo] Videollamada - Vetify - Adjuntos - "Continuar" deshabilitado sin archivos (CP09 IMAS-3889)', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado, sin archivos cargados.'],
                    steps: ['Revisar el estado de "Continuar" sin adjuntar nada.'],
                    expectedResult: ['"Continuar" permanece deshabilitado por defecto; solo "Omitir" permite avanzar sin adjuntar.'],
                });

                await step('1. Revisar el estado de "Continuar" sin adjuntar nada.', async () => {
                    // No-op intencional: no se adjunta ningún archivo antes de verificar el bloqueo.
                });
                await step('"Continuar" permanece deshabilitado por defecto; solo "Omitir" permite avanzar sin adjuntar.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyAttachmentsWithoutFilesBlockContinue();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test('TC-04 - [Negativo] [API] Videollamada - Vetify - Rechazo de fecha fuera de ventana de 30 días', { tag: ['@critical'] }, async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                const farDate = DateTime.now().plus({ days: 45 }).toISO();

                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente y una mascota asociada.'],
                    steps: ['Solicitar la creación de un turno para una fecha fuera de la ventana de 30 días vía API.'],
                    expectedResult: ['El backend rechaza la creación del turno.'],
                });

                await step('El backend rechaza la creación del turno.', async () => {
                    await expect(async () => {
                        await expect(apiClient.scheduleVideocall({ date: farDate!, time: '09:00' })).rejects.toThrow();
                    }).toPass();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 2,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test.beforeEach(async ({ container, page }) => {
                // TC-06 confirma un turno real (a diferencia de TC-05) — cancela turnos previos de este
                // usuario multi-mascota para que el límite de 2 turnos/mascota (IMAS-3909) no bloquee reruns.
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                // Verificación de estado real 2026-09-04: esta cuenta pooled compartida (numberOfPlans:2,
                // reserve:false/ignoreReserved:true) puede tener menos de 2 mascotas reales en este momento
                // si otro test la tocó antes, o el backend está intermitente (ver docs/bugs/BUG-033) — un
                // skip honesto acá es mejor que dejar que TC-05/TC-06 timeouteen 35-80s buscando un selector
                // de mascota que nunca va a aparecer con 0 o 1 mascota real.
                const pets = await apiClient.getUserPets();
                test.skip(pets.length < 2, `La cuenta de prueba tiene ${pets.length} mascota(s) reales ahora mismo, se necesitan 2+ para el selector multi-mascota.`);
            });

            // @unstable 2026-08-20: flaky bajo condiciones reales de CI (falla en el primer intento,
            // pasa en el retry) — ver qa-workspace/decision-log.md, mismo síntoma que su equivalente
            // mobile/Appium (videocall.spec.ts TC-05), posible degradación por sesión larga.
            test('TC-05 - Videollamada - Vetify - Selector de mascota obligatorio (multi-mascota)', { tag: ['@critical', '@unstable'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente y más de una mascota asociada.'],
                    steps: ['Iniciar una nueva solicitud de videollamada.', 'Seleccionar una mascota del selector.'],
                    expectedResult: [
                        'El sistema muestra el selector de mascota de forma obligatoria.',
                        'Al continuar, la pantalla de motivo refleja la mascota seleccionada.',
                    ],
                });

                await step('1. Iniciar una nueva solicitud de videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                });
                await step('El sistema muestra el selector de mascota de forma obligatoria.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyPetSelectorVisible();
                });

                await step('2. Seleccionar una mascota del selector.', async () => {
                    await container.vetify.webapp.videocallFormPage.selectPet();
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });
                await step('Al continuar, la pantalla de motivo refleja la mascota seleccionada.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyReasonScreenWithSelectedPet();
                });
            });

            // @unstable 2026-08-20: flaky bajo condiciones reales de CI (falla en el primer intento,
            // pasa en el retry) — ver qa-workspace/decision-log.md.
            test('TC-06 - Videollamada - Vetify - Edición de mascota en revisión y confirmación (multi-mascota)', { tag: ['@critical', '@unstable'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario registrado con un plan vigente y más de una mascota asociada, sin turnos pendientes.'],
                    steps: [
                        'Iniciar la solicitud, seleccionar la primera mascota y completar motivo, adjuntos y día/horario.',
                        'Desde la revisión, editar la mascota seleccionada y elegir una distinta.',
                        'Confirmar el turno desde la revisión.',
                    ],
                    expectedResult: [
                        'La pantalla de revisión muestra la opción "Editar mascota" (a diferencia del flujo de 1 mascota).',
                        'Al cambiar de mascota, la revisión refleja la nueva mascota y conserva fecha/hora y motivo ya cargados.',
                        'Se muestra la pantalla de confirmación y el turno queda visible como próximo turno en el home.',
                    ],
                });

                await step('1. Iniciar la solicitud, seleccionar la primera mascota y completar motivo, adjuntos y día/horario.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.selectPet();
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                    await container.vetify.webapp.videocallFormPage.selectReason('Vacunas');
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                    await container.vetify.webapp.videocallFormPage.skipAttachments();
                    const dayOffset = getRandomInt(1, 25);
                    await container.vetify.webapp.videocallFormPage.completeDayAndTime(DateTime.now().plus({ days: dayOffset }));
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });

                await step('La pantalla de revisión muestra la opción "Editar mascota" (a diferencia del flujo de 1 mascota).', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyReviewScreenMultiPet();
                });

                let originalPetName = '';
                await step('2. Desde la revisión, editar la mascota seleccionada y elegir una distinta.', async () => {
                    originalPetName = await container.vetify.webapp.videocallFormPage.reviewMascotaLbl.innerText();
                    await container.vetify.webapp.videocallFormPage.changeSelectedPetFromReview(originalPetName);
                });
                await step('Al cambiar de mascota, la revisión refleja la nueva mascota y conserva fecha/hora y motivo ya cargados.', async () => {
                    await expect(container.vetify.webapp.videocallFormPage.reviewMascotaLbl).not.toHaveText(originalPetName);
                    await expect(container.vetify.webapp.videocallFormPage.reviewFechaHoraLbl).not.toHaveText('-');
                    await expect(container.vetify.webapp.videocallFormPage.reviewMotivoLbl).toHaveText('Vacunas y desparasitación');
                });

                await step('3. Confirmar el turno desde la revisión.', async () => {
                    await container.vetify.webapp.videocallFormPage.confirmVideocall();
                });
                await step('Se muestra la pantalla de confirmación y el turno queda visible como próximo turno en el home.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyConfirmationScreen();
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                    await container.vetify.webapp.homePage.verifyUpcomingVideocallVisible();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test.beforeEach(async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();

                await step('El usuario se encuentra en la pantalla de selección de motivo.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.verifyReasonScreenVisible();
                });
            });

            test('TC-10 - [Negativo] Videollamada - Vetify - "Otro motivo" vuelve obligatorio el comentario adicional', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['El usuario se encuentra en la pantalla de selección de motivo.'],
                    steps: ['Seleccionar "Otro motivo" del listado.', 'Intentar continuar sin completar "Comentarios adicionales".', 'Completar "Comentarios adicionales".'],
                    expectedResult: [
                        'El campo "Comentarios adicionales" se marca como obligatorio y "Continuar" queda deshabilitado.',
                        'Al completar el comentario, "Continuar" se habilita.',
                    ],
                });

                await step('1. Seleccionar "Otro motivo" del listado.', async () => {
                    await container.vetify.webapp.videocallFormPage.selectReason('Otro motivo');
                });
                await step('El campo "Comentarios adicionales" se marca como obligatorio y "Continuar" queda deshabilitado.', async () => {
                    await expect(container.vetify.webapp.videocallFormPage.additionalCommentsRequiredLbl).toBeVisible();
                    await expect(container.vetify.webapp.videocallFormPage.continueBtn).toBeDisabled();
                });

                await step('2. Completar "Comentarios adicionales".', async () => {
                    await container.vetify.webapp.videocallFormPage.additionalCommentsInput.fill('Comentario de prueba');
                });
                await step('Al completar el comentario, "Continuar" se habilita.', async () => {
                    await expect(container.vetify.webapp.videocallFormPage.continueBtn).toBeEnabled();
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-04 IMAS-3909 - Límites de turnos por mascota / cupo / OSDE Capitado
    // =========================================================================
    test.describe('TS-04 IMAS-3909 - Límites de turnos por mascota / cupo / OSDE Capitado', () => {
        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            let limitedPetName = '';

            test.beforeEach(async ({ container, page }) => {
                // Precondición real de CA01: la mascota ya tiene 2 turnos agendados (el máximo). Se
                // genera vía API (scheduleVideocall) en vez de recorrer la UI 2 veces — confirmado
                // contra QA real vía MCP antes de automatizar (mismo modal, mismo texto exacto).
                // Fecha explícita (no el default de scheduleVideocall): su offset aleatorio por defecto
                // (hasta ~3 meses + 10 días) puede caer fuera de la ventana real de 30 días, dejando la
                // disponibilidad vacía y el "rango" en undefined — confirmado como causa real de un 200
                // que en realidad fallaba con "Error scheduling a videocall" al automatizar este test.
                // Reintento (toPass): el endpoint puede responder 422 "Horario no disponible" de forma
                // intermitente (ej. colisión de horario con otro test corriendo en paralelo sobre el
                // mismo usuario pooled) — confirmado al automatizar, reintentar con un horario nuevo
                // (aleatorio en cada llamada) lo resuelve.
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                const [pet] = await apiClient.getUserPets();
                limitedPetName = pet.mascota.nombre;
                await expect(async () => {
                    await apiClient.scheduleVideocall({ petId: pet.id, date: DateTime.now().plus({ days: 3 }).toISO()! });
                }).toPass();
                await expect(async () => {
                    await apiClient.scheduleVideocall({ petId: pet.id, date: DateTime.now().plus({ days: 7 }).toISO()! });
                }).toPass();
            });

            test('TC-01 - [Negativo] Videollamada - Vetify - Bloqueo por límite de turnos por mascota (CA01, CA02, CA03)', { tag: ['@critical'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con una única mascota que ya tiene 2 videollamadas agendadas (el máximo permitido).'],
                    steps: ['Ir a Videollamada.', 'Intentar iniciar una nueva solicitud de videollamada.', 'Cerrar el modal de bloqueo.'],
                    expectedResult: [
                        'La pantalla de entrada muestra "Tus turnos" con los 2 turnos ya agendados.',
                        'Al intentar agendar, se bloquea con un modal indicando el límite alcanzado para esa mascota.',
                        'Al cerrar el modal, el usuario permanece en la pantalla con "Tus turnos" visible, sin perder acceso a sus turnos.',
                    ],
                });

                await step('1. Ir a Videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                });
                await step('La pantalla de entrada muestra "Tus turnos" con los 2 turnos ya agendados.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyExistingTurnosCount(2);
                });

                await step('2. Intentar iniciar una nueva solicitud de videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.attemptScheduleAndVerifyPetLimitBlocked(limitedPetName);
                });

                await step('3. Cerrar el modal de bloqueo.', async () => {
                    await container.vetify.webapp.videocallFormPage.closeLimitReachedDialog();
                });
                await step('Al cerrar el modal, el usuario permanece en la pantalla con "Tus turnos" visible, sin perder acceso a sus turnos.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyExistingTurnosCount(2);
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 2,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            // @unstable 2026-08-20: flaky bajo condiciones reales de CI (falla en el primer intento,
            // pasa en el retry) — ver qa-workspace/decision-log.md.
            test('TC-02 - Videollamada - Vetify - El límite de turnos aplica solo a la mascota seleccionada (CA07, multi-mascota)', { tag: ['@critical', '@unstable'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con más de una mascota; una de ellas ya tiene 2 videollamadas agendadas (el máximo permitido), la otra no tiene ninguna.'],
                    steps: [
                        'Agotar el límite de turnos de la primera mascota.',
                        'Iniciar una solicitud y elegir esa misma mascota (en el límite).',
                        'Volver al selector y elegir la otra mascota (sin turnos agendados).',
                    ],
                    expectedResult: [
                        'Se bloquea únicamente para la mascota en el límite.',
                        'El flujo continúa con normalidad para la otra mascota, sin que el límite de la primera la afecte.',
                    ],
                });

                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                const pets = await apiClient.getUserPets();
                // Verificación de estado real 2026-09-04: cuenta pooled compartida, puede tener menos de
                // 2 mascotas reales ahora mismo (drift de estado u outage de backend, ver docs/bugs/BUG-033)
                // — sin esto, petB queda undefined y el test rompe 180s después con un error confuso.
                test.skip(pets.length < 2, `La cuenta de prueba tiene ${pets.length} mascota(s) reales ahora mismo, se necesitan 2 para este caso (CA07).`);
                const [petA, petB] = pets;

                await step('1. Agotar el límite de turnos de la primera mascota.', async () => {
                    // Reintento (toPass): ver nota en el beforeEach de TC-01 sobre el 422 intermitente.
                    await expect(async () => {
                        await apiClient.scheduleVideocall({ petId: petA.id, date: DateTime.now().plus({ days: 3 }).toISO()! });
                    }).toPass();
                    await expect(async () => {
                        await apiClient.scheduleVideocall({ petId: petA.id, date: DateTime.now().plus({ days: 7 }).toISO()! });
                    }).toPass();
                });

                await step('2. Iniciar una solicitud y elegir esa misma mascota (en el límite).', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.selectPet(petA.mascota.nombre);
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });
                await step('Se bloquea únicamente para la mascota en el límite.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyPetLimitBlockedDialog(petA.mascota.nombre);
                    await container.vetify.webapp.videocallFormPage.closeLimitReachedDialog();
                });

                await step('3. Volver al selector y elegir la otra mascota (sin turnos agendados).', async () => {
                    await container.vetify.webapp.videocallFormPage.selectPet(petB.mascota.nombre);
                    await container.vetify.webapp.videocallFormPage.clickContinue();
                });
                await step('El flujo continúa con normalidad para la otra mascota, sin que el límite de la primera la afecte.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyReasonScreenWithSelectedPet();
                });
            });
        });

        // NOTA IMPORTANTE 2026-08-05: esta suite se automatizó inicialmente contra una lectura de la HU
        // (vía API de Jira) que incluía CA04-CA08 (límite anual OSDE Capitado/Flux Capitado + analítica).
        // El usuario del proyecto confirmó, mirando el ticket en vivo en Jira, que la HU REAL solo tiene
        // CA01-CA04 — el "Objetivo" dice explícitamente "Quedará para más adelante la restricción de
        // capitados osde" (descopeado a otro ticket, IMAS-4038, listado en "Actividades vinculadas"). La
        // lectura por API mostraba contenido desactualizado por motivos no determinados (posible delta de
        // sincronización de Jira). CA04 real ("Mascota asociada al turno") es exactamente lo que antes se
        // documentaba como CA07 — ya cubierto por TC-02. No queda ningún CA de esta HU sin cubrir; se
        // retiran los placeholders de brecha de cobertura que existían para el límite capitado y la
        // analítica, que ya no son parte del alcance de IMAS-3909.
    });

    // =========================================================================
    // CATEGORY: TS-05 IMAS-3894 - Visualización, reprogramación, cancelación e ingreso a turno
    // =========================================================================
    test.describe('TS-05 IMAS-3894 - Visualización, reprogramación, cancelación e ingreso a turno', () => {
        test.describe(() => {
            // TC-01/02/03 comparten el mismo usuario pooled (reserve: false) y cada uno depende de ser
            // el ÚNICO turno agendado en ese momento (conteo exacto, "próximo turno" del Home) — a
            // diferencia de TS-02/03/04 que solo verifican existencia/creación (tolerantes a la carrera),
            // acá una carrera real entre tests hermanos rompe la aserción. Serial evita esa carrera.
            test.describe.configure({ retries: 0, mode: 'serial' });

            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            let assistanceId = '';
            let petName = '';
            const reason = 'Vacunas y desparasitación';

            test.beforeEach(async ({ container, page }) => {
                // Precondición real de CA01/CA02: un turno futuro ya agendado, fuera de la ventana de 5
                // min de "Ingresar" (CA05) y fuera de los 30 min de "no cancelable" — se genera vía API
                // en vez de recorrer el wizard de agendamiento (ya cubierto en TS-02/TS-03). Reintento
                // (toPass): mismo 422 intermitente documentado en TS-04.
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                const [pet] = await apiClient.getUserPets();
                petName = pet.mascota.nombre;
                await expect(async () => {
                    const result = await apiClient.scheduleVideocall({ petId: pet.id, date: DateTime.now().plus({ days: 5 }).toISO()!, reason });
                    assistanceId = result.assistanceId;
                }).toPass();
            });

            test('TC-01 - Videollamada - Vetify - Aviso en Home y detalle del turno (CA01, CA02)', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un turno de videollamada futuro ya agendado.'],
                    steps: ['Ir a la Home.', 'Presionar "Ir al detalle" desde el aviso de turno.', 'Abrir el detalle del turno agendado.'],
                    expectedResult: [
                        'La Home muestra un aviso destacado con la fecha/hora del turno más próximo.',
                        'El aviso permite acceder a la pantalla de turnos.',
                        'El detalle del turno muestra mascota, fecha/hora y motivo correctos, con "Ingresar" deshabilitado y "Cancelar" habilitado.',
                    ],
                });

                await step('1. Ir a la Home.', async () => {
                    await Promise.all([container.vetify.webapp.homePage.waitForPageLoaded(), container.vetify.webapp.homePage.load()]);
                });
                await step('La Home muestra un aviso destacado con la fecha/hora del turno más próximo.', async () => {
                    await container.vetify.webapp.homePage.verifyUpcomingVideocallVisible();
                });

                // Confirmado vía MCP y por esta corrida: con un único turno agendado, "Ir al detalle"
                // navega DIRECTO al detalle de ese turno (`/petsAssistance/{id}`) en vez de pasar por la
                // lista "Tus turnos" (`/service/493/create/questions`) — esa lista intermedia solo se vio
                // en la exploración manual con 2+ turnos agendados. Se acepta cualquiera de los dos
                // destinos válidos en vez de asumir uno solo.
                await step('2. Presionar "Ir al detalle" desde el aviso de turno.', async () => {
                    await container.vetify.webapp.homePage.goToVideocallDetailBtn.click();
                });
                await step('El aviso permite acceder a la pantalla de turnos.', async () => {
                    await page.waitForURL(/\/(petsAssistance\/|service\/493\/create\/questions)/);
                });

                await step('3. Abrir el detalle del turno agendado.', async () => {
                    const detailPage = container.vetify.webapp.createVideocallViewPage(assistanceId);
                    await detailPage.load();
                    await detailPage.waitForPageLoaded();
                    await step('El detalle del turno muestra mascota, fecha/hora y motivo correctos, con "Ingresar" deshabilitado y "Cancelar" habilitado.', async () => {
                        await detailPage.verifyDetail({ petName, reason });
                        await detailPage.verifyEnterButtonDisabled();
                        await detailPage.verifyCancelButtonEnabled();
                    });
                });
            });

            test('TC-02 - Videollamada - Vetify - Reprogramación del turno (CA04)', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un turno de videollamada futuro ya agendado.'],
                    steps: ['Abrir el detalle del turno y presionar "Reprogramar".', 'Seleccionar un nuevo día y horario.', 'Confirmar la reprogramación.'],
                    expectedResult: [
                        'El sistema reutiliza mascota y motivo ya cargados, pidiendo solo el nuevo día/horario.',
                        'Se muestra la pantalla de confirmación con la nueva fecha/hora.',
                        'El detalle del turno refleja la nueva fecha/hora reprogramada.',
                    ],
                });

                const detailPage = container.vetify.webapp.createVideocallViewPage(assistanceId);
                await step('1. Abrir el detalle del turno y presionar "Reprogramar".', async () => {
                    await detailPage.load();
                    await detailPage.waitForPageLoaded();
                    await detailPage.startReschedule();
                });

                const reschedulePage = container.vetify.webapp.createRescheduleVideocallPage(assistanceId);
                const newDate = DateTime.now().plus({ days: 10 });
                await step('2. Seleccionar un nuevo día y horario.', async () => {
                    await reschedulePage.completeDayAndTime(newDate);
                });
                await step('El sistema reutiliza mascota y motivo ya cargados, pidiendo solo el nuevo día/horario.', async () => {
                    await reschedulePage.verifyReviewScreen();
                });

                await step('3. Confirmar la reprogramación.', async () => {
                    await reschedulePage.confirmReschedule();
                });
                await step('Se muestra la pantalla de confirmación con la nueva fecha/hora.', async () => {
                    await reschedulePage.verifyConfirmationScreen();
                });

                // Verificado por API (no por el banner "próximo turno" del Home): el usuario pooled se
                // comparte con otros describe blocks del spec que pueden agendar turnos más próximos en
                // paralelo — el banner solo muestra EL más cercano, no necesariamente el de este test.
                await step('El detalle del turno refleja la nueva fecha/hora reprogramada.', async () => {
                    const apiClient = await container.vetify.getApiClient(page);
                    await expect(async () => {
                        const scheduled = await apiClient.getScheduledVideocalls();
                        const rescheduled = scheduled.find((s: any) => s.state === 'PROGRAMMED' && DateTime.fromMillis(s.date).hasSame(newDate, 'day'));
                        expect(rescheduled, `Debe existir un turno PROGRAMMED en la fecha reprogramada (${newDate.toFormat('yyyy-MM-dd')}). Turnos actuales: ${JSON.stringify(scheduled)}`).toBeDefined();
                    }).toPass();
                });
            });

            // @unstable 2026-08-20: falla de forma consistente incluso con caché de login limpia y
            // condiciones representativas de CI (2 workers + retry) — ver qa-workspace/decision-log.md.
            // Pendiente de diagnóstico real antes de sacar el tag.
            test('TC-03 - Videollamada - Vetify - Cancelación del turno (CA03)', { tag: ['@critical', '@unstable'] }, async ({ container }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un turno de videollamada futuro ya agendado.'],
                    steps: ['Abrir el detalle del turno y presionar "Cancelar".', 'Verificar el contenido del modal de doble check.', 'Confirmar la cancelación.'],
                    expectedResult: [
                        'El modal solicita confirmación con el copy exacto de doble check.',
                        'Al confirmar, el turno se cancela y se muestra la pantalla de confirmación de cancelación.',
                    ],
                });

                const detailPage = container.vetify.webapp.createVideocallViewPage(assistanceId);
                await step('1. Abrir el detalle del turno y presionar "Cancelar".', async () => {
                    await detailPage.load();
                    await detailPage.waitForPageLoaded();
                    await detailPage.startCancel();
                });

                const cancelModal = container.vetify.webapp.createCancelVideocallModal(assistanceId);
                await step('El modal solicita confirmación con el copy exacto de doble check.', async () => {
                    await cancelModal.verifyModalContent();
                });

                await step('2-3. Confirmar la cancelación.', async () => {
                    await cancelModal.confirmCancelation();
                });
                await step('Al confirmar, el turno se cancela y se muestra la pantalla de confirmación de cancelación.', async () => {
                    await cancelModal.verifyCancellationConfirmed();
                });
            });
        });

        // IMAS-3894 CA05/CA06-CA08/CA09 (habilitación "Ingresar" en ventana de 5 min, sala de espera,
        // comunicaciones) — descartados permanentemente 2026-09-08, no automatizables. Detalle completo
        // en docs/backlog-automatizacion.md ("Descartado permanentemente").

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.VETIFY_ADQUIRENTE,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            // @unstable 2026-08-20: flaky bajo condiciones reales de CI (falla en el primer intento,
            // pasa en el retry) — ver qa-workspace/decision-log.md.
            test('TC-07 - [Regresión] Videollamada - Vetify - Turno reprogramado no ofrece acciones habilitadas en la assistanceId anterior (BUG-003/IMAS-4119)', { tag: ['@critical', '@unstable'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con un turno de videollamada futuro ya agendado.'],
                    steps: ['Reprogramar el turno.', 'Volver a abrir el detalle de la assistanceId original (ya reemplazada/cancelada por la reprogramación).'],
                    expectedResult: [
                        'La reprogramación genera una assistanceId nueva y deja la original en estado CANCELADO.',
                        'El detalle de la assistanceId original ya no ofrece "Ingresar", "Reprogramar" ni "Cancelar" como si el turno siguiera vigente.',
                    ],
                });

                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                const [pet] = await apiClient.getUserPets();

                let oldAssistanceId = '';
                await step('Precondición: agendar un turno futuro.', async () => {
                    await expect(async () => {
                        const result = await apiClient.scheduleVideocall({ petId: pet.id, date: DateTime.now().plus({ days: 5 }).toISO()! });
                        oldAssistanceId = result.assistanceId;
                    }).toPass();
                });

                await step('1. Reprogramar el turno.', async () => {
                    const detailPage = container.vetify.webapp.createVideocallViewPage(oldAssistanceId);
                    await detailPage.load();
                    await detailPage.waitForPageLoaded();
                    await detailPage.startReschedule();

                    const reschedulePage = container.vetify.webapp.createRescheduleVideocallPage(oldAssistanceId);
                    await reschedulePage.completeDayAndTime(DateTime.now().plus({ days: 12 }));
                    await reschedulePage.verifyReviewScreen();
                    await reschedulePage.confirmReschedule();
                    await reschedulePage.verifyConfirmationScreen();
                });

                await step('La reprogramación genera una assistanceId nueva y deja la original en estado CANCELADO.', async () => {
                    await expect(async () => {
                        const oldState = await apiClient.getScheduledVideoCallById(oldAssistanceId);
                        expect(oldState.estado, `La assistanceId original debe quedar CANCELADO tras reprogramar. Estado actual: ${JSON.stringify(oldState)}`).toBe('CANCELADO');
                    }).toPass();
                });

                await step('2. Volver a abrir el detalle de la assistanceId original (ya reemplazada/cancelada por la reprogramación).', async () => {
                    const oldDetailPage = container.vetify.webapp.createVideocallViewPage(oldAssistanceId);
                    await oldDetailPage.load();
                    await oldDetailPage.waitForPageLoaded();

                    await step('El detalle de la assistanceId original ya no ofrece "Ingresar", "Reprogramar" ni "Cancelar" como si el turno siguiera vigente.', async () => {
                        await oldDetailPage.verifyAllActionsDisabled();
                    });
                });
            });
        });
    });

    // =========================================================================
    // CATEGORY: TS-06 IMAS-4546 - Cupo de videollamadas parametrizable por plan
    // =========================================================================
    // A diferencia de TS-04 (IMAS-3909, previo a esta HU), que ya automatizaba el "motor" del bloqueo
    // por límite de turnos (mismo modal, mismo texto exacto), esta categoría cubre lo que IMAS-4546
    // agrega de nuevo: el contador "Cupo disponible: X de Y" visible en la pantalla de Motivo y en el
    // selector multi-mascota, el estado ilimitado sin ningún contador (AC1), y la regla de cancelación
    // que restituye el cupo. Todo confirmado vía MCP contra QA real 2026-09-18/19 antes de automatizar
    // (ver docs/user-stories/IMAS-4546-limitar-videollamadas.tests.md).
    test.describe('TS-06 IMAS-4546 - Cupo de videollamadas parametrizable por plan', () => {
        test.describe(() => {
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

            test('TC-01 - Videollamada - Vetify - Plan ilimitado no muestra contador de cupo (AC1 IMAS-4546)', { tag: ['@critical'] }, async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                const pets = (await apiClient.getUserPets()).filter((p: any) => p.mascota);
                const unlimitedPets = [];
                for (const pet of pets) {
                    const cobertura = await apiClient.getVideollamadaCobertura(pet.id);
                    if (cobertura.limite >= 100) unlimitedPets.push(pet);
                }
                // El pool no distingue plan Emergencias/Cachorro (ilimitado) de otros planes Vetify
                // Adquirente limitados bajo el mismo tag ACTIVE+WITH_PET (confirmado: ningún tag del
                // fixture captura el producto/plan real) — se verifica en vivo contra el endpoint real
                // de cobertura en vez de asumir el producto por el tag.
                test.skip(unlimitedPets.length === 0, 'La cuenta asignada por el pool no tiene ninguna mascota con plan ilimitado (limite:100) ahora mismo.');
                const targetPet = unlimitedPets[0];

                await setAllureDetails({
                    preconditions: ['Usuario con una mascota en un plan de videollamadas ilimitado (ej. Emergencias/Cachorro).'],
                    steps: ['Iniciar una nueva solicitud de videollamada.', 'Llegar a la pantalla de motivo con esa mascota seleccionada.'],
                    expectedResult: ['No se muestra ningún contador ni límite de videollamadas — se mantiene la experiencia actual.'],
                });

                await step('1. Iniciar una nueva solicitud de videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                });
                await step('2. Llegar a la pantalla de motivo con esa mascota seleccionada.', async () => {
                    // La cuenta puede tener más de 1 mascota real pese al tag del pool (ver nota
                    // arriba) — si aparece el selector, se elige puntualmente la mascota ilimitada ya
                    // verificada por API en vez de confiar en cuál queda primera en la lista.
                    if (await container.vetify.webapp.videocallFormPage.petSelectorHeadingLbl.isVisible().catch(() => false)) {
                        await container.vetify.webapp.videocallFormPage.selectPet(targetPet.mascota.nombre);
                        await container.vetify.webapp.videocallFormPage.clickContinue();
                    }
                    await container.vetify.webapp.videocallFormPage.verifyReasonScreenVisible();
                });
                await step('No se muestra ningún contador ni límite de videollamadas — se mantiene la experiencia actual.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyNoCupoCounterShown();
                });
            });
        });

        test.describe(() => {
            // TC-02/03/04 comparten el mismo usuario pooled (reserve: false) y cada uno depende del
            // conteo EXACTO de turnos agendados sobre esa mascota en un momento dado — mismo patrón
            // que TS-05 (IMAS-3894): una carrera real entre tests hermanos rompe la aserción (ya
            // reprodujo en la primera corrida: TC-03 chocó con turnos que TC-02/TC-04 agendaban en
            // paralelo sobre el mismo petId). Serial evita esa carrera.
            test.describe.configure({ retries: 0, mode: 'serial' });

            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.OSDE_CAPITADO,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 1,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            let limite = 0;
            let disponibleBaseline = 0;
            let petId = '';

            test.beforeEach(async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                const [pet] = await apiClient.getUserPets();
                petId = pet.id;
                const cobertura = await apiClient.getVideollamadaCobertura(petId);
                // OSDE Capitado Esencial es el único producto con límite real hoy (ver HU) — un skip
                // honesto si la cuenta del pool resultara ilimitada, en vez de asumirlo ciegamente.
                test.skip(cobertura.limite >= 100, 'La cuenta OSDE Capitado asignada por el pool tiene un plan ilimitado ahora mismo, no sirve para validar el contador de cupo.');
                limite = cobertura.limite;
                // No se asume que "sin turnos agendados" (tras cancelAllScheduledVideocalls) equivale a
                // "cupo completo" — confirmado en vivo 2026-09-19: esta cuenta compartida del pool quedó
                // con 1 de 2 disponible por uso acumulado de sesiones anteriores de QA sobre esta misma
                // HU (una videollamada real ya CONSUMIDA no libera cupo, a diferencia de una cancelada a
                // tiempo). Se lee el baseline real por API en vez de asumirlo, y TC-02 se salta si ya no
                // queda margen para mostrar el delta "sin consumidas → con consumidas".
                disponibleBaseline = cobertura.disponible;
            });

            test('TC-02 - Videollamada - Vetify - Contador de cupo "sin consumidas" y "con consumidas" (AC2 IMAS-4546)', { tag: ['@critical'] }, async ({ container, page }) => {
                // Con disponibleBaseline < 2, agendar 1 más lleva el cupo a 0 — y en 0 el flujo bloquea
                // en la pantalla de entrada (mismo modal de TC-03/TS-04) antes de llegar a la pantalla
                // de Motivo, así que nunca se ve el texto "Cupo disponible: 0 de X" (confirmado en vivo
                // 2026-09-19: el locator no encuentra el párrafo en absoluto en ese estado). Hace falta
                // al menos 2 disponibles para demostrar la transición N→N-1 sin caer en ese borde.
                test.skip(disponibleBaseline < 2, 'La cuenta OSDE Capitado del pool no tiene margen (≥2 disponibles) por uso acumulado de sesiones previas — agendar 1 más caería directo al estado "sin disponibles" (ver TC-03) en vez de mostrar "con consumidas".');

                await setAllureDetails({
                    preconditions: ['Usuario OSDE Capitado Esencial con cupo disponible (no necesariamente el máximo del plan, ver nota en el beforeEach).'],
                    steps: [
                        'Iniciar una nueva solicitud de videollamada y llegar a la pantalla de motivo.',
                        'Agendar 1 videollamada sin consumirla y volver a "Agendar nueva videollamada".',
                    ],
                    expectedResult: [
                        'El contador informa el disponible real reportado por el backend.',
                        'El contador baja en 1 apenas se agenda el turno, aunque no se haya consumido (Caso especial 01).',
                    ],
                });

                await step('1. Iniciar una nueva solicitud de videollamada y llegar a la pantalla de motivo.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                });
                await step('El contador informa el disponible real reportado por el backend.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyCupoDisponible(disponibleBaseline, limite);
                });

                await step('2. Agendar 1 videollamada sin consumirla y volver a "Agendar nueva videollamada".', async () => {
                    const apiClient = await container.vetify.getApiClient(page);
                    await expect(async () => {
                        await apiClient.scheduleVideocall({ petId, date: DateTime.now().plus({ days: 5 }).toISO()! });
                    }).toPass();
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                });
                await step('El contador baja en 1 apenas se agenda el turno, aunque no se haya consumido (Caso especial 01).', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyCupoDisponible(disponibleBaseline - 1, limite);
                });
            });

            test('TC-03 - Videollamada - Vetify - Sin disponibles bloquea el agendado, en OSDE Capitado (AC2 IMAS-4546)', { tag: ['@critical'] }, async ({ container, page }) => {
                test.skip(disponibleBaseline === 0, 'El cupo ya está en 0 antes de empezar este test — nada que agotar (probablemente ya bloquea, pero no demuestra la transición).');

                // Hay 2 modales de bloqueo distintos, confirmados en vivo 2026-09-19 — cuál aparece
                // depende de si además de agotarse el cupo anual también se llega a 2 turnos
                // CONCURRENTEMENTE agendados: con disponibleBaseline===limite (cuenta "fresca", ej. 2
                // de 2) ambas condiciones se cumplen a la vez y gana el modal viejo de IMAS-3909
                // ("Superaste el límite... por mascota", ya automatizado en TS-04 — esto confirma que
                // ese mecanismo también aplica a OSDE Capitado, no solo a Vetify Adquirente). Con
                // disponibleBaseline<limite (cuenta con cupo ya parcialmente usado de antes) se agendan
                // menos turnos concurrentes que el máximo, y el que se ve es el modal NUEVO de esta HU
                // ("Alcanzaste el límite de X videollamadas anuales").
                const expectAnnualCupoModal = disponibleBaseline < limite;

                await setAllureDetails({
                    preconditions: ['Usuario OSDE Capitado Esencial con el límite de videollamadas ya alcanzado.'],
                    steps: ['Agotar el cupo disponible agendando esa cantidad de videollamadas.', 'Intentar agendar una nueva videollamada.'],
                    expectedResult: [
                        'El backend confirma 0 disponibles para esa mascota.',
                        'El sistema bloquea con el modal correspondiente según si también se llega a 2 turnos concurrentes.',
                    ],
                });

                const apiClient = await container.vetify.getApiClient(page);
                let petName = '';
                await step('1. Agotar el cupo disponible agendando esa cantidad de videollamadas.', async () => {
                    const [pet] = await apiClient.getUserPets();
                    petName = pet.mascota.nombre;
                    for (let i = 0; i < disponibleBaseline; i++) {
                        await expect(async () => {
                            await apiClient.scheduleVideocall({ petId, date: DateTime.now().plus({ days: 3 + i }).toISO()! });
                        }).toPass();
                    }
                });
                await step('El backend confirma 0 disponibles para esa mascota.', async () => {
                    const cobertura = await apiClient.getVideollamadaCobertura(petId);
                    expect(cobertura.disponible).toBe(0);
                });

                await step('2. Intentar agendar una nueva videollamada.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                });
                await step('El sistema bloquea con el modal correspondiente según si también se llega a 2 turnos concurrentes.', async () => {
                    if (expectAnnualCupoModal) {
                        await container.vetify.webapp.videocallFormPage.attemptScheduleAndVerifyAnnualCupoBlocked();
                    } else {
                        await container.vetify.webapp.videocallFormPage.attemptScheduleAndVerifyPetLimitBlocked(petName);
                    }
                });
            });

            test('TC-04 - Videollamada - Vetify - Cancelar con más de 30 min de anticipación restituye el cupo (AC2 IMAS-4546)', { tag: ['@critical'] }, async ({ container, page }) => {
                test.skip(disponibleBaseline === 0, 'El cupo ya está en 0 antes de empezar este test — no se puede agendar el turno que después se cancela.');

                await setAllureDetails({
                    preconditions: ['Usuario OSDE Capitado Esencial con 1 videollamada agendada con varios días de anticipación.'],
                    steps: ['Agendar una videollamada futura.', 'Cancelarla desde el detalle del turno.'],
                    expectedResult: [
                        'El cupo disponible baja en 1 al agendar.',
                        'Al cancelar con más de 30 minutos de anticipación, el cupo disponible vuelve a su valor previo al agendado.',
                    ],
                });

                const apiClient = await container.vetify.getApiClient(page);
                let assistanceId = '';
                await step('1. Agendar una videollamada futura.', async () => {
                    await expect(async () => {
                        const result = await apiClient.scheduleVideocall({ petId, date: DateTime.now().plus({ days: 5 }).toISO()! });
                        assistanceId = result.assistanceId;
                    }).toPass();
                });
                await step('El cupo disponible baja en 1 al agendar.', async () => {
                    const cobertura = await apiClient.getVideollamadaCobertura(petId);
                    expect(cobertura.disponible).toBe(disponibleBaseline - 1);
                });

                await step('2. Cancelarla desde el detalle del turno.', async () => {
                    const detailPage = container.vetify.webapp.createVideocallViewPage(assistanceId);
                    await detailPage.load();
                    await detailPage.waitForPageLoaded();
                    await detailPage.startCancel();
                    const cancelModal = container.vetify.webapp.createCancelVideocallModal(assistanceId);
                    await cancelModal.confirmCancelation();
                    await cancelModal.verifyCancellationConfirmed();
                });
                await step('Al cancelar con más de 30 minutos de anticipación, el cupo disponible vuelve a su valor previo al agendado.', async () => {
                    await expect(async () => {
                        const cobertura = await apiClient.getVideollamadaCobertura(petId);
                        expect(cobertura.disponible).toBe(disponibleBaseline);
                    }).toPass();
                });
            });
        });

        test.describe(() => {
            test.use({
                userRequest: {
                    source: UserSource.Pooled,
                    siteId: SiteId.OSDE_CAPITADO,
                    tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
                    numberOfPlans: 2,
                    reserve: false,
                    ignoreReserved: true,
                },
            });

            test.beforeEach(async ({ container, page }) => {
                const apiClient = await container.vetify.getApiClient(page);
                await apiClient.cancelAllScheduledVideocalls();
                const pets = await apiClient.getUserPets();
                // Mismo patrón de skip honesto que TS-04/TC-02: la cuenta multi-mascota es compartida,
                // puede tener menos de 2 mascotas reales en este momento.
                test.skip(pets.length < 2, `La cuenta de prueba tiene ${pets.length} mascota(s) reales ahora mismo, se necesitan 2+ para Caso especial 02.`);
            });

            test('TC-05 - Videollamada - Vetify - Cupo independiente por mascota en cuentas multi-mascota (Caso especial 02, IMAS-4546)', { tag: ['@critical'] }, async ({ container, page }) => {
                await setAllureDetails({
                    preconditions: ['Usuario con 2+ mascotas, todas en plan OSDE Esencial (limitado), sin videollamadas consumidas.'],
                    steps: [
                        'Abrir el selector de mascota al agendar una videollamada y verificar el cupo de cada una.',
                        'Agendar 1 videollamada para la primera mascota (sin consumirla).',
                        'Volver a abrir el selector y verificar que solo bajó el cupo de esa mascota.',
                    ],
                    expectedResult: [
                        'Cada mascota muestra su propio cupo completo, de forma independiente.',
                        'Tras agendar, solo la mascota agendada baja su cupo — la otra queda intacta.',
                    ],
                });

                const apiClient = await container.vetify.getApiClient(page);
                const pets = await apiClient.getUserPets();
                const [petA, petB] = pets;
                const [coberturaA, coberturaB] = await Promise.all([apiClient.getVideollamadaCobertura(petA.id), apiClient.getVideollamadaCobertura(petB.id)]);

                await step('1. Abrir el selector de mascota al agendar una videollamada y verificar el cupo de cada una.', async () => {
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.openPetSelectorDialog();
                });
                await step('Cada mascota muestra su propio cupo completo, de forma independiente.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyCupoInPetSelectorDialog(petA.mascota.nombre, `Cupo disponible: ${coberturaA.limite} de ${coberturaA.limite}`);
                    await container.vetify.webapp.videocallFormPage.verifyCupoInPetSelectorDialog(petB.mascota.nombre, `Cupo disponible: ${coberturaB.limite} de ${coberturaB.limite}`);
                });

                await step('2. Agendar 1 videollamada para la primera mascota (sin consumirla).', async () => {
                    await expect(async () => {
                        await apiClient.scheduleVideocall({ petId: petA.id, date: DateTime.now().plus({ days: 5 }).toISO()! });
                    }).toPass();
                    await container.vetify.webapp.videocallFormPage.load();
                    await container.vetify.webapp.videocallFormPage.startNewVideocallRequest();
                    await container.vetify.webapp.videocallFormPage.openPetSelectorDialog();
                });
                await step('Tras agendar, solo la mascota agendada baja su cupo — la otra queda intacta.', async () => {
                    await container.vetify.webapp.videocallFormPage.verifyCupoInPetSelectorDialog(petA.mascota.nombre, `Cupo disponible: ${coberturaA.limite - 1} de ${coberturaA.limite}`);
                    await container.vetify.webapp.videocallFormPage.verifyCupoInPetSelectorDialog(petB.mascota.nombre, `Cupo disponible: ${coberturaB.limite} de ${coberturaB.limite}`);
                });
            });
        });
    });
});

