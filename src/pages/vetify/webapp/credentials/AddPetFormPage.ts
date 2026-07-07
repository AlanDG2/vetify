import type { Locator, Page } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { getRandomElement, wait } from '@helpers/automation-utils';
import { DateTime } from 'luxon';

type AgeSelectorModeType = 'DateInput' | 'YearsMonthsSelect';

const AGE_SELECTOR_MODE: AgeSelectorModeType = 'YearsMonthsSelect';

export class VetifyWebappAddPetFormPage extends VetifyWebappLoggedBasePage {
    readonly backButton: Locator;
    readonly startWarningModalTitle: Locator;
    readonly startWarningContinueBtn: Locator;
    readonly continueButton: Locator;
    readonly stepTitleLbl: Locator;
    readonly stepSubtitleLbl: Locator;
    // Step 1
    readonly petNameInput: Locator;
    readonly petNameErrorLbl: Locator;
    // Step 3
    readonly petBreedInput: Locator;
    readonly petBreedSelect: Locator;
    // Step 2
    readonly petBreedOptions: Locator;
    // Step 4
    readonly petDateBirthInput: Locator;
    readonly petYearsOldSelect: Locator;
    readonly petMonthsOldSelect: Locator;
    // Step 5
    readonly petPhotoFileInput: Locator;
    readonly petPhotoFileLbl: Locator;
    readonly petPhotoCameraInput: Locator;
    readonly petPhotoPreviewImg: Locator;
    readonly changePhotoBtn: Locator;
    // Congrats Step
    readonly goToHomeBtn: Locator;

    private petId: string | undefined;
    private petName: string | undefined;

    constructor(page: Page, petId?: string) {
        super(page, petId ? `/pets/${petId}` : '/pets');

        this.petId = petId;

        this.backButton = this.page.locator('button[data-cy="backButton"]');
        this.startWarningModalTitle = this.page.getByText('Asegurate de completar bien los datos', { exact: true });

        this.startWarningContinueBtn = this.page.locator('xpath=//h2[contains(text(), "Asegurate de completar bien los datos")]/../button');

        this.continueButton = this.page.getByRole('button', { name: 'Continuar' });
        this.stepTitleLbl = this.page.getByRole('heading', { level: 2 });
        this.stepSubtitleLbl = this.page.locator('//h2/following-sibling::p[1]');

        // Step 1
        this.petNameInput = this.page.locator('input[placeholder="Escribí el nombre de tu mascota"]');
        this.petNameErrorLbl = this.page.locator('span[data-part="error-text"]');
        // Step 2
        // Step 3
        this.petBreedInput = this.page.locator('input[data-scope="combobox"]');
        this.petBreedSelect = this.page.getByRole('combobox'); // this.page.locator('div[data-part="content"][data-scope="combobox"]');
        this.petBreedOptions = this.page.locator('div[data-scope="combobox"] div[data-part="item"]');
        // Step 4
        this.petDateBirthInput = this.page.locator('input.pet-date-input');
        this.petYearsOldSelect = this.page.getByRole('combobox').first();
        this.petMonthsOldSelect = this.page.getByRole('combobox').last();
        // Step 5
        this.petPhotoFileInput = this.page.locator('input[id="pet-photo-file-input"]');
        this.petPhotoFileLbl = this.page.locator('label[for="pet-photo-file-input"]');
        this.petPhotoCameraInput = this.page.locator('input[id="pet-photo-camera-input"]');
        this.petPhotoPreviewImg = this.page.locator('img[alt="Foto de tu mascota"]');
        this.changePhotoBtn = this.page.locator('label[for="pet-photo-file-input"]');
        // Congrats Step
        this.goToHomeBtn = this.page.getByRole('button', { name: 'Ir al inicio' });
    }

    async waitForPageLoaded() {
        await Promise.all([this.page.waitForResponse((response) => response.url().includes('/api/services/pets/especies') && response.status() === 200)]);
    }

    public setPetId(petId: string): void {
        this.petId = petId;
        super.setPath(`/pets/${this.petId}`);
    }

    public setPetName(petName: string): void {
        this.petName = petName;
    }

    async getStepNumber(): Promise<number> {
        const stepTitleText = await this.stepTitleLbl.textContent();
        if (!stepTitleText) {
            throw new Error('Step title label is empty');
        }

        const STEP_TITLES: { [key: string]: number } = {
            '¡Vamos a empezar!': 0,
            '¿Cómo se llama tu mascota?': 1,
            [`${this.petName} es...`]: 2,
            [`¿De qué raza es ${this.petName}?`]: 3,
            [`¿Qué edad tiene ${this.petName}?`]: 4,
            [`Por último, subí una foto de ${this.petName}`]: 5,
        };

        const stepNumber = STEP_TITLES[stepTitleText.trim()];
        if (stepNumber === undefined) {
            throw new Error(`Unknown step title: ${stepTitleText}`);
        }

        return stepNumber;
    }

    async selectPetType(petType: string): Promise<void> {
        await wait(1000);
        const petTypeButton = this.page.locator(`//p[contains(text(), "${petType}")]`);
        await petTypeButton.click();
    }

    async selectPetGender(petGender: string): Promise<void> {
        await wait(1000);
        const petGenderButton = this.page.locator(`//p[contains(text(), "${petGender}")]`);
        await petGenderButton.click();
    }

    async selectRandomPetBreed(): Promise<void> {
        await this.petBreedSelect.click();
        const petBreedOptions = await this.petBreedOptions.all();
        const randomPetBreedOption = getRandomElement(petBreedOptions)!;
        await randomPetBreedOption.click();
    }

    async selectPetAge(dateOfBirth: DateTime): Promise<void> {
        if (AGE_SELECTOR_MODE === 'DateInput') {
            await this.petDateBirthInput.fill(dateOfBirth.toFormat('dd/MM/yyyy'));
        } else if (AGE_SELECTOR_MODE === 'YearsMonthsSelect') {
            const { months = 0, years = 0 } = DateTime.now().diff(dateOfBirth, ['months', 'years']).toObject();
            await this.petYearsOldSelect.selectOption({ value: years.toFixed(0) });
            await this.petMonthsOldSelect.selectOption({ value: months.toFixed(0) });
        } else {
            throw new Error(`Unknown AGE_SELECTOR_MODE: ${AGE_SELECTOR_MODE}`);
        }
    }

    async uploadPetFilePhoto(filePath: string): Promise<string> {
        const [response] = await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/files/upload/pets') && response.status() === 200),
            this.petPhotoFileInput.setInputFiles(filePath),
        ]);

        if (!response.ok()) {
            throw new Error(`Failed to upload file: ${response.statusText()}`);
        }

        const data: any = await response.json();
        return data.id;
    }
}
