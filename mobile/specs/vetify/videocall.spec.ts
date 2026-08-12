import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { expect } from '@wdio/globals';
import { DateTime } from 'luxon';
import { SiteId } from '../../../src/config/environment';
import { getRandomInt } from '../../../src/helpers/automation-utils';
import { UserTag } from '../../../src/providers/user/tags';
import type { TestUser } from '../../../src/providers/user/user-provider';
import { UserProvider, UserSource } from '../../../src/providers/user/user-provider';
import { VetifyMobileWebappApiClient } from '../../api/VetifyMobileWebappApiClient';
import { VetifyMobileAddPetFormPage } from '../../pages/vetify/AddPetFormPage';
import { VetifyMobileCancelVideocallModal } from '../../pages/vetify/CancelVideocallModal';
import { VetifyMobileHomePage } from '../../pages/vetify/HomePage';
import { VetifyMobileLoginPage } from '../../pages/vetify/LoginPage';
import { VetifyMobileRescheduleVideocallPage } from '../../pages/vetify/RescheduleVideocallPage';
import { VetifyMobileVideocallFormPage } from '../../pages/vetify/VideocallFormPage';
import { VetifyMobileVideocallViewPage } from '../../pages/vetify/VideocallViewPage';

// scheduleVideocall() puede responder 422 ("Horario no disponible") de forma intermitente cuando
// coincide con otro proceso agendando sobre el mismo usuario pooled compartido — mismo hallazgo
// que el `toPass()` del original Playwright (TS-04/TS-05). Reintentar con una fecha nueva en cada
// llamada (no la misma) lo resuelve.
async function scheduleWithRetry(apiClient: VetifyMobileWebappApiClient, buildParams: () => Parameters<VetifyMobileWebappApiClient['scheduleVideocall']>[0]) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await apiClient.scheduleVideocall(buildParams());
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

// Portado de tests/projects/vetify-webapp/videocall.spec.ts. Los casos con adjuntos (TS-02 TC-02,
// casi toda TS-03) quedan fuera — bloqueados por IMP-011 (subir un archivo crashea la app,
// docs/impedimentos-bloqueos.md). Las precondiciones vía API SÍ están disponibles desde
// 2026-08-12 (VetifyMobileWebappApiClient, ver decision-log) — TS-01 TC-02, TS-04 y TS-05 quedan
// destrabados para una próxima ronda de esta misma sesión.
describe('TS-01 IMAS-3899 - Solicitud sin credencial cargada', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Videollamada - Vetify - Bloqueo de avance sin credencial vigente', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const videocallFormPage = new VetifyMobileVideocallFormPage();
        const addPetFormPage = new VetifyMobileAddPetFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const hasAnyPlanWithPet = await apiClient.userHasPlanWithPet();
        // IMP-003 (docs/impedimentos-bloqueos.md): el pool no garantiza de forma estable un usuario
        // sin NINGÚN plan con mascota — mismo criterio que el original Playwright, se verifica en
        // vivo en vez de confiar ciegamente en el tag PLAN_WITHOUT_PET.
        if (hasAnyPlanWithPet) {
            this.skip();
        }

        // 1. Iniciar una nueva solicitud de videollamada.
        await videocallFormPage.load();
        await videocallFormPage.startNewVideocallRequest();

        // Resultado esperado: el sistema muestra la pantalla de credencial faltante.
        await videocallFormPage.verifyMissingCredentialScreenVisible();

        // Al presionar "Completar credencial" el sistema redirecciona al formulario de alta de mascota.
        await videocallFormPage.goToCompleteCredential();
        await addPetFormPage.startWarningModalTitle.waitForDisplayed({ timeout: 15_000 });
    });

    it('TC-02 - [Negativo] [API] Videollamada - Vetify - Backend rechaza creación de turno sin credencial vigente', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.PLAN_WITHOUT_PET],
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const planWithoutPet = await apiClient.getPlanWithoutPet();
        if (!planWithoutPet) {
            this.skip();
        }

        // Resultado esperado: el backend rechaza la creación del turno para un plan sin mascota.
        let rejected = false;
        try {
            await apiClient.scheduleVideocall({ petId: planWithoutPet.id });
        } catch {
            rejected = true;
        }
        expect(rejected).toBe(true);
    });
});

describe('TS-02 IMAS-3174 - Rediseño solicitud de turno x 1 mascota', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - Videollamada - Vetify - Flujo feliz completo sin selección de mascota', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const videocallFormPage = new VetifyMobileVideocallFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        // Precondición real: la cuenta pooled compartida puede tener turnos de corridas anteriores
        // sin cancelar — sin vaciarlos primero, "Agendar nueva videollamada" dispara el modal de
        // límite en vez de dejar avanzar al wizard.
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        await apiClient.cancelAllScheduledVideocalls();

        // 1. Iniciar una nueva solicitud de videollamada.
        await videocallFormPage.load();
        await videocallFormPage.startNewVideocallRequest();
        await videocallFormPage.verifyReasonScreenVisible();

        // 2. Ingresar un motivo de texto libre que no arroja coincidencias y luego seleccionar "Vacunas".
        await videocallFormPage.enterFreeTextReason('TextoLibreQueNoExiste123');
        await videocallFormPage.verifyReasonNotFound();
        await videocallFormPage.selectReason('Vacunas');
        await videocallFormPage.clickContinue();

        // 3. Continuar sin adjuntar archivos.
        await videocallFormPage.verifyAttachmentsScreenVisible();
        await videocallFormPage.skipAttachments();

        // 4. Seleccionar un día y horario disponibles.
        await videocallFormPage.verifyDayTimeScreenVisible();
        const dayOffset = getRandomInt(1, 25);
        await videocallFormPage.completeDayAndTime(DateTime.now().plus({ days: dayOffset }));
        await videocallFormPage.clickContinue();

        // Resultado esperado: las 3 franjas horarias quedan disponibles para revisar desde la revisión.
        await videocallFormPage.verifyTimeBandsAvailableFromReview();

        // 5. Confirmar el turno desde la pantalla de revisión.
        await videocallFormPage.verifyReviewScreenSinglePet();
        await videocallFormPage.confirmVideocall();

        // Resultado esperado: pantalla de confirmación del turno.
        await videocallFormPage.verifyConfirmationScreen();

        // Resultado esperado: el turno queda agendado y visible como próximo turno en el home.
        await homePage.load();
        await homePage.waitForLoaded();
        await homePage.verifyUpcomingVideocallVisible();
    });

    it('TC-03 - [Negativo] Videollamada - Vetify - Motivo obligatorio bloquea el avance (CP03 IMAS-3174)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const videocallFormPage = new VetifyMobileVideocallFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        // Precondición real: la cuenta pooled compartida puede tener turnos de corridas anteriores
        // sin cancelar — sin vaciarlos primero, "Agendar nueva videollamada" dispara el modal de
        // límite en vez de dejar avanzar al wizard.
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        await apiClient.cancelAllScheduledVideocalls();

        // Pasos: iniciar una nueva solicitud de videollamada.
        await videocallFormPage.load();
        await videocallFormPage.startNewVideocallRequest();
        await videocallFormPage.verifyReasonScreenVisible();

        // Resultado esperado: "Continuar" permanece deshabilitado mientras el motivo no esté completo.
        await videocallFormPage.verifyReasonRequiredBlocksContinue();
    });
});

describe('TS-03 IMAS-3889 - Adjuntos, calendario y motivo', () => {
    let reservedUser: TestUser | undefined;

    before(() => {
        // Precondición del picker nativo (IMP-011 resuelto, ver BasePage.selectFileViaNativePicker()):
        // el archivo debe existir ya en la galería/almacenamiento del dispositivo/emulador.
        const localPath = path.resolve(process.cwd(), 'src/fixtures/images/dog-profile-photo.jpg');
        const devicePath = '/sdcard/Pictures/qa-attachment-photo.jpg';
        execFileSync('adb', ['push', localPath, devicePath]);
        execFileSync('adb', [
            'shell',
            'am',
            'broadcast',
            '-a',
            'android.intent.action.MEDIA_SCANNER_SCAN_FILE',
            '-d',
            `file://${devicePath}`,
        ]);
    });

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    // Portado de tests/projects/vetify-webapp/videocall.spec.ts TS-03 TC-02 "Adjuntos - Carga y
    // borrado de archivo válido". IMP-011 resuelto vía selector de archivos nativo de Android
    // (ver BasePage.selectFileViaNativePicker()) — a diferencia de foto de mascota/avatar de
    // perfil, el trigger acá no responde a click JS (probado: click simple y una secuencia
    // completa pointerdown/mousedown/pointerup/mouseup/click, ninguno disparó nada) y necesita un
    // tap nativo real, que además abre el selector de archivos completo
    // (`com.google.android.documentsui`) en vez del Photo Picker, porque el input admite
    // imagen+video+pdf, no solo imagen.
    it('TC-02 - Videollamada - Vetify - Adjuntos - Carga y borrado de archivo válido', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const videocallFormPage = new VetifyMobileVideocallFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        await apiClient.cancelAllScheduledVideocalls();

        // Precondición: el usuario se encuentra en la pantalla de adjuntos con el motivo "Vacunas" ya seleccionado.
        await videocallFormPage.load();
        await videocallFormPage.startNewVideocallRequest();
        await videocallFormPage.verifyReasonScreenVisible();
        await videocallFormPage.selectReason('Vacunas');
        await videocallFormPage.clickContinue();
        await videocallFormPage.verifyAttachmentsScreenVisible();

        // Pasos: adjuntar un archivo válido.
        await videocallFormPage.attachFile();

        // Resultado esperado: el sistema muestra el archivo adjuntado correctamente.
        await videocallFormPage.attachedFileNameLbl.waitForDisplayed({ timeout: 10_000 });

        // Pasos: eliminar el archivo adjuntado.
        await videocallFormPage.removeAttachedFile();

        // Resultado esperado: el sistema elimina el archivo adjuntado sin errores.
        await videocallFormPage.attachedFileNameLbl.waitForExist({ timeout: 10_000, reverse: true });
    });

    it('TC-05 - Videollamada - Vetify - Selector de mascota obligatorio (multi-mascota)', async function () {
        // Bloqueado por brecha de datos del pool, no por código: no existe ninguna cuenta sana
        // ACTIVE+WITH_PET+NO_EMPTY_PLAN con numberOfPlans:2 (confirmado en vivo, 2026-08-12 — la
        // única con 2 planes está tageada BROKEN_NO_PLAN y reservada). Mismo patrón ya documentado
        // en known-issues.md para otras combinaciones de tags que no existen en el pool.
        this.skip();
    });

    it('TC-10 - [Negativo] Videollamada - Vetify - "Otro motivo" vuelve obligatorio el comentario adicional', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const videocallFormPage = new VetifyMobileVideocallFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        await apiClient.cancelAllScheduledVideocalls();

        // Precondición: el usuario se encuentra en la pantalla de selección de motivo.
        await videocallFormPage.load();
        await videocallFormPage.startNewVideocallRequest();
        await videocallFormPage.verifyReasonScreenVisible();

        // Pasos: seleccionar "Otro motivo" del listado.
        await videocallFormPage.selectReason('Otro motivo');

        // Resultado esperado: "Comentarios adicionales" se marca obligatorio y "Continuar" queda deshabilitado.
        await videocallFormPage.verifyOtherReasonRequiresComment();

        // Pasos: completar "Comentarios adicionales".
        await videocallFormPage.fillAdditionalComments('Comentario de prueba');

        // Resultado esperado: al completar el comentario, "Continuar" se habilita.
        await videocallFormPage.verifyContinueEnabled();
    });
});

describe('TS-04 IMAS-3909 - Límites de turnos por mascota / cupo / OSDE Capitado', () => {
    let reservedUser: TestUser | undefined;

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    it('TC-01 - [Negativo] Videollamada - Vetify - Bloqueo por límite de turnos por mascota (CA01, CA02, CA03)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();
        const videocallFormPage = new VetifyMobileVideocallFormPage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();

        // Precondición real de CA01: la mascota ya tiene 2 turnos agendados (el máximo permitido).
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        await apiClient.cancelAllScheduledVideocalls();
        const [pet] = await apiClient.getUserPets();
        const limitedPetName = pet.mascota.nombre;

        await scheduleWithRetry(apiClient, () => ({ petId: pet.id, date: DateTime.now().plus({ days: 3 }).toISO()! }));
        await scheduleWithRetry(apiClient, () => ({ petId: pet.id, date: DateTime.now().plus({ days: 7 }).toISO()! }));

        // 1. Ir a Videollamada.
        await videocallFormPage.load();

        // Resultado esperado: la pantalla de entrada muestra "Tus turnos" con los 2 turnos ya agendados.
        await videocallFormPage.verifyExistingTurnosCount(2);

        // 2. Intentar iniciar una nueva solicitud de videollamada.
        await videocallFormPage.attemptScheduleAndVerifyPetLimitBlocked(limitedPetName);

        // 3. Cerrar el modal de bloqueo.
        await videocallFormPage.closeLimitReachedDialog();

        // Resultado esperado: al cerrar el modal, el usuario permanece en "Tus turnos" sin perder acceso.
        await videocallFormPage.verifyExistingTurnosCount(2);
    });

    it('TC-02 - Videollamada - Vetify - El límite de turnos aplica solo a la mascota seleccionada (CA07, multi-mascota)', async function () {
        // Bloqueado por brecha de datos del pool, no por código: no existe ninguna cuenta sana
        // ACTIVE+WITH_PET+NO_EMPTY_PLAN con numberOfPlans:2 (confirmado en vivo, mismo hallazgo
        // documentado para TS-03 TC-05 — ver known-issues.md).
        this.skip();
    });
});

describe('TS-05 IMAS-3894 - Visualización, reprogramación, cancelación e ingreso a turno', () => {
    let reservedUser: TestUser | undefined;
    const reason = 'Vacunas y desparasitación';

    afterEach(() => {
        if (reservedUser) {
            UserProvider.releaseUser(reservedUser);
            reservedUser = undefined;
        }
    });

    // Precondición real de CA01/CA02: un turno futuro ya agendado, fuera de la ventana de 5 min de
    // "Ingresar" (CA05) y fuera de los 30 min de "no cancelable". Se genera vía API en vez de
    // recorrer el wizard de agendamiento (ya cubierto en TS-02/TS-03).
    // Offset de días aleatorio (no fijo en +5): un día fijo puede estar agotado de disponibilidad
    // por corridas previas sobre la misma cuenta pooled compartida — confirmado en vivo, +5 fijo
    // dio 422 "Horario no disponible" 3/3 reintentos seguidos. Con offset aleatorio en cada
    // intento, el reintento sí cambia la fecha objetivo, no solo recalcula la misma.
    async function scheduleTurno(apiClient: VetifyMobileWebappApiClient): Promise<{ assistanceId: string; petName: string }> {
        await apiClient.cancelAllScheduledVideocalls();
        const [pet] = await apiClient.getUserPets();
        const result = await scheduleWithRetry(apiClient, () => ({ petId: pet.id, date: DateTime.now().plus({ days: getRandomInt(5, 20) }).toISO()!, reason }));
        return { assistanceId: result.assistanceId, petName: pet.mascota.nombre };
    }

    it('TC-01 - Videollamada - Vetify - Aviso en Home y detalle del turno (CA01, CA02)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const { assistanceId, petName } = await scheduleTurno(apiClient);

        // 1. Ir a la Home.
        await homePage.load();
        await homePage.waitForLoaded();

        // Resultado esperado: la Home muestra un aviso destacado con el turno más próximo.
        await homePage.verifyUpcomingVideocallVisible();

        // 2-3. Abrir el detalle del turno agendado (navegación directa por assistanceId, en vez de
        // depender de a qué pantalla intermedia lleva "Ir al detalle" — el original Playwright
        // acepta 2 destinos válidos distintos ahí; navegar directo prueba lo mismo que le importa a
        // este caso: CA02, el detalle correcto).
        const detailPage = new VetifyMobileVideocallViewPage(assistanceId);
        await detailPage.load();

        // Resultado esperado: el detalle muestra mascota, fecha/hora y motivo correctos, con
        // "Ingresar" deshabilitado y "Cancelar" habilitado.
        await detailPage.verifyDetail({ petName, reason });
        await detailPage.verifyEnterButtonDisabled();
        await detailPage.verifyCancelButtonEnabled();
    });

    it('TC-02 - Videollamada - Vetify - Reprogramación del turno (CA04)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const { assistanceId } = await scheduleTurno(apiClient);

        // 1. Abrir el detalle del turno y presionar "Reprogramar".
        const detailPage = new VetifyMobileVideocallViewPage(assistanceId);
        await detailPage.load();
        await detailPage.startReschedule();

        const reschedulePage = new VetifyMobileRescheduleVideocallPage(assistanceId);
        await reschedulePage.waitForLoaded();

        // 2. Seleccionar un nuevo día y horario.
        const newDate = DateTime.now().plus({ days: 10 });
        await reschedulePage.completeDayAndTime(newDate);

        // Resultado esperado: reutiliza mascota y motivo ya cargados, pidiendo solo el nuevo día/horario.
        await reschedulePage.verifyReviewScreen();

        // 3. Confirmar la reprogramación.
        await reschedulePage.confirmReschedule();

        // Resultado esperado: pantalla de confirmación con la nueva fecha/hora.
        await reschedulePage.verifyConfirmationScreen();

        // Resultado esperado: el detalle refleja la nueva fecha/hora reprogramada — verificado por
        // API (no por el banner de Home, que solo muestra el turno más próximo entre varios).
        let rescheduled: unknown;
        for (let attempt = 1; attempt <= 3 && !rescheduled; attempt++) {
            const scheduled = await apiClient.getScheduledVideocalls();
            rescheduled = scheduled.find((s: { state: string; date: number }) => s.state === 'PROGRAMMED' && DateTime.fromMillis(s.date).hasSame(newDate, 'day'));
            if (!rescheduled) await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
        if (!rescheduled) throw new Error(`Debe existir un turno PROGRAMMED en la fecha reprogramada (${newDate.toFormat('yyyy-MM-dd')}).`);
    });

    it('TC-03 - Videollamada - Vetify - Cancelación del turno (CA03)', async function () {
        const loginPage = new VetifyMobileLoginPage();
        const homePage = new VetifyMobileHomePage();

        reservedUser = await loginPage.loginWithUserRequest({
            source: UserSource.Pooled,
            siteId: SiteId.VETIFY_ADQUIRENTE,
            tags: [UserTag.ACTIVE, UserTag.WITH_PET, UserTag.NO_EMPTY_PLAN],
            numberOfPlans: 1,
            reserve: false,
            ignoreReserved: true,
        });

        if (!reservedUser) {
            this.skip();
        }

        await homePage.waitForLoaded();
        const apiClient = await VetifyMobileWebappApiClient.getApiClient();
        const { assistanceId } = await scheduleTurno(apiClient);

        // 1. Abrir el detalle del turno y presionar "Cancelar".
        const detailPage = new VetifyMobileVideocallViewPage(assistanceId);
        await detailPage.load();
        await detailPage.startCancel();

        const cancelModal = new VetifyMobileCancelVideocallModal();

        // Resultado esperado: el modal solicita confirmación con el copy exacto de doble check.
        await cancelModal.verifyModalContent();

        // 2-3. Confirmar la cancelación.
        await cancelModal.confirmCancelation();

        // Resultado esperado: el turno se cancela y se muestra la pantalla de confirmación.
        await cancelModal.verifyCancellationConfirmed();
    });

    it('TC-04 - [Brecha de cobertura] IMAS-3894 CA05 - Habilitación de "Ingresar" dentro de la ventana de 5 minutos', function () {
        // El caso negativo (deshabilitado fuera de la ventana) queda cubierto en TC-01. El caso
        // positivo requeriría un turno agendado dentro de los próximos 5 min, lo cual choca con la
        // anticipación mínima de 30 min exigida por el propio wizard de agendamiento — solo
        // alcanzable esperando en tiempo real, no viable en un test automatizado. Mismo criterio
        // que el original Playwright.
        this.skip();
    });

    it('TC-05 - [Fuera de alcance] IMAS-3894 CA06-CA08 - Sala de espera, ingreso y salida de la videoconsulta', function () {
        // Requiere una sesión de videoconferencia real con un profesional del otro lado — no
        // reproducible desde QA automatizado. Mismo criterio que el original Playwright.
        this.skip();
    });

    it('TC-06 - [Fuera de alcance] IMAS-3894 CA09 - Comunicaciones', function () {
        // No hay forma de verificar el envío real de email/push en el pipeline automatizado.
        this.skip();
    });
});
