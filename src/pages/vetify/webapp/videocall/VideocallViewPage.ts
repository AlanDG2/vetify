import { Page, Locator } from '@playwright/test';
import { wait } from '@helpers/Utils';
import { VetifyWebAppLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';

export class VetifyWebappVideocallViewPage extends VetifyWebAppLoggedBasePage {
    private assistanceId: string;

    readonly pageContainer: Locator;
    readonly pageTitle: Locator;
    readonly pageSubTitle: Locator;

    // Form
    readonly petsList: Locator;
    readonly scheduledDateLbl: Locator;
    readonly scheduledTimeLbl: Locator;
    readonly rescheduleBtn: Locator;
    readonly reasonInput: Locator;

    // Actions
    readonly cancelVideocallBtn: Locator;
    readonly backBtn: Locator;
    readonly saveBtn: Locator;

    // Re-schedule Modal
    readonly rescheduleModalConfirmBtn: Locator;

    // Re-schedule Confirmation Modal
    readonly rescheduleConfirmationModalTitleLbl: Locator;
    readonly rescheduleConfirmationModalOkBtn: Locator;

    constructor(page: Page, assistanceId: string,) {
        super(page, `/petsAssistance/${assistanceId}`);
        this.assistanceId = assistanceId;

        this.pageContainer = page.locator('[data-cy="cancelOrRescheduleBox"]');
        this.pageTitle = page.locator('//div[@data-cy="cancelOrRescheduleBox"]/div[2]/div/div[1]/div/div[2]/div[1]/div/div[2]//p[1]');
        this.pageSubTitle = page.locator('//div[@data-cy="cancelOrRescheduleBox"]/div[2]/div/div[1]/div/div[2]/div[1]/div/div[2]//p[2]');

        // Form
        this.petsList = page.locator('//div[@data-cy="cancelOrRescheduleBox"]/div[2]/div/div[2]//button');
        this.rescheduleBtn = page.getByRole('button', { name: /reprogramar/i });
        this.reasonInput = page.locator('input[data-cy="motivoInput"]');
        this.scheduledDateLbl = page.locator('//div[@data-cy="cancelOrRescheduleBox"]/div[2]/div/div[3]/div/div/div/div/div[1]/p[2]');
        this.scheduledTimeLbl = page.locator('//div[@data-cy="cancelOrRescheduleBox"]/div[2]/div/div[3]/div/div/div/div/div[2]/p[2]');

        // Actions
        this.cancelVideocallBtn = page.locator(`(//button[contains(text(), 'Cancelar')])[1]`);
        this.saveBtn = page.getByRole('button', { name: /guardar/i });
        this.backBtn = page.locator(`(//button[contains(text(), 'Cancelar')])[2]`);

        // Re-schedule modal
        this.rescheduleModalConfirmBtn = page.locator('div[role="dialog"] button.button');

        // Re-schedule Confirmation Modal
        this.rescheduleConfirmationModalTitleLbl = page.locator('//div[@role="dialog"]//p[1]');
        this.rescheduleConfirmationModalOkBtn = page.locator('//div[@role="dialog"]//button');
    }

    async waitForPageLoaded() {
        await Promise.all([
            super.waitForPageLoaded(),
            this.page.waitForResponse(response =>
                response.url().includes(`/api/services/pets/appointment/${this.assistanceId}`) && response.status() === 200
            ),
            this.page.waitForResponse(response =>
                response.url().includes('/api/services/pets/my-products') && response.status() === 200
            ),
            this.saveBtn.waitFor({ state: 'visible' }),
        ]);
        // Wait for the re-render of the UI
        await wait(3_000);
    }

    // TODO: Refactor this method with best practices
    async getSelectedPet(): Promise<Locator> {
        const petsList = await this.petsList.all();

        // Prevent hover affect tests
        await this.backBtn.hover()

        let selectedPet: Locator | undefined;
        for (const pet of petsList) {
            const backgroundColor = await pet.evaluate((el) => {
                return window.getComputedStyle(el).backgroundColor;
            });
            console.log({ backgroundColor });
            if (backgroundColor === 'rgb(209, 211, 212)') {
                selectedPet = pet;
                break;
            }
        }

        if (selectedPet === undefined) {
            throw new Error('No pet selected');
        }

        return selectedPet;
    }
}