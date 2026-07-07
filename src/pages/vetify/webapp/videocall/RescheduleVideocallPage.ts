import { Page, Locator } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { VetifyWebappCalendarSchedulingComponent } from '@pages/vetify/webapp/videocall/CalendarSchedulingComponent';

export class VetifyWebappRescheduleVideocallPage extends VetifyWebappLoggedBasePage {
    private assistanceId: string;

    // Calendar component
    readonly calendarComponent: VetifyWebappCalendarSchedulingComponent;

    // Actions
    readonly backBtn: Locator;
    readonly saveBtn: Locator;

    constructor(page: Page, assistanceId: string) {
        super(page, `/petsAssistance/reprogramarTurno/${assistanceId}`);
        this.assistanceId = assistanceId;

        // Calendar component
        this.calendarComponent = new VetifyWebappCalendarSchedulingComponent(page);

        // Actions
        this.backBtn = page.locator('button[data-cy="backButton"]');
        this.saveBtn = page.locator('button[data-cy="loadingButton"]');
    }

    async waitForPageLoaded() {
        await Promise.all([
            super.waitForPageLoaded(),
            this.page.waitForResponse((response) => response.url().includes(`/api/services/pets/appointment/${this.assistanceId}`) && response.status() === 200),
        ]);
    }
}
