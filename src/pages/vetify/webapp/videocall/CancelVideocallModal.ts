import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

export class VetifyWebappCancelVideocallModal extends BasePage {
    readonly assistanceId: string;

    readonly container: Locator;
    readonly closeBtn: Locator;
    readonly titleLbl: Locator;
    readonly subTitleLbl: Locator;
    readonly confirmationBtn: Locator;
    readonly reasonSelect: Locator;
    readonly reasonsOptions: Locator;

    constructor(page: Page, assistanceId: string) {
        super(page);
        this.assistanceId = assistanceId;

        this.container = page.locator('div[role="dialog"]');
        this.closeBtn = this.container.locator('button[data-part="close-trigger"]');
        this.titleLbl = this.container.locator('//p[1]');
        this.subTitleLbl = this.container.locator('//p[2]');
        this.confirmationBtn = this.container.getByRole('button', { name: 'Cancelar turno' });
        this.reasonSelect = this.container.locator('select');
        this.reasonsOptions = this.reasonSelect.locator('option');
    }

    async waitForComponentLoaded() {
        await this.page.waitForResponse((response) => response.url().includes('/api/services/pets/cancel_reasons') && response.status() === 200);
    }

    async confirmCancelation(): Promise<void> {
        await Promise.all([
            this.confirmationBtn.click(),
            this.page.waitForResponse((response) => response.url().includes(`/api/services/pets/cancel/${this.assistanceId}`) && response.status() === 200),
        ]);
    }
}
