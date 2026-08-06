import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { VetifyWebappCalendarSchedulingComponent } from '@pages/vetify/webapp/videocall/CalendarSchedulingComponent';
import { expect, Locator, Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { DateTime } from 'luxon';

export class VetifyWebappRescheduleVideocallPage extends VetifyWebappLoggedBasePage {
    private assistanceId: string;

    // Día/horario screen — mismo componente que el agendamiento (CalendarSchedulingComponent)
    readonly dayTimeHeadingLbl: Locator;
    readonly calendarComponent: VetifyWebappCalendarSchedulingComponent;
    readonly continueBtn: Locator;

    // Revisión screen — solo fecha/hora es editable, mascota y motivo se reutilizan sin cambios
    readonly reviewHeadingLbl: Locator;
    readonly reviewFechaHoraLbl: Locator;
    readonly editFechaHoraBtn: Locator;
    readonly confirmRescheduleBtn: Locator;

    // Confirmación screen (mismo patrón que el agendamiento nuevo)
    readonly confirmationReservedLbl: Locator;
    readonly goToHomeBtn: Locator;

    constructor(page: Page, assistanceId: string) {
        super(page, `/petsAssistance/reprogramarTurno/${assistanceId}`);
        this.assistanceId = assistanceId;

        this.dayTimeHeadingLbl = page.getByRole('heading', { name: 'Seleccioná el día y el horario' });
        this.calendarComponent = new VetifyWebappCalendarSchedulingComponent(page);
        this.continueBtn = page.getByRole('button', { name: 'Continuar' });

        this.reviewHeadingLbl = page.getByRole('heading', { name: 'Revisá los datos y confirmá tu turno' });
        this.reviewFechaHoraLbl = page.locator('p:text-is("Fecha y hora")').locator('xpath=following-sibling::*[1]');
        this.editFechaHoraBtn = page.getByRole('button', { name: 'Editar fecha y hora' });
        this.confirmRescheduleBtn = page.getByRole('button', { name: 'Confirmar turno' });

        this.confirmationReservedLbl = page.getByText(/ya tiene su turno reservado/);
        this.goToHomeBtn = page.getByRole('button', { name: 'Ir al inicio' });
    }

    @step('Esperar a que la pantalla de reprogramar videollamada cargue')
    async waitForPageLoaded() {
        await Promise.all([
            super.waitForPageLoaded(),
            this.page.waitForResponse((response) => response.url().includes(`/api/services/pets/appointment/${this.assistanceId}`) && response.status() === 200),
            this.dayTimeHeadingLbl.waitFor({ state: 'visible' }),
        ]);
    }

    @step('Completar el nuevo día y horario del turno reprogramado')
    async completeDayAndTime(date: DateTime, options?: { band?: 'Mañana' | 'Tarde' | 'Noche'; time?: string }): Promise<void> {
        await this.calendarComponent.selectAssistanceDay(date);
        await this.calendarComponent.selectAssistanceTime(options);
        await expect(this.continueBtn).toBeEnabled();
        await this.continueBtn.click();
    }

    @step('Verificar la pantalla de revisión de la reprogramación')
    async verifyReviewScreen(): Promise<void> {
        await expect(this.reviewHeadingLbl).toBeVisible();
        await expect(this.editFechaHoraBtn).toBeVisible();
    }

    // Endpoint real confirmado vía MCP contra QA: PUT .../appointment/{assistanceId}/reschedule. El
    // backend igual crea una assistanceId NUEVA para el turno reprogramado y deja la anterior en
    // estado CANCELADO (confirmado por API, comparando /programmed antes/después) — el PUT no es un
    // "update in place" real a pesar de estar dirigido al id viejo.
    @step('Confirmar la reprogramación del turno')
    async confirmReschedule(): Promise<void> {
        const [response] = await Promise.all([
            this.page.waitForResponse((r) => r.url().includes(`/api/services/pets/appointment/${this.assistanceId}/reschedule`)),
            this.confirmRescheduleBtn.click(),
        ]);
        expect(response.ok(), `La reprogramación debe confirmarse exitosamente. Respuesta: ${response.status()} ${await response.text()}`).toBeTruthy();
    }

    @step('Verificar la pantalla de confirmación de la reprogramación')
    async verifyConfirmationScreen(): Promise<void> {
        await expect(this.confirmationReservedLbl).toBeVisible();
        await expect(this.goToHomeBtn).toBeVisible();
    }
}
