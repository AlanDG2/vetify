import { type Page, type Locator } from '@playwright/test';
import { VetifyWebappLoggedBasePage } from './LoggedBasePage';

export type ProfileTab = 'MisDatos' | 'MisPlanes';

export class VetifyWebappMyProfilePage extends VetifyWebappLoggedBasePage {
    private readonly plansContainer: Locator;
    private readonly tabs: Locator;
    private readonly selectedTab: Locator;
    private readonly loadCredentialButtons: Locator;

    constructor(page: Page) {
        super(page, '/section/myprofile');
        this.plansContainer = this.page.locator('div[id="tabs::rh::content-products"] div[data-part="item-content"]');
        this.tabs = this.page.locator('button[role="tab"]');
        this.selectedTab = this.page.locator('button[role="tab"][aria-selected="true"]');
        this.loadCredentialButtons = this.plansContainer.locator('button[type="button"]');
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
