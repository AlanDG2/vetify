import { $, browser } from '@wdio/globals';
import { DateTime } from 'luxon';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';
import { VetifyMobileVideocallCalendarComponent } from './VideocallCalendarComponent';

// Locators calcados de src/pages/vetify/webapp/videocall/RescheduleVideocallPage.ts (Playwright).
// Reusa el mismo VetifyMobileVideocallCalendarComponent que el agendamiento nuevo — confirmado en
// vivo con un dump que esta pantalla (/petsAssistance/reprogramarTurno/{id}) es el mismo
// componente de calendario (misma clase "schedule-date-input", mismo heading).
export class VetifyMobileRescheduleVideocallPage extends VetifyMobileLoggedBasePage {
    readonly calendarComponent = new VetifyMobileVideocallCalendarComponent();

    constructor(private readonly assistanceId: string) {
        super();
    }

    async load(): Promise<void> {
        await this.navigateTo(`/petsAssistance/reprogramarTurno/${this.assistanceId}`);
        await this.dayTimeHeadingLbl.waitForDisplayed({ timeout: 20_000 });
    }

    // Para cuando se llega por el botón real "Reprogramar" del detalle (VideocallViewPage) en vez
    // de navegar directo por URL — mismo criterio que el resto del proyecto (esperar el heading en
    // vez de asumir que ya cargó).
    async waitForLoaded(): Promise<void> {
        await this.dayTimeHeadingLbl.waitForDisplayed({ timeout: 20_000 });
    }

    get dayTimeHeadingLbl() {
        return $('//h2[contains(., "Seleccioná el día y el horario")]');
    }

    get continueBtn() {
        return $('//button[contains(., "Continuar")]');
    }

    get reviewHeadingLbl() {
        return $('//h2[contains(., "Revisá los datos y confirmá tu turno")]');
    }

    get editFechaHoraBtn() {
        return $('//button[@aria-label="Editar fecha y hora"]');
    }

    // El botón final dice "Confirmar turno" en Desktop — al igual que el resto del wizard, en
    // mobile colapsa al label genérico "Continuar" (mismo hallazgo que confirmVideocallBtn del
    // agendamiento nuevo). Se acepta cualquiera de los dos por las dudas, sin ambigüedad real en
    // esta pantalla.
    get confirmRescheduleBtn() {
        return $('//button[contains(., "Confirmar turno") or contains(., "Continuar")]');
    }

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

    async completeDayAndTime(date: DateTime, options?: { band?: 'Mañana' | 'Tarde' | 'Noche' }): Promise<void> {
        await this.calendarComponent.selectAssistanceDay(date);
        await this.calendarComponent.selectAssistanceTime(options);
        await this.jsClick(this.continueBtn);
    }

    async verifyReviewScreen(): Promise<void> {
        await this.reviewHeadingLbl.waitForDisplayed({ timeout: 15_000 });
        await this.editFechaHoraBtn.waitForDisplayed({ timeout: 10_000 });
    }

    async confirmReschedule(): Promise<void> {
        await this.jsClick(this.confirmRescheduleBtn);
    }

    async verifyConfirmationScreen(): Promise<void> {
        await this.confirmationReservedLbl.waitForDisplayed({ timeout: 20_000 });
        await this.goToHomeBtn.waitForDisplayed({ timeout: 10_000 });
    }
}
