import { getRandomElement } from '@helpers/automation-utils';
import { BasePage } from '@pages/BasePage';
import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { DateTime } from 'luxon';

type TimeBand = 'Mañana' | 'Tarde' | 'Noche' | 'Madrugada';

// react-datepicker renders aria-labels in English regardless of the app's locale
// (e.g. "Choose Tuesday, August 4th, 2026" / "Not available <date>" when disabled).
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

export class VetifyWebappCalendarSchedulingComponent extends BasePage {
    readonly dayInput: Locator;
    readonly timeButton: Locator;
    readonly nextMonthBtn: Locator;
    readonly previousMonthBtn: Locator;
    readonly monthHeading: Locator;
    readonly timeSlotButtons: Locator;
    readonly closeDrawerBtn: Locator;
    readonly morningBandBtn: Locator;
    readonly afternoonBandBtn: Locator;
    readonly eveningBandBtn: Locator;
    readonly nightBandBtn: Locator;

    constructor(page: Page) {
        super(page);
        // "Día": a react-datepicker text input. It has no explicit <label>, so its accessible
        // name falls back to its own placeholder ("Seleccionar") — even after a date is picked.
        this.dayInput = page.getByRole('textbox', { name: 'Seleccionar' });
        // "Horario": a <button> (not an input) that opens the time-band Drawer/Bottom Sheet.
        this.timeButton = page.locator('p:text-is("Horario")').locator('xpath=following-sibling::button');
        this.nextMonthBtn = page.getByRole('button', { name: 'Next Month' });
        this.previousMonthBtn = page.getByRole('button', { name: 'Previous Month' });
        // The wizard restores an in-progress form (including a previously viewed/selected date)
        // from sessionStorage on load, so the calendar can open showing a month other than the
        // current one — this heading is how we detect which month is actually on screen.
        this.monthHeading = page.getByRole('dialog', { name: 'Choose Date' }).getByRole('heading', { level: 2 });
        this.timeSlotButtons = page.getByRole('button').filter({ hasText: /^\d{1,2}:\d{2} h$/ });
        this.closeDrawerBtn = page.getByRole('button', { name: 'Cerrar' });
        this.morningBandBtn = page.getByRole('button', { name: /^Mañana:/ });
        this.afternoonBandBtn = page.getByRole('button', { name: /^Tarde:/ });
        this.eveningBandBtn = page.getByRole('button', { name: /^Noche:/ });
        this.nightBandBtn = page.getByRole('button', { name: /^Madrugada:/ });
    }

    private buildDayOptionText(date: DateTime): string {
        const enDate = date.setLocale('en-US');
        // Common suffix shared by both the "Choose ..." (enabled) and "Not available ..." (disabled)
        // accessible names, so a single filter matches the date regardless of its state.
        return `${enDate.toFormat('cccc')}, ${enDate.toFormat('MMMM')} ${enDate.day}${getOrdinalSuffix(enDate.day)}, ${enDate.year}`;
    }

    private getBandButton(band: TimeBand): Locator {
        const bandButtons: Record<TimeBand, Locator> = {
            Mañana: this.morningBandBtn,
            Tarde: this.afternoonBandBtn,
            Noche: this.eveningBandBtn,
            Madrugada: this.nightBandBtn,
        };
        return bandButtons[band];
    }

    // Reads which month is actually on screen right now — react-datepicker resets its view to the
    // current month every time the day input is (re-)opened, regardless of which month a previous
    // call left it showing, so callers can't assume where navigation starts from.
    private async getVisibleMonth(): Promise<DateTime> {
        const headingText = (await this.monthHeading.textContent()) ?? '';
        return DateTime.fromFormat(headingText.trim(), 'MMMM yyyy', { locale: 'en-US' }).startOf('month');
    }

    // Navigates the datepicker's month view (forward or backward, as needed) until the target
    // date's option (enabled or disabled) is rendered — react-datepicker only renders one month at
    // a time. Returns null if the target month can't be reached: react-datepicker removes the
    // relevant Next/Previous Month button from the DOM entirely (rather than disabling it) once a
    // navigable boundary is hit (e.g. the 30-day scheduling window), and .count() checks the DOM
    // immediately without Playwright's actionability auto-wait, so a missing button is detected
    // right away instead of hanging until the action timeout on a disabled/absent locator.
    private async navigateToDayOption(date: DateTime): Promise<Locator | null> {
        // getByRole(name) matches the option's accessible name (its aria-label carries the full
        // date — "Choose ..."/"Not available ..."); a text-content filter would only ever see the
        // bare day number ("26") that's actually rendered inside the element.
        const dayOption = this.page.getByRole('option', { name: this.buildDayOptionText(date), exact: false });
        const targetMonth = date.startOf('month');

        const maxAttempts = 24;
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            if (await dayOption.isVisible()) return dayOption;

            const visibleMonth = await this.getVisibleMonth();
            const monthsAway = Math.round(targetMonth.diff(visibleMonth, 'months').months);
            if (monthsAway === 0) return null;

            const navBtn = monthsAway > 0 ? this.nextMonthBtn : this.previousMonthBtn;
            const canNavigate = (await navBtn.count()) > 0 && !(await navBtn.isDisabled());
            if (!canNavigate) return null;
            await navBtn.click({ delay: 300 });
        }
        return null;
    }

    @step('Seleccionar día del turno en el calendario')
    async selectAssistanceDay(date: DateTime, options?: { waitForResponse: boolean }): Promise<void> {
        const { waitForResponse = true } = options || {};
        await this.dayInput.click();
        const dayOption = await this.navigateToDayOption(date);
        if (!dayOption) throw new Error(`Date option for ${date.toISODate()} could not be selected: not reachable within the calendar's navigable range.`);

        const waitFor: Promise<unknown>[] = [dayOption.click()];
        if (waitForResponse) {
            waitFor.push(
                this.page.waitForResponse(
                    (response) => response.url().includes(`/api/services/pets/available-time-schedules?date=${date.toFormat('yyyy-MM-dd')}`) && response.status() === 200,
                ),
            );
        }
        await Promise.all(waitFor);
    }

    @step('Verificar si un día está deshabilitado en el calendario')
    async isDayDisabled(date: DateTime): Promise<boolean> {
        await this.dayInput.click();
        const dayOption = await this.navigateToDayOption(date);
        // A date beyond the calendar's own navigable range (e.g. past the 30-day scheduling
        // window boundary, where "Next Month" itself becomes disabled) is not bookable either way.
        if (!dayOption) return true;
        return (await dayOption.getAttribute('aria-disabled')) === 'true';
    }

    @step('Verificar que una fecha está habilitada para agendar en el calendario')
    async verifyDateIsBookable(date: DateTime): Promise<void> {
        const isDisabled = await this.isDayDisabled(date);
        expect(isDisabled, `La fecha ${date.toISODate()} debería estar habilitada.`).toBeFalsy();
    }

    @step('Verificar que una fecha está deshabilitada para agendar en el calendario')
    async verifyDateIsNotBookable(date: DateTime): Promise<void> {
        const isDisabled = await this.isDayDisabled(date);
        expect(isDisabled, `La fecha ${date.toISODate()} debería estar deshabilitada.`).toBeTruthy();
    }

    @step('Seleccionar horario del turno')
    async selectAssistanceTime(options?: { band?: 'Mañana' | 'Tarde' | 'Noche'; time?: string }): Promise<void> {
        const { band = 'Mañana', time } = options || {};
        await this.timeButton.click();
        await this.getBandButton(band).click();

        if (time !== undefined) {
            await this.timeSlotButtons.filter({ hasText: time }).first().click();
        } else {
            const timeSlots = await this.timeSlotButtons.all();
            const randomTime = getRandomElement(timeSlots)!;
            await randomTime.click();
        }
    }

    @step('Verificar que las 3 franjas horarias (Mañana, Tarde, Noche) están disponibles')
    async verifyAllTimeBandsVisible(): Promise<void> {
        await this.timeButton.click();
        await expect(this.morningBandBtn).toBeVisible();
        await expect(this.afternoonBandBtn).toBeVisible();
        await expect(this.eveningBandBtn).toBeVisible();
        await this.closeDrawerBtn.click();
    }

    @step('Verificar si una franja horaria está deshabilitada')
    async isBandDisabled(band: TimeBand): Promise<boolean> {
        await this.timeButton.click();
        const disabled = await this.getBandButton(band).isDisabled();
        await this.closeDrawerBtn.click();
        return disabled;
    }
}
