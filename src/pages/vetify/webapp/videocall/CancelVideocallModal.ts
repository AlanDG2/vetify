import { BasePage } from '@pages/BasePage';
import { expect, type Locator, type Page } from '@playwright/test';
import { step } from '@utils/decorators';

export class VetifyWebappCancelVideocallModal extends BasePage {
    readonly assistanceId: string;

    readonly container: Locator;
    readonly titleLbl: Locator;
    readonly subtitleLbl: Locator;
    readonly confirmCancelBtn: Locator;
    readonly closeBtn: Locator;

    // Pantalla de confirmación post-cancelación (reemplaza el detalle del turno)
    readonly cancelledHeadingLbl: Locator;
    readonly goToHomeBtn: Locator;
    readonly scheduleNewVideocallBtn: Locator;

    constructor(page: Page, assistanceId: string) {
        super(page);
        this.assistanceId = assistanceId;

        // Rediseño (IMAS-3894): modal simple de doble-check, sin selector de motivo — copy exacto
        // confirmado vía MCP contra QA real, coincide con Figma §10.
        this.container = page.locator('div[role="dialog"]');
        this.titleLbl = page.getByText('Estás por cancelar tu videollamada');
        this.subtitleLbl = page.getByText('Si cancelás el turno, vas a perder el horario reservado.');
        this.confirmCancelBtn = page.getByRole('button', { name: 'Cancelar videollamada' });
        this.closeBtn = page.getByRole('button', { name: 'Cerrar' });

        // Copy exacto confirmado vía MCP: "Tu turno fue cancelado" / "Cancelaste la videollamada del
        // DD/MM/AAAA a las HH:MM h." / "Cuando lo necesites, podés agendar una nueva."
        this.cancelledHeadingLbl = page.getByRole('heading', { name: 'Tu turno fue cancelado' });
        this.goToHomeBtn = page.getByRole('button', { name: 'Volver al inicio' });
        this.scheduleNewVideocallBtn = page.getByRole('button', { name: 'Agendar nueva videollamada' });
    }

    @step('Verificar el contenido del modal de cancelación')
    async verifyModalContent(): Promise<void> {
        await expect(this.titleLbl).toBeVisible();
        await expect(this.subtitleLbl).toBeVisible();
        await expect(this.confirmCancelBtn).toBeVisible();
        await expect(this.closeBtn).toBeVisible();
    }

    @step('Cerrar el modal de cancelación sin confirmar')
    async close(): Promise<void> {
        await this.closeBtn.click();
        await expect(this.titleLbl).toBeHidden();
    }

    @step('Confirmar la cancelación de la videollamada')
    async confirmCancelation(): Promise<void> {
        const [response] = await Promise.all([
            this.page.waitForResponse((response) => response.url().includes(`/api/services/pets/cancel/${this.assistanceId}`) && response.status() === 200),
            this.confirmCancelBtn.click(),
        ]);
        expect(response.ok()).toBeTruthy();
    }

    @step('Verificar la pantalla de confirmación de cancelación del turno')
    async verifyCancellationConfirmed(): Promise<void> {
        await expect(this.cancelledHeadingLbl).toBeVisible();
        await expect(this.goToHomeBtn).toBeVisible();
        await expect(this.scheduleNewVideocallBtn).toBeVisible();
    }
}
