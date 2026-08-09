import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { VetifyWebappCalendarSchedulingComponent } from '@pages/vetify/webapp/videocall/CalendarSchedulingComponent';
import { expect, Locator, Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { DateTime } from 'luxon';

export class VetifyWebappVideocallFormPage extends VetifyWebappLoggedBasePage {
    // Entry screen ("Consultas online desde donde estés")
    readonly scheduleNewVideocallBtn: Locator;

    // Pet selection screen (multi-pet only)
    readonly petSelectorHeadingLbl: Locator;
    readonly petSelectorOpenBtn: Locator;
    readonly petSelectorOptionBtns: Locator;

    // Missing-credential screen ("Completá su credencial")
    readonly completeCredentialBtn: Locator;
    readonly missingCredentialHeadingLbl: Locator;
    readonly missingCredentialTextLbl: Locator;

    // Motivo screen
    readonly reasonHeadingLbl: Locator;
    readonly reasonInput: Locator;
    readonly reasonNoMatchesLbl: Locator;
    readonly additionalCommentsInput: Locator;
    readonly additionalCommentsRequiredLbl: Locator;

    // Adjuntos screen
    readonly attachmentsHeadingLbl: Locator;
    readonly skipAttachmentsBtn: Locator;
    readonly fileInput: Locator;
    readonly attachedFileNameLbl: Locator;
    readonly attachmentErrorLbl: Locator;
    readonly invalidFormatErrorLbl: Locator;
    readonly deleteAttachedFileBtn: Locator;

    // Día/horario screen
    readonly dayTimeHeadingLbl: Locator;
    readonly calendarComponent: VetifyWebappCalendarSchedulingComponent;

    // Revisión screen
    readonly reviewHeadingLbl: Locator;
    readonly reviewMascotaLbl: Locator;
    readonly reviewFechaHoraLbl: Locator;
    readonly reviewMotivoLbl: Locator;
    readonly reviewAdjuntosLbl: Locator;
    readonly editFechaHoraBtn: Locator;
    readonly editMotivoBtn: Locator;
    readonly editAdjuntosBtn: Locator;
    readonly editMascotaBtn: Locator;
    readonly confirmVideocallBtn: Locator;

    // Confirmación screen (post-booking, before returning Home) — CA07 IMAS-3174
    readonly confirmationReservedLbl: Locator;
    readonly goToHomeBtn: Locator;

    // Entry screen — lista "Tus turnos" (aparece en cuanto hay ≥1 turno agendado) y el modal de
    // bloqueo por límite (CA01/CA02 IMAS-3909)
    readonly existingTurnosHeadingLbl: Locator;
    readonly existingTurnoItems: Locator;
    readonly limitReachedDialogHeadingLbl: Locator;
    readonly limitReachedDialogMessageLbl: Locator;
    readonly closeLimitReachedDialogBtn: Locator;

    // Shared
    readonly continueBtn: Locator;
    readonly backBtn: Locator;

    constructor(page: Page) {
        super(page, '/service/493/create/questions?isNow=false');

        this.scheduleNewVideocallBtn = page.getByRole('button', { name: 'Agendar nueva videollamada' });

        this.petSelectorHeadingLbl = page.getByRole('heading', { name: 'Elegí para quién es la consulta' });
        // Real markup confirmed via MCP: a button (placeholder "Seleccionar" the first time; the
        // selected pet's name on subsequent opens, e.g. re-entering this step via "Editar mascota" from
        // the review) expands into a list of per-pet buttons (same dropdown pattern as "Motivo"), not
        // the chakra-wrap list this POM originally assumed for multi-pet selection. Located by its
        // position next to the "Mascota" label (not by accessible name) so it matches in both states.
        this.petSelectorOpenBtn = page.locator('p:text-is("Mascota")').locator('xpath=following-sibling::*[1]');
        this.petSelectorOptionBtns = page.locator('button').filter({ hasText: /^(?!Seleccionar$|Continuar$).+$/ });

        this.completeCredentialBtn = page.getByRole('button', { name: 'Completar credencial' });
        this.missingCredentialHeadingLbl = page.getByRole('heading', { name: 'Completá su credencial' });
        this.missingCredentialTextLbl = page.getByText('Para agendar una videollamada, primero necesitamos los datos de tu mascota.');

        this.reasonHeadingLbl = page.getByRole('heading', { name: 'Seleccioná el motivo de tu consulta' });
        this.reasonInput = page.getByRole('textbox', { name: 'Motivo' });
        this.reasonNoMatchesLbl = page.getByText('No encontramos coincidencias.');
        this.additionalCommentsInput = page.getByRole('textbox', { name: 'Comentarios adicionales' });
        // Copy real confirmado en vivo contra QA (2026-08-07): al elegir "Otro motivo", el campo se
        // marca "Obligatorio" y bloquea "Continuar" hasta completarlo.
        this.additionalCommentsRequiredLbl = page.getByText('Obligatorio');

        this.attachmentsHeadingLbl = page.getByRole('heading', { name: 'Subí una foto, video o archivo' });
        this.skipAttachmentsBtn = page.getByRole('button', { name: 'Omitir' });
        // Real DOM has 3 hidden <input type="file"> (multi-file, camera-capture, multi-file again).
        // Driving the OS file-chooser dialog via a click is flaky on repeated uploads within the same
        // test (the native dialog doesn't always reopen for a second click) — set files directly on
        // the first non-camera multi-file input instead.
        this.fileInput = page.locator('input[type="file"]:not([capture])').first();
        this.attachedFileNameLbl = page.locator('p').filter({ hasText: /\.(png|jpg|jpeg|pdf|mp4|mov)$/i });
        this.attachmentErrorLbl = page.getByText(/demasiado grande|excede|supera/i);
        // Copy real confirmado en vivo contra QA (2026-08-07, IMAS-4023): distinto del de "demasiado
        // grande" — el mismo endpoint /api/files/upload/pets recibe cualquier archivo (no hay gate de
        // extensión solo en el front, confirmado inspeccionando la red) y esta es la respuesta que
        // muestra la UI para un formato no soportado (ej. .txt).
        this.invalidFormatErrorLbl = page.getByText('No se pudo subir el archivo. Intentá nuevamente.');
        // Accessible name confirmed against real DOM: <button aria-label="DeleteFile">
        this.deleteAttachedFileBtn = page.getByRole('button', { name: 'DeleteFile' });

        this.dayTimeHeadingLbl = page.getByRole('heading', { name: 'Seleccioná el día y el horario' });
        this.calendarComponent = new VetifyWebappCalendarSchedulingComponent(page);

        this.reviewHeadingLbl = page.getByRole('heading', { name: 'Revisá los datos y confirmá tu turno' });
        this.reviewMascotaLbl = page.locator('p:text-is("Mascota")').locator('xpath=following-sibling::*[1]');
        this.reviewFechaHoraLbl = page.locator('p:text-is("Fecha y hora")').locator('xpath=following-sibling::*[1]');
        this.reviewMotivoLbl = page.locator('p:text-is("Motivo")').locator('xpath=following-sibling::*[1]');
        this.reviewAdjuntosLbl = page.locator('p:text-is("Adjuntos")').locator('xpath=following-sibling::*[1]');
        this.editFechaHoraBtn = page.getByRole('button', { name: 'Editar fecha y hora' });
        this.editMotivoBtn = page.getByRole('button', { name: 'Editar motivo' });
        this.editAdjuntosBtn = page.getByRole('button', { name: 'Editar adjuntos' });
        this.editMascotaBtn = page.getByRole('button', { name: 'Editar mascota' });
        // Confirmado por corrida real contra Android (Pixel 5): el botón final de la revisión dice
        // "Confirmar videollamada" en Desktop pero "Continuar" en mobile (mismo label genérico que
        // usa el resto del wizard en esa plataforma) — mismo botón/acción, texto distinto por
        // breakpoint. Sin ambigüedad: la revisión no tiene ningún otro botón con estos textos.
        this.confirmVideocallBtn = page.getByRole('button', { name: /^(Confirmar videollamada|Continuar)$/ });

        // Real copy confirmed via MCP: "¡<Mascota> ya tiene su turno reservado!"
        this.confirmationReservedLbl = page.getByText(/ya tiene su turno reservado/);
        this.goToHomeBtn = page.getByRole('button', { name: 'Ir al inicio' });

        // "Tus turnos" aparece en la pantalla de entrada en cuanto el usuario tiene ≥1 turno
        // agendado. El modal de bloqueo (CA01/CA02 IMAS-3909) se dispara al tocar "Agendar nueva
        // videollamada" con la mascota ya en el límite de 2 — confirmado vía MCP contra QA real.
        this.existingTurnosHeadingLbl = page.getByRole('heading', { name: 'Tus turnos' });
        this.existingTurnoItems = page.getByRole('heading', { name: 'Tus turnos' }).locator('xpath=following-sibling::*[1]').getByRole('button');
        this.limitReachedDialogHeadingLbl = page.getByText('Superaste el límite de videollamadas por mascota');
        this.limitReachedDialogMessageLbl = page.getByText(/Ya tenés 2 videollamadas programadas para/);
        this.closeLimitReachedDialogBtn = page.getByRole('button', { name: 'Cerrar' });

        this.continueBtn = page.getByRole('button', { name: 'Continuar' });
        this.backBtn = page.locator('button[data-cy="backButton"]');
    }

    @step('Iniciar solicitud de nueva videollamada')
    async startNewVideocallRequest(): Promise<void> {
        await this.scheduleNewVideocallBtn.click();
    }

    @step('Verificar pantalla de selección de mascota visible, con "Continuar" deshabilitado')
    async verifyPetSelectorVisible(): Promise<void> {
        await expect(this.petSelectorHeadingLbl).toBeVisible();
        await expect(this.continueBtn).toBeDisabled();
    }

    @step('Seleccionar una mascota en el selector multi-mascota')
    async selectPet(petName?: string): Promise<void> {
        await this.petSelectorOpenBtn.click();
        const option = petName ? this.petSelectorOptionBtns.filter({ hasText: petName }) : this.petSelectorOptionBtns;
        await option.first().click();
    }

    @step('Verificar que la mascota seleccionada se muestra correctamente')
    async verifySelectedPetDisplayed(): Promise<void> {
        await expect(this.reviewMascotaLbl).not.toHaveText('-');
        await expect(this.reviewMascotaLbl).not.toHaveText(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    }

    @step('Verificar pantalla de credencial faltante visible')
    async verifyMissingCredentialScreenVisible(): Promise<void> {
        await expect(this.missingCredentialHeadingLbl).toBeVisible();
        await expect(this.missingCredentialTextLbl).toBeVisible();
        await expect(this.completeCredentialBtn).toBeVisible();
    }

    @step('Ir al flujo de carga de credencial desde la pantalla de credencial faltante')
    async goToCompleteCredential(): Promise<void> {
        await Promise.all([this.page.waitForURL(/\/pets\/.+/), this.completeCredentialBtn.click()]);
    }

    @step('Verificar pantalla de selección de motivo visible')
    async verifyReasonScreenVisible(): Promise<void> {
        await expect(this.reasonHeadingLbl).toBeVisible();
    }

    @step('Verificar que "Continuar" permanece deshabilitado mientras el motivo está vacío (CP03 IMAS-3174)')
    async verifyReasonRequiredBlocksContinue(): Promise<void> {
        await expect(this.reasonInput).toHaveValue('');
        await expect(this.continueBtn).toBeDisabled();
    }

    @step('Verificar pantalla de motivo visible con la mascota seleccionada correcta')
    async verifyReasonScreenWithSelectedPet(): Promise<void> {
        await expect(this.reasonHeadingLbl).toBeVisible();
        await this.verifySelectedPetDisplayed();
    }

    @step('Ingresar un motivo de texto libre no listado')
    async enterFreeTextReason(reasonText: string): Promise<void> {
        await this.reasonInput.click();
        await this.reasonInput.fill(reasonText);
    }

    @step('Verificar que el motivo de texto libre no es aceptado')
    async verifyReasonNotFound(): Promise<void> {
        await expect(this.reasonNoMatchesLbl).toBeVisible();
        await expect(this.continueBtn).toBeDisabled();
    }

    @step('Seleccionar un motivo válido del listado')
    async selectReason(reasonText: string): Promise<void> {
        await this.reasonInput.click();
        await this.reasonInput.fill(reasonText);
        await this.page.getByRole('button', { name: reasonText, exact: false }).first().click();
    }

    @step('Continuar al siguiente paso del formulario')
    async clickContinue(): Promise<void> {
        await expect(this.continueBtn).toBeEnabled();
        await this.continueBtn.click();
    }

    @step('Verificar pantalla de adjuntos visible')
    async verifyAttachmentsScreenVisible(): Promise<void> {
        await expect(this.attachmentsHeadingLbl).toBeVisible();
    }

    @step('Verificar que "Continuar" permanece deshabilitado en adjuntos sin archivos, mientras "Omitir" sí permite avanzar (CP09 IMAS-3889)')
    async verifyAttachmentsWithoutFilesBlockContinue(): Promise<void> {
        await expect(this.attachmentsHeadingLbl).toBeVisible();
        await expect(this.continueBtn).toBeDisabled();
        await expect(this.skipAttachmentsBtn).toBeEnabled();
    }

    @step('Omitir paso de adjuntos')
    async skipAttachments(): Promise<void> {
        await expect(this.attachmentsHeadingLbl).toBeVisible();
        await this.skipAttachmentsBtn.click();
    }

    @step('Adjuntar un archivo')
    async uploadAttachment(filePath: string): Promise<void> {
        await this.fileInput.setInputFiles(filePath);
    }

    @step('Verificar mensaje de error por archivo demasiado grande')
    async verifyAttachmentTooLargeError(): Promise<void> {
        await expect(this.attachmentErrorLbl).toBeVisible();
    }

    @step('Verificar mensaje de error por formato de archivo no soportado (IMAS-4023 CA01/CA02/CA06)')
    async verifyInvalidFormatError(): Promise<void> {
        await expect(this.invalidFormatErrorLbl).toBeVisible();
    }

    @step('Verificar que el archivo adjuntado se muestra y habilita "Continuar"')
    async verifyAttachmentUploaded(fileName: string): Promise<void> {
        await expect(this.attachedFileNameLbl.filter({ hasText: fileName })).toBeVisible();
        await expect(this.continueBtn).toBeEnabled();
    }

    @step('Verificar que el selector de archivos ya no se ofrece al llegar al límite de 5 (IMAS-4023 CA01/CA05)')
    async verifyUploadWidgetHiddenAtLimit(): Promise<void> {
        // Corregido con evidencia real (2026-08-07): el texto "Cargá foto, video o archivo" NO
        // desaparece con 5 archivos adjuntados — sigue mostrándose como encabezado del bloque. Lo que
        // realmente se oculta es el <input type="file"> en sí (confirmado en vivo contra QA real).
        await expect(this.fileInput).toBeHidden();
    }

    @step('Eliminar el archivo adjuntado')
    async deleteAttachedFile(fileName: string): Promise<void> {
        await this.deleteAttachedFileBtn.click();
        await expect(this.attachedFileNameLbl.filter({ hasText: fileName })).toBeHidden();
    }

    @step('Verificar pantalla de selección de día y horario visible')
    async verifyDayTimeScreenVisible(): Promise<void> {
        await expect(this.dayTimeHeadingLbl).toBeVisible();
    }

    @step('Completar día y horario del turno')
    async completeDayAndTime(date: DateTime, options?: { band?: 'Mañana' | 'Tarde' | 'Noche'; time?: string }): Promise<void> {
        await this.calendarComponent.selectAssistanceDay(date);
        await this.calendarComponent.selectAssistanceTime(options);
    }

    @step('Editar fecha y hora desde la revisión para verificar franjas horarias disponibles')
    async verifyTimeBandsAvailableFromReview(): Promise<void> {
        await this.editFechaHoraBtn.click();
        await this.calendarComponent.verifyAllTimeBandsVisible();
        await this.clickContinue();
    }

    @step('Verificar pantalla de revisión con mascota única, sin opción de editar mascota')
    async verifyReviewScreenSinglePet(): Promise<void> {
        await expect(this.reviewHeadingLbl).toBeVisible();
        await expect(this.editFechaHoraBtn).toBeVisible();
        await expect(this.editMotivoBtn).toBeVisible();
        await expect(this.editAdjuntosBtn).toBeVisible();
        await expect(this.editMascotaBtn).toBeHidden();
    }

    @step('Verificar pantalla de revisión multi-mascota, con opción de editar mascota')
    async verifyReviewScreenMultiPet(): Promise<void> {
        await expect(this.reviewHeadingLbl).toBeVisible();
        await expect(this.editMascotaBtn).toBeVisible();
    }

    // Confirmado vía MCP contra QA real: "Editar mascota" no vuelve directo a la revisión, sino al
    // selector de mascota; desde ahí hay que re-recorrer Motivo → Adjuntos → Día/horario para volver a
    // la revisión — pero cada paso llega con el valor previamente cargado ya conservado (Continuar
    // habilitado sin tocar nada), tal como exige CA09 de IMAS-3889 ("conservará el resto de la
    // información ingresada siempre que continúe siendo válida para la nueva mascota").
    @step('Cambiar la mascota seleccionada desde la revisión por una distinta, conservando el resto de los datos')
    async changeSelectedPetFromReview(currentPetName: string): Promise<void> {
        await this.editMascotaBtn.click();
        await this.petSelectorOpenBtn.click();
        await this.petSelectorOptionBtns.filter({ hasNotText: currentPetName }).first().click();
        await this.clickContinue();
        await this.clickContinue();
        await this.skipAttachments();
        await this.clickContinue();
    }

    @step('Confirmar la videollamada agendada')
    async confirmVideocall(): Promise<void> {
        const [response] = await Promise.all([
            this.page.waitForResponse((r) => r.url().includes('/api/services/assistance/493/create')),
            this.confirmVideocallBtn.click(),
        ]);
        expect(response.ok(), `El turno debe confirmarse exitosamente. Respuesta: ${response.status()} ${await response.text()}`).toBeTruthy();
    }

    @step('Verificar la pantalla de confirmación del turno')
    async verifyConfirmationScreen(): Promise<void> {
        await expect(this.confirmationReservedLbl).toBeVisible();
        await expect(this.goToHomeBtn).toBeVisible();
    }

    @step('Verificar que la sección "Tus turnos" muestra la cantidad de turnos esperada')
    async verifyExistingTurnosCount(count: number): Promise<void> {
        await expect(this.existingTurnosHeadingLbl).toBeVisible();
        await expect(this.existingTurnoItems).toHaveCount(count);
    }

    // CA01/CA02 IMAS-3909 (flujo 1 mascota): el bloqueo se dispara recién al tocar "Agendar nueva
    // videollamada" con la mascota ya en el límite — no antes (el botón sigue visible/habilitado
    // con 2 turnos ya agendados). Confirmado vía MCP: es un modal sobre la pantalla de entrada, no
    // una pantalla aparte — CA03 ("Tus turnos") ya está satisfecho por esa misma pantalla de fondo.
    @step('Intentar agendar una nueva videollamada y verificar el bloqueo por límite de turnos')
    async attemptScheduleAndVerifyPetLimitBlocked(petName: string): Promise<void> {
        await this.scheduleNewVideocallBtn.click();
        await this.verifyPetLimitBlockedDialog(petName);
    }

    // CA07 IMAS-3909 (flujo multi-mascota): a diferencia del flujo de 1 mascota, acá el bloqueo NO
    // aparece al tocar "Agendar nueva videollamada" (siempre lleva primero al selector de mascota,
    // sin importar límites) — aparece recién tras elegir la mascota en el límite y tocar
    // "Continuar". Confirmado vía MCP: elegir la OTRA mascota (sin turnos) continúa sin bloqueo.
    @step('Verificar el modal de bloqueo por límite de turnos para la mascota indicada')
    async verifyPetLimitBlockedDialog(petName: string): Promise<void> {
        await expect(this.limitReachedDialogHeadingLbl).toBeVisible();
        await expect(this.limitReachedDialogMessageLbl).toBeVisible();
        await expect(this.page.getByText(`Ya tenés 2 videollamadas programadas para ${petName}.`)).toBeVisible();
    }

    @step('Cerrar el modal de bloqueo por límite de turnos')
    async closeLimitReachedDialog(): Promise<void> {
        await this.closeLimitReachedDialogBtn.click();
        await expect(this.limitReachedDialogHeadingLbl).toBeHidden();
    }
}
