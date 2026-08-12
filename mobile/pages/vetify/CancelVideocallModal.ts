import { $, browser } from '@wdio/globals';
import { BasePage } from '../BasePage';

// Locators calcados de src/pages/vetify/webapp/videocall/CancelVideocallModal.ts (Playwright).
// Copy real confirmado con un dump en vivo (modal simple de doble-check, sin selector de motivo,
// rediseño IMAS-3894) — coincide 1:1 con Desktop.
export class VetifyMobileCancelVideocallModal extends BasePage {
    get titleLbl() {
        return $('//*[contains(., "Estás por cancelar tu videollamada")]');
    }

    get subtitleLbl() {
        return $('//*[contains(., "Si cancelás el turno, vas a perder el horario reservado.")]');
    }

    get confirmCancelBtn() {
        return $('//button[contains(., "Cancelar videollamada")]');
    }

    get closeBtn() {
        return $('//button[contains(., "Cerrar")]');
    }

    get cancelledHeadingLbl() {
        return $('//*[contains(., "Tu turno fue cancelado")]');
    }

    get goToHomeBtn() {
        return $('//button[contains(., "Volver al inicio")]');
    }

    get scheduleNewVideocallBtn() {
        return $('//button[contains(., "Agendar nueva videollamada")]');
    }

    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    async verifyModalContent(): Promise<void> {
        await this.titleLbl.waitForDisplayed({ timeout: 15_000 });
        await this.subtitleLbl.waitForDisplayed({ timeout: 10_000 });
        await this.confirmCancelBtn.waitForDisplayed({ timeout: 10_000 });
        await this.closeBtn.waitForDisplayed({ timeout: 10_000 });
    }

    async confirmCancelation(): Promise<void> {
        await this.jsClick(this.confirmCancelBtn);
    }

    async verifyCancellationConfirmed(): Promise<void> {
        await this.cancelledHeadingLbl.waitForDisplayed({ timeout: 20_000 });
        await this.goToHomeBtn.waitForDisplayed({ timeout: 10_000 });
        await this.scheduleNewVideocallBtn.waitForDisplayed({ timeout: 10_000 });
    }
}
