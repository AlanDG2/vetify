import { getRandomElement, wait } from '@helpers/automation-utils';
import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';
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
    readonly usarCamaraBtn: Locator;
    readonly petPhotoPreviewImg: Locator;
    readonly changePhotoBtn: Locator;
    // Congrats Step
    readonly congratsHeadingLbl: Locator;
    readonly goToHomeBtn: Locator;
    // Paso condicional "Asigná el plan de la credencial" (ver getStepNumber())
    readonly planSelectionDropdown: Locator;

    private petId: string | undefined;
    private petName: string | undefined;

    constructor(page: Page, petId?: string) {
        super(page, petId ? `/pets/${petId}` : '/pets');

        this.petId = petId;

        this.backButton = this.page.locator('button[data-cy="backButton"]');
        this.startWarningModalTitle = this.page.getByText('Asegurate de completar bien los datos', { exact: true });

        this.startWarningContinueBtn = this.page.locator('xpath=//h2[contains(text(), "Asegurate de completar bien los datos")]/../button');

        this.continueButton = this.page.getByRole('button', { name: 'Continuar' });
        // Entrando desde el flujo de videollamada ("credencial faltante" → "Completar credencial"),
        // el paso inicial muestra el título del paso Y el modal de advertencia ("Asegurate de
        // completar bien los datos") al mismo tiempo — un getByRole genérico matchea ambos h2 y
        // rompe en modo estricto. Se excluye explícitamente el heading del modal (ya cubierto por
        // startWarningModalTitle) para que este locator siga sirviendo para cualquier paso del flujo.
        this.stepTitleLbl = this.page.getByRole('heading', { level: 2 }).filter({ hasNotText: 'Asegurate de completar bien los datos' });
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
        // Confirmado en vivo 2026-09-07: es un <label for="pet-photo-camera-input"> con texto "Usar
        // cámara" que dispara el input de archivo oculto de arriba (atributo HTML `capture="environment"`,
        // sin lógica propia de la webapp para habilitar/deshabilitar según disponibilidad real de cámara
        // -- delega 100% en el selector nativo del SO). Nunca está disabled/oculto en el DOM.
        this.usarCamaraBtn = this.page.locator('label[for="pet-photo-camera-input"]');
        this.petPhotoPreviewImg = this.page.locator('img[alt="Foto de tu mascota"]');
        this.changePhotoBtn = this.page.locator('label[for="pet-photo-file-input"]');
        // Congrats Step
        this.congratsHeadingLbl = this.page.getByRole('heading', { name: /ya tiene su credencial lista/ });
        this.goToHomeBtn = this.page.getByRole('button', { name: 'Ir al inicio' });
        // Paso condicional "Asigná el plan de la credencial" — único combobox visible en ese paso.
        this.planSelectionDropdown = this.page.getByRole('combobox');
    }

    async waitForPageLoaded() {
        await Promise.all([this.page.waitForResponse((response) => response.url().includes('/api/services/pets/especies') && response.status() === 200)]);
    }

    @step('Verificar que la pantalla inicial del formulario de mascota es visible')
    async verifyStartStepVisible(): Promise<void> {
        await expect(this.stepTitleLbl).toHaveText('¡Vamos a empezar!');
    }

    // El modal de advertencia se superpone al primer paso con su PROPIO botón "Continuar" — hay que
    // cerrarlo antes de poder tocar el "Continuar" del paso (si no, el genérico matchea 2 elementos).
    @step('Cerrar el modal de advertencia inicial')
    async dismissStartWarningModal(): Promise<void> {
        await this.startWarningContinueBtn.click();
        await expect(this.startWarningModalTitle).toBeHidden();
    }

    @step('Completar el nombre de la mascota')
    async fillPetName(name: string): Promise<void> {
        await this.petNameInput.fill(name);
    }

    @step('Continuar al siguiente paso del formulario')
    async clickContinue(): Promise<void> {
        await this.continueButton.click();
    }

    @step('Verificar la pantalla de felicitación con la credencial completada')
    async verifyCongratsScreen(petName: string): Promise<void> {
        // El botón de esta pantalla es contextual: "Ir al inicio" cuando se llega desde el flujo normal
        // de Mascotas (ver credentials.spec.ts, usa goToHomeBtn directo, no este método), "Continuar"
        // cuando se llega desde una solicitud de videollamada interrumpida por falta de credencial
        // (CA05 IMAS-3899/IMAS-4102 — retoma el flujo en vez de ir a Home). No se afirma un botón
        // específico acá; cada caller verifica el que corresponda a su contexto.
        await expect(this.congratsHeadingLbl).toHaveText(`¡${petName} ya tiene su credencial lista!`);
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

        // Paso condicional, sin HU asociada (confirmado en vivo vía MCP 2026-09-22): si la cuenta
        // tiene 2+ "planes libres" (estado LIBRE sin mascota, ver VetifyWebappApiClient.getUserPets()),
        // el wizard inserta este paso de desambiguación entre el paso 0 y el paso 1 — no aparece para
        // cuentas con un único plan libre (mayoría del pool). Se resuelve acá mismo (cualquier plan
        // disponible sirve, el test no valida a qué plan queda asociada la credencial) para que el
        // resto del flujo y todos los callers de este método no necesiten saber que este paso existe.
        if (stepTitleText.trim() === 'Asigná el plan de la credencial') {
            await this.planSelectionDropdown.selectOption({ index: 1 }); // index 0 = "Seleccionar" (placeholder deshabilitado)
            await this.continueButton.click();
            return this.getStepNumber();
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

    // Mismo endpoint y comportamiento que uploadPetFilePhoto -- confirmado en vivo 2026-09-07 que
    // "Usar cámara" y "Cargá el archivo" son 2 inputs de archivo distintos que alimentan el mismo
    // POST /api/files/upload/pets, sin diferencia de backend entre ambos caminos.
    async uploadPetCameraPhoto(filePath: string): Promise<string> {
        const [response] = await Promise.all([
            this.page.waitForResponse((response) => response.url().includes('/api/files/upload/pets') && response.status() === 200),
            this.petPhotoCameraInput.setInputFiles(filePath),
        ]);

        if (!response.ok()) {
            throw new Error(`Failed to upload file: ${response.statusText()}`);
        }

        const data: any = await response.json();
        return data.id;
    }
}
