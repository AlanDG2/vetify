import { $, $$, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Locators calcados de src/pages/vetify/webapp/credentials/AddPetFormPage.ts (Playwright) donde
// fue posible. Cubre los pasos 0 a 5 del wizard completo (inicio, nombre, tipo/género, raza,
// edad, foto).
export class VetifyMobileAddPetFormPage extends VetifyMobileLoggedBasePage {
    get startWarningModalTitle() {
        return $('//*[contains(., "Asegurate de completar bien los datos")]');
    }

    // Mismo texto "Continuar" que el botón del modal inicial y el de cada paso del wizard — no
    // ambiguo en la práctica porque nunca están visibles/existen los dos a la vez (uno reemplaza
    // al otro en el DOM al cerrar el modal).
    get continueButton() {
        return $('//button[contains(., "Continuar")]');
    }

    get backButton() {
        return $('button[data-cy="backButton"]');
    }

    get petNameInput() {
        return $('input[placeholder="Escribí el nombre de tu mascota"]');
    }

    async load(): Promise<void> {
        await this.navigateTo('/pets');
    }

    // .click() nativo (por coordenadas) queda interceptado por otro elemento en este layout
    // angosto — mismo hallazgo que MyProfilePage.saveChanges() (ver known-issues.md). Se usa
    // click vía JS en vez de nativo para cualquier botón dentro de este wizard.
    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    async dismissStartWarningModal(): Promise<void> {
        await this.jsClick(this.continueButton);
        await this.startWarningModalTitle.waitForExist({ timeout: 10_000, reverse: true });
    }

    async clickContinue(): Promise<void> {
        await this.jsClick(this.continueButton);
    }

    async fillPetName(name: string): Promise<void> {
        await this.petNameInput.setValue(name);
    }

    // Selección por tipo/género: texto dinámico en un <p>, se usa `contains(., "...")` (probado
    // confiable en esta app) en vez de `contains(text(), "...")` — ver known-issues.md sobre por
    // qué las funciones XPath basadas en `text()` no resuelven acá.
    async selectPetType(petType: string): Promise<void> {
        await this.jsClick($(`//p[contains(., "${petType}")]`));
    }

    async selectPetGender(petGender: string): Promise<void> {
        await this.jsClick($(`//p[contains(., "${petGender}")]`));
    }

    // Paso 3 — raza: combobox de Chakra (no <select> nativo). Las opciones ya existen en el DOM
    // pero ocultas (data-state="closed") hasta abrir el trigger — confirmado en vivo con un dump
    // de HTML antes de escribir esto, no adivinado.
    get petBreedTrigger() {
        return $('button[data-scope="combobox"][data-part="trigger"]');
    }

    get petBreedOptions() {
        return $$('div[data-scope="combobox"][data-part="item"]');
    }

    async selectFirstPetBreed(): Promise<void> {
        await this.jsClick(this.petBreedTrigger);
        const [firstOption] = await this.petBreedOptions;
        if (!firstOption) throw new Error('No hay opciones de raza disponibles');
        await firstOption.waitForDisplayed({ timeout: 10_000 });
        await browser.execute((node: HTMLElement) => node.click(), firstOption);
    }

    // Paso 4 — edad: 2 <select> nativos (años/meses), a diferencia de raza. selectByIndex no
    // depende de conocer los value/label reales de cada <option> (a diferencia de Playwright, que
    // sí selecciona por value calculado) — alcanza para probar que el paso se puede completar.
    async selectPetAgeByIndex(yearsIndex: number, monthsIndex: number): Promise<void> {
        const [yearsSelect, monthsSelect] = await $$('select');
        if (!yearsSelect || !monthsSelect) throw new Error('Se esperaban 2 <select> (años/meses) y no se encontraron');
        await yearsSelect.selectByIndex(yearsIndex);
        await monthsSelect.selectByIndex(monthsIndex);
    }

    // Paso 5 — foto: setInputFiles() de Playwright no existe en WebdriverIO. Dos falsas pistas
    // probadas y descartadas en vivo antes de llegar a esto:
    //  1. browser.uploadFile() — falla con "not available in undefined": depende del comando W3C
    //     `file` (zip a un servidor Selenium/chromedriver standalone) que Appium no expone.
    //  2. browser.pushFile() + ruta de DISPOSITIVO — falla con "path is not absolute": el
    //     input[type=file] de este WebView se maneja vía chromedriver (proxy de Appium al Chrome
    //     del dispositivo), y chromedriver espera una ruta absoluta del HOST (Windows), no del
    //     dispositivo — transfiere el archivo él solo a través del túnel de debugging.
    // Lo que sí funciona: pasar la ruta LOCAL (host) directo a setValue(), igual que Playwright.
    get petPhotoFileInput() {
        return $('input[id="pet-photo-file-input"]');
    }

    get petPhotoPreviewImg() {
        return $('img[alt="Foto de tu mascota"]');
    }

    async uploadPetPhoto(localPath: string): Promise<void> {
        const input = await this.petPhotoFileInput;
        // El input real está oculto (style="display: none"; el trigger visible es un botón que lo
        // clickea por detrás) — setValue() de WebdriverIO exige "displayed" antes de escribir, a
        // diferencia de setInputFiles() de Playwright que ignora visibilidad. Se fuerza visible por
        // JS solo para pasar ese chequeo; no afecta el resultado funcional.
        await browser.execute((node: HTMLElement) => {
            node.style.display = 'block';
        }, input);
        await input.setValue(localPath);
    }

    // Igual que MyProfilePage.getAllParagraphTexts() — $$('h2') con CSS es confiable, xpath con
    // funciones de texto no. Filtra el título del modal (puede seguir en el DOM oculto) y
    // devuelve el primer heading real de la pantalla.
    async getCurrentStepTitle(): Promise<string> {
        const headings = await $$('h2');
        for (const h of headings) {
            const text = (await h.getText()).trim();
            if (text && text !== 'Asegurate de completar bien los datos') {
                return text;
            }
        }
        throw new Error('No se encontró ningún heading de paso visible');
    }
}
