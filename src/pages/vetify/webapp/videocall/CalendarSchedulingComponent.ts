import { getRandomElement } from '@helpers/automation-utils';
import { BasePage } from '@pages/BasePage';
import { type Locator, type Page } from '@playwright/test';
import { DateTime } from 'luxon';

export class VetifyWebappCalendarSchedulingComponent extends BasePage {
    readonly timeOptions: Locator;

    constructor(page: Page) {
        super(page);
        this.timeOptions = page.locator('div[role="radiogroup"] label');
    }

    async selectAssistanceDay(date: DateTime, options?: { waitForResponse: boolean }) {
        const { waitForResponse = true } = options || {};
        const selectedDate = date.toLocaleString(DateTime.DATE_FULL);
        const dateLocator = this.page.locator(`[aria-label="${selectedDate}"]`);

        const monthsDiff = Math.max(0, Math.round(date.diffNow().as('months')));
        const navSelector = 'button.react-calendar__navigation__next-button';
        const navButton = this.page.locator(navSelector);
        await navButton.scrollIntoViewIfNeeded();

        const maxAttempts = monthsDiff + 1;
        let attempts = 0;
        while (attempts < maxAttempts && !(await dateLocator.isVisible())) {
            await navButton.click({ delay: 300 });
            attempts++;
        }

        if (!(await dateLocator.isVisible())) {
            throw new Error(`Date ${selectedDate} not visible after ${attempts} navigation attempts`);
        }

        const waitFor: Promise<any>[] = [dateLocator.click()];

        if (waitForResponse) {
            waitFor.push(
                this.page.waitForResponse(
                    (response) => response.url().includes(`/api/services/pets/available-time-schedules?date=${date.toFormat('yyyy-MM-dd')}`) && response.status() === 200,
                ),
            );
        }

        await Promise.all(waitFor);
    }

    async selectAssistanceTime(time?: string): Promise<void> {
        const timeSlots = await this.timeOptions.all();

        if (time !== undefined) {
            for (const ts of timeSlots) {
                const timeText = await ts.innerText();
                if (timeText === time) {
                    await ts.click();
                    break;
                }
            }
        } else {
            // click on a random time
            const randomTime = getRandomElement(timeSlots)!;
            await randomTime.click();
        }
    }
}
