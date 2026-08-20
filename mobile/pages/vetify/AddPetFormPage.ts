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

    // Mismo locator y mismo texto que Desktop, confirmado en vivo con un dump: 1 caracter dispara
    // "El nombre debe tener al menos 2 caracteres".
    get petNameErrorLbl() {
        return $('span[data-part="error-text"]');
    }

    // Encabezado real del paso 0 (antes de cerrar el modal de advertencia) — confirmado en vivo
    // que cerrar el modal (dismissStartWarningModal) YA deja al usuario en el paso 1, no en un
    // paso 0 intermedio separado (a diferencia de cómo Desktop separa el modal del paso 0 en sí).
    get startScreenHeadingLbl() {
        return $('//h2[contains(., "¡Vamos a empezar!")]');
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

    async clickBack(): Promise<void> {
        await this.jsClick(this.backButton);
    }

    async isContinueDisabled(): Promise<boolean> {
        return (await this.continueButton.getAttribute('disabled')) !== null;
    }

    // Quita el foco del input activo (equivalente a Desktop tocando stepTitleLbl para disparar la
    // validación on-blur) — vía JS en vez de un locator adicional.
    async blurActiveElement(): Promise<void> {
        await browser.execute(() => (document.activeElement as HTMLElement | null)?.blur());
    }

    // Mismo hallazgo que VideocallFormPage.typeIntoReactInput(): clearValue()+setValue() no
    // reemplaza confiablemente un input controlado por React cuando ya tiene contenido — se
    // reemplaza el valor vía el setter nativo de HTMLInputElement y se dispara un evento "input"
    // real, necesario acá porque este paso se re-escribe varias veces en las pruebas de
    // validación (1 char → 101 chars → nombre válido).
    async fillPetName(name: string): Promise<void> {
        const el = await this.petNameInput;
        await browser.execute(
            (node: HTMLElement, value: string) => {
                const input = node as HTMLInputElement;
                // Foco explícito: a diferencia de un setValue() real (que enfoca el input como
                // parte de "escribir"), setear el valor vía el setter nativo no lo hace por sí
                // solo — sin esto, document.activeElement nunca es este input y un blur posterior
                // (blurActiveElement) no dispara la validación on-blur del campo.
                input.focus();
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                nativeSetter?.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            },
            el,
            name,
        );
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

    // Abre el combobox y devuelve el texto de todas las opciones listadas, para comparar contra
    // el listado real de la API (igual que Desktop's TC-11/TC-12).
    async getBreedOptionTexts(): Promise<string[]> {
        await this.jsClick(this.petBreedTrigger);
        const options = await this.petBreedOptions;
        const texts: string[] = [];
        for (const opt of options) {
            texts.push((await opt.getText()).trim());
        }
        return texts;
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

    // Paso 5 — foto: IMP-011 (docs/impedimentos-bloqueos.md) RESUELTO vía workaround — setear el
    // <input type="file"> directo (setInputFiles()/setValue() con ruta de host) crashea el WebView
    // embebido de esta app. Se usa BasePage.selectFileViaNativePicker() en su lugar: toca el
    // <label> visible (igual que un usuario real) y navega el selector nativo de fotos de Android
    // que se abre. Requiere que la foto ya exista en la galería del dispositivo/emulador (adb push
    // + media scan) — no sube un archivo nuevo, selecciona uno ya presente.
    get petPhotoFileInput() {
        return $('input[id="pet-photo-file-input"]');
    }

    get petPhotoFileLbl() {
        return $('label[for="pet-photo-file-input"]');
    }

    get petPhotoPreviewImg() {
        return $('img[alt="Foto de tu mascota"]');
    }

    // Mismo locator que petPhotoFileLbl — una vez subida la foto, tocar el mismo trigger permite
    // elegir otra (igual que Playwright's changePhotoBtn).
    get changePhotoBtn() {
        return $('label[for="pet-photo-file-input"]');
    }

    async uploadPetFilePhoto(): Promise<void> {
        await this.selectFileViaNativePicker('label[for="pet-photo-file-input"]');
    }

    // Paso final — pantalla de felicitación, igual que Playwright's congratsHeadingLbl/goToHomeBtn.
    // No usado por ningún spec activo todavía (los específicos de wizard nunca llegan a enviar el
    // formulario final, a propósito, para no consumir cuentas del pool compartidas) — sí usado por
    // scripts de provisión de cuentas que SÍ necesitan completar el alta real.
    get congratsHeadingLbl() {
        return $('//h2[contains(., "ya tiene su credencial lista")]');
    }

    get goToHomeBtn() {
        return $('//button[contains(., "Ir al inicio")]');
    }

    async goToHome(): Promise<void> {
        await this.jsClick(this.goToHomeBtn);
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
