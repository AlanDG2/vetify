import { $, $$, browser } from '@wdio/globals';
import { DateTime } from 'luxon';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';
import { VetifyMobileVideocallCalendarComponent } from './VideocallCalendarComponent';

// Locators calcados de src/pages/vetify/webapp/videocall/VideocallFormPage.ts (Playwright) donde
// fue posible — los `getByRole` del original no traducen 1:1 a WebdriverIO, así que el texto real
// se confirmó con un dump de DOM en vivo antes de escribir esto (mismo criterio que el resto del
// proyecto mobile), no adivinado.
export class VetifyMobileVideocallFormPage extends VetifyMobileLoggedBasePage {
    readonly calendarComponent = new VetifyMobileVideocallCalendarComponent();

    async load(): Promise<void> {
        await this.navigateTo('/service/493/create/questions?isNow=false');
        await this.scheduleNewVideocallBtn.waitForDisplayed({ timeout: 20_000 });
    }

    get scheduleNewVideocallBtn() {
        return $('//button[contains(., "Agendar nueva videollamada")]');
    }

    // "Tus turnos" aparece en la pantalla de entrada en cuanto el usuario tiene ≥1 turno agendado
    // — confirmado en vivo al construir el cleanup por UI (ver decision-log 2026-08-12).
    get existingTurnosHeadingLbl() {
        return $('//h2[contains(., "Tus turnos")]');
    }

    // Copy real confirmado con un dump en vivo (construyendo el cleanup por UI, ver
    // decision-log 2026-08-12) — CA01/CA02 IMAS-3909.
    get limitReachedDialogHeadingLbl() {
        return $('//p[contains(., "Superaste el límite de videollamadas por mascota")]');
    }

    get limitReachedDialogMessageLbl() {
        return $('//p[contains(., "Ya tenés 2 videollamadas programadas para")]');
    }

    get closeLimitReachedDialogBtn() {
        return $('//button[contains(., "Cerrar")]');
    }

    get missingCredentialHeadingLbl() {
        return $('//h2[contains(., "Completá su credencial")]');
    }

    get missingCredentialTextLbl() {
        return $('//*[contains(., "Para agendar una videollamada, primero necesitamos los datos de tu mascota.")]');
    }

    get completeCredentialBtn() {
        return $('//button[contains(., "Completar credencial")]');
    }

    // Selector de mascota (solo aparece en cuentas multi-mascota, ANTES de la pantalla de motivo).
    // Confirmado en vivo con un dump (2026-08-12, cuenta multi-mascota real): sin data-cy, trigger
    // es un botón con `aria-expanded` (único en la pantalla), las opciones son botones hermanos
    // del trigger (no hijos) que aparecen recién al abrir — texto = nombre de la mascota.
    get petSelectorHeadingLbl() {
        return $('//h2[contains(., "Elegí para quién es la consulta")]');
    }

    get petSelectorTriggerBtn() {
        return $('button[aria-expanded]');
    }

    get petSelectorOptionBtns() {
        return $$('//button[@aria-expanded="true"]/following-sibling::div//button');
    }

    async verifyPetSelectorVisible(): Promise<void> {
        await this.petSelectorHeadingLbl.waitForDisplayed({ timeout: 15_000 });
        const disabled = await this.continueBtn.getAttribute('disabled');
        if (disabled === null) throw new Error('Se esperaba "Continuar" deshabilitado con el selector de mascota vacío.');
    }

    // Sin argumento selecciona la primera opción disponible (igual que Playwright's selectPet()).
    // Devuelve el nombre de la mascota elegida, para poder verificarlo después en otra pantalla.
    // Nunca usar `.length` sobre el resultado de $$() ya resuelto (tipa Promise<number>, ver
    // known-issues.md) — se usa destructuring/indexado directo en su lugar.
    async selectPet(petName?: string): Promise<string> {
        await this.jsClick(this.petSelectorTriggerBtn);
        const options = await this.petSelectorOptionBtns;
        const [firstOption] = options;
        if (!firstOption) throw new Error('No hay opciones de mascota disponibles en el selector.');

        let target: WebdriverIO.Element = firstOption;
        let selectedName = (await firstOption.getText()).trim();
        if (petName) {
            const match = await (async () => {
                for (const opt of options) {
                    const text = (await opt.getText()).trim();
                    if (text.includes(petName)) return { opt, text };
                }
                return undefined;
            })();
            if (!match) throw new Error(`No se encontró la mascota "${petName}" entre las opciones del selector.`);
            target = match.opt;
            selectedName = match.text;
        }
        await browser.execute((el: HTMLElement) => el.click(), target);
        return selectedName;
    }

    get reasonHeadingLbl() {
        return $('//h2[contains(., "Seleccioná el motivo de tu consulta")]');
    }

    get reasonInput() {
        return $('//input[@id="Motivo de la consulta"]');
    }

    get continueBtn() {
        return $('//button[contains(., "Continuar")]');
    }

    get additionalCommentsInput() {
        return $('textarea[data-scope="field"][data-part="textarea"]');
    }

    get additionalCommentsRequiredLbl() {
        return $('//p[contains(., "Obligatorio")]');
    }

    get reasonNoMatchesLbl() {
        return $('//*[contains(., "No encontramos coincidencias.")]');
    }

    get attachmentsHeadingLbl() {
        return $('//h2[contains(., "Subí una foto, video o archivo")]');
    }

    get skipAttachmentsBtn() {
        return $('//button[contains(., "Omitir")]');
    }

    // Trigger real confirmado en vivo con un dump: sin <label> ni data-scope (a diferencia de las
    // otras 2 pantallas con IMP-011) — es un div "dropzone" sin atributos de accesibilidad claros,
    // identificado por `aria-disabled="false"` (único match en la pantalla). Ver
    // BasePage.selectFileViaNativePicker() — acá el input admite imagen+video+pdf, así que Android
    // abre el selector de archivos completo (`com.google.android.documentsui`), no el Photo
    // Picker — el helper detecta cuál abrió y lo maneja.
    get attachmentDropzoneTrigger() {
        return $('div[aria-disabled="false"]');
    }

    // A diferencia de Playwright (que matchea el <p> del nombre por extensión, sin ambigüedad ahí
    // porque el texto estático de formatos permitidos vive en otro Locator), acá un xpath por
    // extensión ".jpg/.png/..." SIEMPRE matchea también el texto fijo "Formatos permitidos: .png,
    // .jpg o .pdf" del dropzone vacío — confirmado en vivo (el `waitForExist({reverse:true})`
    // nunca se cumplía tras borrar, porque ese texto fijo nunca desaparece). Se ancla en cambio al
    // botón de borrar (`filePreviewDelete`, único cuando hay un archivo adjuntado real) y se sube
    // al `<p>` del nombre, hermano de ese botón bajo el mismo contenedor.
    get attachedFileNameLbl() {
        return $('//button[@data-cy="filePreviewDelete"]/preceding-sibling::div//p');
    }

    // Mismo aria-label/data-cy que la versión Desktop (icono de botón, no cambia por breakpoint).
    get deleteAttachedFileBtn() {
        return $('//button[@data-cy="filePreviewDelete"]');
    }

    // Mismo texto que la versión Desktop (regex amplia: "demasiado grande"/"excede"/"supera").
    // NOTA (2026-08-12): confirmado en vivo que este mensaje NO aparece en mobile tras un archivo
    // oversize (dump completo de document.body.innerText, sin rastro del texto) — no se usa en
    // ningún spec activo por ahora, ver TS-03 TC-01 en videocall.spec.ts. Se deja el getter por si
    // se confirma más adelante que sí existe (ej. aparece con más delay, o en otra ubicación).
    get attachmentErrorLbl() {
        return $('//*[contains(., "demasiado grande") or contains(., "excede") or contains(., "supera")]');
    }

    get dayTimeHeadingLbl() {
        return $('//h2[contains(., "Seleccioná el día y el horario")]');
    }

    get reviewHeadingLbl() {
        return $('//h2[contains(., "Revisá los datos y confirmá tu turno")]');
    }

    get editFechaHoraBtn() {
        return $('//button[@aria-label="Editar fecha y hora"]');
    }

    get editMotivoBtn() {
        return $('//button[@aria-label="Editar motivo"]');
    }

    get editAdjuntosBtn() {
        return $('//button[@aria-label="Editar adjuntos"]');
    }

    get editMascotaBtn() {
        return $('//button[@aria-label="Editar mascota"]');
    }

    // El botón final de la revisión dice "Confirmar videollamada" en Desktop pero "Continuar" en
    // mobile (mismo label genérico que el resto del wizard) — confirmado en vivo con un dump,
    // mismo hallazgo que el POM Playwright ya documenta para esta pantalla.
    get confirmationReservedLbl() {
        return $('//*[contains(., "ya tiene su turno reservado")]');
    }

    get goToHomeBtn() {
        return $('//button[contains(., "Ir al inicio")]');
    }

    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    // clearValue() + setValue() de WebdriverIO no reemplazan el contenido de este input — quedó
    // confirmado en vivo con un dump: tras escribir un texto libre, clearValue() no lo borra y el
    // setValue() siguiente APPENDEA en vez de reemplazar ("TextoLibre" + "Vacunas" en el mismo
    // input). Es un input controlado por React: hay que setear el valor a través del setter nativo
    // de HTMLInputElement y disparar un evento "input" real para que React vea el cambio, en vez de
    // depender del "clear" del driver.
    private async typeIntoReactInput(elementPromise: ReturnType<typeof $>, text: string): Promise<void> {
        const el = await elementPromise;
        await browser.execute(
            (node: HTMLElement, value: string) => {
                const input = node as HTMLInputElement;
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                nativeSetter?.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            },
            el,
            text,
        );
    }

    async startNewVideocallRequest(): Promise<void> {
        await this.jsClick(this.scheduleNewVideocallBtn);
    }

    async verifyMissingCredentialScreenVisible(): Promise<void> {
        await this.missingCredentialHeadingLbl.waitForDisplayed({ timeout: 15_000 });
        await this.missingCredentialTextLbl.waitForDisplayed({ timeout: 10_000 });
        await this.completeCredentialBtn.waitForDisplayed({ timeout: 10_000 });
    }

    async goToCompleteCredential(): Promise<void> {
        await this.jsClick(this.completeCredentialBtn);
    }

    async verifyReasonScreenVisible(): Promise<void> {
        await this.reasonHeadingLbl.waitForDisplayed({ timeout: 15_000 });
    }

    // Tras seleccionar mascota, la pantalla de motivo no tiene un locator dedicado para "mascota
    // seleccionada" en mobile — se confirma por presencia del nombre en el texto de la pantalla
    // (suficiente para probar que el selector realmente aplicó la selección, sin depender de un
    // locator específico no confirmado en vivo).
    async verifyReasonScreenWithSelectedPet(petName: string): Promise<void> {
        await this.verifyReasonScreenVisible();
        const bodyText = await browser.execute(() => document.body.innerText);
        if (!bodyText.includes(petName)) {
            throw new Error(`Se esperaba que la pantalla de motivo mostrara la mascota seleccionada ("${petName}"), no se encontró en el texto de la pantalla.`);
        }
    }

    async verifyReasonRequiredBlocksContinue(): Promise<void> {
        await this.reasonInput.waitForDisplayed({ timeout: 10_000 });
        const value = await this.reasonInput.getValue();
        if (value !== '') throw new Error(`Se esperaba el input de Motivo vacío, tiene: "${value}"`);
        const disabled = await this.continueBtn.getAttribute('disabled');
        if (disabled === null) throw new Error('Se esperaba "Continuar" deshabilitado con el motivo vacío.');
    }

    // Combobox de texto libre con filtrado: escribir el motivo filtra las opciones, y el resultado
    // se elige tocando el botón cuyo texto matchea — mismo patrón confirmado en vivo con un dump.
    async selectReason(reasonText: string): Promise<void> {
        await this.jsClick(this.reasonInput);
        await this.typeIntoReactInput(this.reasonInput, reasonText);
        const optionBtn = $(`//button[contains(., "${reasonText}")]`);
        await optionBtn.waitForDisplayed({ timeout: 10_000 });
        await this.jsClick(optionBtn);
    }

    // Confirmado en vivo con un dump: elegir "Otro motivo" marca "Comentarios adicionales" como
    // Obligatorio y deshabilita "Continuar" hasta completarlo.
    async verifyOtherReasonRequiresComment(): Promise<void> {
        await this.additionalCommentsRequiredLbl.waitForDisplayed({ timeout: 10_000 });
        const disabled = await this.continueBtn.getAttribute('disabled');
        if (disabled === null) throw new Error('Se esperaba "Continuar" deshabilitado sin completar los comentarios adicionales.');
    }

    async fillAdditionalComments(comment: string): Promise<void> {
        await this.additionalCommentsInput.setValue(comment);
    }

    async verifyContinueEnabled(): Promise<void> {
        const disabled = await this.continueBtn.getAttribute('disabled');
        if (disabled !== null) throw new Error('Se esperaba "Continuar" habilitado.');
    }

    async enterFreeTextReason(reasonText: string): Promise<void> {
        await this.jsClick(this.reasonInput);
        await this.typeIntoReactInput(this.reasonInput, reasonText);
    }

    async verifyReasonNotFound(): Promise<void> {
        await this.reasonNoMatchesLbl.waitForDisplayed({ timeout: 10_000 });
        const disabled = await this.continueBtn.getAttribute('disabled');
        if (disabled === null) throw new Error('Se esperaba "Continuar" deshabilitado con un motivo de texto libre no encontrado.');
    }

    async clickContinue(): Promise<void> {
        await this.jsClick(this.continueBtn);
    }

    async verifyAttachmentsScreenVisible(): Promise<void> {
        await this.attachmentsHeadingLbl.waitForDisplayed({ timeout: 15_000 });
    }

    async skipAttachments(): Promise<void> {
        await this.jsClick(this.skipAttachmentsBtn);
    }

    // IMP-011 (docs/impedimentos-bloqueos.md) resuelto — ver BasePage.selectFileViaNativePicker().
    // Requiere que el archivo ya exista en la galería del dispositivo/emulador antes de llamar
    // (adb push + media scan).
    async attachFile(): Promise<void> {
        await this.selectFileViaNativePicker('div[aria-disabled="false"]');
    }

    async removeAttachedFile(): Promise<void> {
        await this.deleteAttachedFileBtn.waitForDisplayed({ timeout: 10_000 });
        await this.jsClick(this.deleteAttachedFileBtn);
    }

    // Cuenta cuántos archivos están adjuntados contando los botones de borrar (uno por archivo) —
    // más confiable que contar `attachedFileNameLbl` porque ese xpath sube por hermano del botón,
    // uno por cada archivo real.
    async countAttachedFiles(): Promise<number> {
        return browser.execute(() => document.querySelectorAll('button[data-cy="filePreviewDelete"]').length);
    }

    async verifyDayTimeScreenVisible(): Promise<void> {
        await this.dayTimeHeadingLbl.waitForDisplayed({ timeout: 15_000 });
    }

    async completeDayAndTime(date: DateTime, options?: { band?: 'Mañana' | 'Tarde' | 'Noche' }): Promise<void> {
        await this.calendarComponent.selectAssistanceDay(date);
        await this.calendarComponent.selectAssistanceTime(options);
    }

    async verifyTimeBandsAvailableFromReview(): Promise<void> {
        await this.jsClick(this.editFechaHoraBtn);
        await this.calendarComponent.verifyAllTimeBandsVisible();
        await this.clickContinue();
    }

    async verifyReviewScreenSinglePet(): Promise<void> {
        await this.reviewHeadingLbl.waitForDisplayed({ timeout: 15_000 });
        await this.editFechaHoraBtn.waitForDisplayed({ timeout: 10_000 });
        await this.editMotivoBtn.waitForDisplayed({ timeout: 10_000 });
        await this.editAdjuntosBtn.waitForDisplayed({ timeout: 10_000 });
        if (await this.editMascotaBtn.isExisting()) throw new Error('Se esperaba "Editar mascota" oculto para una cuenta de mascota única.');
    }

    async confirmVideocall(): Promise<void> {
        await this.jsClick(this.continueBtn);
    }

    async verifyConfirmationScreen(): Promise<void> {
        await this.confirmationReservedLbl.waitForDisplayed({ timeout: 20_000 });
        await this.goToHomeBtn.waitForDisplayed({ timeout: 10_000 });
    }

    // Cuenta en el DOM directo vía JS en vez de usar $$().length — `.length` sobre un
    // ChainablePromiseArray de WebdriverIO tipa como Promise<number>, no como number plano, incluso
    // ya resuelto el array (ver known-issues.md sobre esta limitación de tipos).
    async verifyExistingTurnosCount(count: number): Promise<void> {
        await this.existingTurnosHeadingLbl.waitForDisplayed({ timeout: 15_000 });
        const actualCount = await browser.execute(() => {
            const heading = Array.from(document.querySelectorAll('h2')).find((h) => (h.textContent || '').includes('Tus turnos'));
            const container = heading?.nextElementSibling;
            return container ? container.querySelectorAll('button').length : 0;
        });
        if (actualCount !== count) throw new Error(`Se esperaban ${count} turno(s) en "Tus turnos", hay ${actualCount}.`);
    }

    // CA01/CA02 IMAS-3909 (flujo 1 mascota): el bloqueo se dispara recién al tocar "Agendar nueva
    // videollamada" con la mascota ya en el límite — no antes (el botón sigue visible/habilitado
    // con 2 turnos ya agendados). Es un modal sobre la pantalla de entrada, no una pantalla aparte.
    async attemptScheduleAndVerifyPetLimitBlocked(petName: string): Promise<void> {
        await this.jsClick(this.scheduleNewVideocallBtn);
        await this.verifyPetLimitBlockedDialog(petName);
    }

    async verifyPetLimitBlockedDialog(petName: string): Promise<void> {
        await this.limitReachedDialogHeadingLbl.waitForDisplayed({ timeout: 15_000 });
        await this.limitReachedDialogMessageLbl.waitForDisplayed({ timeout: 10_000 });
        const specificMessage = $(`//*[contains(., "Ya tenés 2 videollamadas programadas para ${petName}.")]`);
        await specificMessage.waitForDisplayed({ timeout: 10_000 });
    }

    async closeLimitReachedDialog(): Promise<void> {
        await this.jsClick(this.closeLimitReachedDialogBtn);
        await this.limitReachedDialogHeadingLbl.waitForDisplayed({ timeout: 10_000, reverse: true });
    }
}
