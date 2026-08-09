import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export type ProfileTab = 'MisDatos' | 'MisPlanes';

export class VetifyWebappMyProfilePage extends VetifyWebappLoggedBasePage {
    private readonly plansContainer: Locator;
    private readonly tabs: Locator;
    private readonly selectedTab: Locator;
    private readonly loadCredentialButtons: Locator;

    // Vista de perfil (confirmado en vivo 2026-08-08 — pantalla real no tiene tabs "Mis Datos"/"Mis
    // Planes" como asumían los locators de arriba; es una sola tarjeta con avatar, datos y "Editar
    // datos"). Se mantienen los locators/métodos de tabs sin uso conocido, no rotos, por si aplican en
    // otra variante de la pantalla no explorada hoy.
    readonly avatarRoot: Locator;
    readonly avatarFileInput: Locator;
    readonly fullNameLbl: Locator;
    readonly dniLbl: Locator;
    readonly emailLbl: Locator;
    readonly phoneLbl: Locator;
    readonly editDataBtn: Locator;

    // Modo edición ("Editar datos")
    readonly correctDataNoticeLbl: Locator;
    readonly areaCodeInput: Locator;
    readonly phoneNumberInput: Locator;
    readonly saveBtn: Locator;
    readonly profileUpdatedToastLbl: Locator;

    constructor(page: Page) {
        super(page, '/section/myprofile');
        this.plansContainer = this.page.locator('div[id="tabs::rh::content-products"] div[data-part="item-content"]');
        this.tabs = this.page.locator('button[role="tab"]');
        this.selectedTab = this.page.locator('button[role="tab"][aria-selected="true"]');
        this.loadCredentialButtons = this.plansContainer.locator('button[type="button"]');

        // Sin data-cy/data-testid disponibles en esta pantalla (confirmado en vivo) — se usa el
        // data-scope/data-part del componente Avatar de Chakra, el único selector estable disponible.
        this.avatarRoot = this.page.locator('div[data-scope="avatar"][data-part="root"]');
        // Mismo criterio que AddPetFormPage/VideocallFormPage: manejar el <input type="file"> oculto
        // directo con setInputFiles en vez de clickear + esperar el file-chooser del SO (documentado en
        // ese otro POM como flaky en uploads repetidos dentro del mismo test).
        this.avatarFileInput = this.page.locator('input[type="file"]');
        this.dniLbl = this.page.getByText(/^DNI:/);
        // El nombre completo es el <p> inmediatamente anterior al de "DNI: ..." dentro de la misma
        // tarjeta — más robusto que depender de la profundidad del árbol del Avatar de Chakra.
        this.fullNameLbl = this.dniLbl.locator('xpath=preceding-sibling::p[1]');
        this.emailLbl = this.page.getByText(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
        this.phoneLbl = this.page.getByText(/^(Sin telefono cargado|\d[\d\s]*)$/);
        this.editDataBtn = this.page.getByRole('button', { name: 'Editar datos' });

        this.correctDataNoticeLbl = this.page.getByText('Para corregir tu nombre, mail o DNI llamá al 0800 122 1183.');
        this.areaCodeInput = this.page.locator('input[name="areaCode"]');
        this.phoneNumberInput = this.page.locator('input[name="phoneNumber"]');
        this.saveBtn = this.page.getByRole('button', { name: 'Guardar' });
        // Confirmado en vivo: al guardar aparece un toast "Perfil actualizado correctamente" — sin
        // esperarlo, un reload inmediato después de "Guardar" puede adelantarse al guardado real
        // (confirmado con evidencia: el teléfono no persistía sin esta espera).
        this.profileUpdatedToastLbl = this.page.getByText('Perfil actualizado correctamente');
    }

    @step('Verificar que la pantalla de perfil muestra los datos del usuario')
    async verifyProfileDataVisible(): Promise<void> {
        await expect(this.avatarRoot).toBeVisible();
        await expect(this.fullNameLbl).toBeVisible();
        await expect(this.dniLbl).toBeVisible();
        await expect(this.editDataBtn).toBeVisible();
    }

    @step('Abrir el modo de edición de datos ("Editar datos")')
    async openEditData(): Promise<void> {
        await this.editDataBtn.click();
        await expect(this.saveBtn).toBeVisible();
    }

    @step('Cambiar la foto de perfil (seleccionar archivo en el input oculto del avatar)')
    async changeProfilePhoto(filePath: string): Promise<void> {
        await this.avatarFileInput.setInputFiles(filePath);
    }

    @step('Completar el teléfono (único dato personal editable desde esta pantalla)')
    async updatePhone(areaCode: string, phoneNumber: string): Promise<void> {
        await this.areaCodeInput.fill(areaCode);
        await this.phoneNumberInput.fill(phoneNumber);
    }

    @step('Guardar los cambios del perfil')
    async saveChanges(): Promise<void> {
        await this.saveBtn.click();
        await expect(this.profileUpdatedToastLbl).toBeVisible();
    }

    async getCurrentTab(): Promise<ProfileTab> {
        return this.selectedTab.textContent() as Promise<ProfileTab>;
    }

    async switchTab(tabName: ProfileTab): Promise<void> {
        console.log(`Switching to ${tabName}`);
        if (tabName === 'MisDatos') {
            await this.tabs.locator('[data-value="personal"]').click();
            return;
        }

        if (tabName === 'MisPlanes') {
            await this.tabs.locator('[data-value="products"]').click();
            return;
        }

        throw new Error(`Switch to tab ${tabName} is not implemented`);
    }

    // Get all the available plans without pets and click on the first button "Cargar datos"
    // If no available credential to be loaded the function throw an error
    async loadPetCredential() {
        // Find all the "Cargar datos" buttons
        const loadCredentialButtons = this.plansContainer.locator('button[type="button"]');
        const count = await loadCredentialButtons.count();

        if (count === 0) {
            throw new Error('No plan with credentias to be loaded');
        }

        await loadCredentialButtons.nth(0).click();
    }
}
