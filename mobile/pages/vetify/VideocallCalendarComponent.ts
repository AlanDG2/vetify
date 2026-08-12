import { $, $$, browser } from '@wdio/globals';
import { DateTime } from 'luxon';

type TimeBand = 'Mañana' | 'Tarde' | 'Noche' | 'Madrugada';

// react-datepicker renderiza los aria-label en inglés sin importar el locale de la app (ej.
// "Choose Tuesday, August 4th, 2026" / "Not available <date>" cuando está deshabilitado) — mismo
// hallazgo que src/pages/vetify/webapp/videocall/CalendarSchedulingComponent.ts (Playwright).
function getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
    }
}

// Locators confirmados con un dump de DOM en vivo (calendario react-datepicker estándar, Drawer
// de Chakra para franjas horarias) — no adivinados. El original Playwright usa getByRole, que no
// traduce 1:1 a WebdriverIO; acá se matchea por clase/aria-label real.
export class VetifyMobileVideocallCalendarComponent {
    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    get dayInput() {
        return $('.schedule-date-input');
    }

    get timeButton() {
        return $('//p[contains(., "Horario")]/following-sibling::button');
    }

    get nextMonthBtn() {
        return $('.react-datepicker__navigation--next');
    }

    get previousMonthBtn() {
        return $('.react-datepicker__navigation--previous');
    }

    get monthHeadingEl() {
        return $('.react-datepicker__current-month');
    }

    get closeDrawerBtn() {
        return $('//button[@aria-label="Cerrar"]');
    }

    private getBandButton(band: TimeBand) {
        return $(`//button[contains(., "${band}:")]`);
    }

    private buildDayOptionText(date: DateTime): string {
        const enDate = date.setLocale('en-US');
        return `${enDate.toFormat('cccc')}, ${enDate.toFormat('MMMM')} ${enDate.day}${getOrdinalSuffix(enDate.day)}, ${enDate.year}`;
    }

    private dayOptionLocator(date: DateTime) {
        return $(`//*[@role="option" and contains(@aria-label, "${this.buildDayOptionText(date)}")]`);
    }

    private async getVisibleMonth(): Promise<DateTime> {
        const text = (await this.monthHeadingEl.getText()).trim();
        return DateTime.fromFormat(text, 'MMMM yyyy', { locale: 'en-US' }).startOf('month');
    }

    // Navega el calendario (adelante/atrás) hasta que la opción del día objetivo se renderice.
    // Devuelve null si no es alcanzable — react-datepicker saca el botón Next/Previous del DOM
    // (no lo deshabilita) al llegar a un límite navegable (ej. la ventana de 30 días).
    private async navigateToDayOption(date: DateTime): Promise<ReturnType<typeof $> | null> {
        const targetMonth = date.startOf('month');
        const maxAttempts = 24;

        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const option = this.dayOptionLocator(date);
            if (await option.isDisplayed().catch(() => false)) return option;

            const visibleMonth = await this.getVisibleMonth();
            const monthsAway = Math.round(targetMonth.diff(visibleMonth, 'months').months);
            if (monthsAway === 0) return null;

            const navBtn = monthsAway > 0 ? this.nextMonthBtn : this.previousMonthBtn;
            if (!(await navBtn.isExisting())) return null;
            if ((await navBtn.getAttribute('disabled')) !== null) return null;

            await this.jsClick(navBtn);
            await browser.pause(300);
        }
        return null;
    }

    async selectAssistanceDay(date: DateTime): Promise<void> {
        await this.dayInput.waitForDisplayed({ timeout: 10_000 });
        await this.jsClick(this.dayInput);
        const dayOption = await this.navigateToDayOption(date);
        if (!dayOption) throw new Error(`No se pudo seleccionar la fecha ${date.toISODate()}: no alcanzable dentro del rango navegable del calendario.`);
        await this.jsClick(dayOption);
        await browser.pause(500);
    }

    async isDayDisabled(date: DateTime): Promise<boolean> {
        await this.jsClick(this.dayInput);
        const dayOption = await this.navigateToDayOption(date);
        if (!dayOption) return true;
        return (await dayOption.getAttribute('aria-disabled')) === 'true';
    }

    // El primer horario libre de la franja se elige vía JS (busca por texto exacto "HH:MM h") en
    // vez de resolver un ChainablePromiseElement — más simple y confiable que armar el filtro con
    // $$() + regex, mismo criterio que el resto de los "jsClick" de este proyecto.
    async selectAssistanceTime(options?: { band?: TimeBand }): Promise<void> {
        const { band = 'Mañana' } = options || {};
        await this.timeButton.waitForDisplayed({ timeout: 10_000 });
        await this.jsClick(this.timeButton);
        const bandBtn = this.getBandButton(band);
        await bandBtn.waitForDisplayed({ timeout: 10_000 });
        await this.jsClick(bandBtn);
        await browser.pause(500);

        const clicked = await browser.execute(() => {
            const slot = Array.from(document.querySelectorAll('button')).find((b) => /^\d{1,2}:\d{2}\s*h$/.test((b.textContent || '').trim()));
            if (!slot) return false;
            (slot as HTMLElement).click();
            return true;
        });
        if (!clicked) throw new Error(`No hay horarios disponibles para la franja "${band}".`);
    }

    async verifyAllTimeBandsVisible(): Promise<void> {
        await this.jsClick(this.timeButton);
        await this.getBandButton('Mañana').waitForDisplayed({ timeout: 10_000 });
        const [afternoon] = await $$('//button[contains(., "Tarde:")]');
        const [evening] = await $$('//button[contains(., "Noche:")]');
        if (!afternoon) throw new Error('Franja "Tarde" no visible.');
        if (!evening) throw new Error('Franja "Noche" no visible.');
        await this.jsClick(this.closeDrawerBtn);
    }
}
