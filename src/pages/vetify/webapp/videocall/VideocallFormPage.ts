import { expect, Page, Locator } from '@playwright/test';
import { DateTime } from 'luxon';
import * as path from 'path';
import { getRandomInt, getRandomElement } from '@helpers/Utils';
import { VetifyWebAppLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { VetifyWebappCalendarSchedulingComponent } from '@pages/vetify/webapp/videocall/CalendarSchedulingComponent';

export class VetifyWebappVideocallFormPage extends VetifyWebAppLoggedBasePage {
    readonly pageContainer: Locator;
    readonly pageTitle: Locator;

    // Step 1 Form elements
    readonly petOptions: Locator;
    readonly uploadCredentialLink: Locator;
    readonly reasonInput: Locator;
    readonly calendarComponent: VetifyWebappCalendarSchedulingComponent;
    readonly backBtn: Locator;
    readonly continueBtn: Locator;
    readonly errorMessage: Locator;

    // Step 2 Form elements
    readonly additionalFilesInput: Locator;
    readonly commentInput: Locator;
    readonly requestAssistanceBtn: Locator;
    readonly fileFeedbackName: Locator;
    readonly discardFileBtn: Locator;

    constructor(page: Page) {
        super(page, '/service/493/create/questions?isNow=false');

        this.pageContainer = page.locator('');
        this.pageTitle = page.locator('h2');

        // Step 1
        this.petOptions = page.locator('div.chakra-wrap__listitem > button');
        this.uploadCredentialLink = page.getByRole('link', { name: /cargar credencial/i });
        this.reasonInput = page.locator('[data-cy="Motivo de la consultaInput"]');
        this.backBtn = page.locator('[data-cy="backButton"]');
        this.continueBtn = page.getByRole('button', { name: /continuar/i });
        this.errorMessage = page.locator('.error-message, [role="alert"]');
        this.calendarComponent = new VetifyWebappCalendarSchedulingComponent(page);

        // Step 2
        this.additionalFilesInput = page.locator('input[type="file"]');
        this.commentInput = page.locator('textarea[data-cy="additionalInfoInput"]');
        this.requestAssistanceBtn = page.getByRole('button', { name: /solicitar asistencia/i });
        this.fileFeedbackName = page.locator('.uploaded-file-name');
        this.discardFileBtn = page.locator('[data-cy="filePreviewDelete"]');
    }

    async waitForPageLoaded() {
        await Promise.all([
            super.waitForPageLoaded(),
            this.page.waitForResponse(response =>
                response.url().includes('/api/services/service/detail/493') && response.status() === 200
            ),
            this.page.waitForResponse(response =>
                response.url().includes('/create/questions/grouped?isNow=false') && response.status() === 200
            ),
            this.page.waitForResponse(response =>
                response.url().includes('/api/services/pets/available-time-schedules') && response.status() === 200
            ),
        ]);
    }

    async fillStepOne(data?: { petName?: string; reason?: string; date?: DateTime; time?: string }) {
        const monthOffset = getRandomInt(0, 3);
        const dayOffset = getRandomInt(1, 10);
        const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });
        const {
            petName,
            reason = `Consulta ${Date.now()}`,
            date = selectedDay,
            time
        } = data || {};

        // Select pet option (click matching name or random)
        const petItems = await this.petOptions.all();

        if (petName !== undefined) {
            for (const p of petItems) {
                const label = p.locator('p');
                const name = await label.innerText();
                if (petName === name) {
                    await p.click();
                    break;
                }
            }
        } else {
            // Click on a random pet
            const randomPet = getRandomElement(petItems)!;
            await randomPet.click();
        }

        // Fill reason
        await this.reasonInput.fill(reason);

        // Select date
        await this.calendarComponent.selectAssistanceDay(date);

        // Select time
        await this.calendarComponent.selectAssistanceTime(time);
    }

    async selectAdditionalFile(filePath?: string): Promise<string> {
        if (!filePath) {
            filePath = path.join(process.cwd(), 'src/fixtures/files/test-pdf.pdf');
        }

        const fileChooserPromise = this.page.waitForEvent('filechooser');
        await this.page.getByRole('button', { name: 'Adjuntar foto o video' }).click();
        const fileChooser = await fileChooserPromise;
        const [response] = await Promise.all([
            this.page.waitForResponse(reponse =>
                (reponse.url()).includes('/api/files/upload/pets') && reponse.status() === 200
            ),
            fileChooser.setFiles(filePath),
        ]);
        const { id: fileId } = await response.json();
        expect(fileId).toBeDefined();

        return fileId;
    }
}