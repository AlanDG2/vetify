import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';
import { VetifyWebappBasePage } from './BasePage';

// Modal shown when a specific feature is unavailable while the rest of the app keeps working
// (IMAS-3860, Escenario 2). Same copy as VetifyWebappSystemUnavailableComponent but wrapped in
// a role="alertdialog" with a "Ir al inicio" CTA — confirmed via MCP against QA (blocking the
// videocall request endpoint mid-flow, not on initial page load).
export class VetifyWebappFeatureUnavailableModal extends VetifyWebappBasePage {
    readonly dialog: Locator;
    readonly heading: Locator;
    readonly goToHomeBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.dialog = page.getByRole('alertdialog');
        this.heading = this.dialog.getByText('Estamos realizando mejoras');
        this.goToHomeBtn = page.getByRole('button', { name: 'Ir al inicio' });
    }

    @step('Verificar que el modal de funcionalidad no disponible es visible')
    async expectVisible(): Promise<void> {
        // El modal tarda en aparecer de forma similar al heartbeat de la pantalla general
        // (confirmado vía MCP contra QA) — el timeout default de 30s a veces no alcanza.
        await expect(this.dialog).toBeVisible({ timeout: 60_000 });
        await expect(this.heading).toBeVisible();
        await expect(this.goToHomeBtn).toBeVisible();
    }

    @step('Presionar "Ir al inicio" en el modal de funcionalidad no disponible')
    async goToHome(): Promise<void> {
        await this.goToHomeBtn.click();
    }
}
