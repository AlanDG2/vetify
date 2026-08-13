import { $, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Locators calcados de src/pages/vetify/webapp/videocall/VideocallViewPage.ts (Playwright),
// confirmados con un dump de DOM en vivo — el título de esta pantalla es un <h1>, a diferencia del
// resto del wizard de videollamada que usa <h2>.
export class VetifyMobileVideocallViewPage extends VetifyMobileLoggedBasePage {
    constructor(private readonly assistanceId: string) {
        super();
    }

    async load(): Promise<void> {
        await this.navigateTo(`/petsAssistance/${this.assistanceId}`);
        await this.pageTitle.waitForDisplayed({ timeout: 20_000 });
    }

    get pageTitle() {
        return $('//h1[contains(., "Detalles del turno")]');
    }

    get mascotaLbl() {
        return $('//p[contains(., "Mascota")]/following-sibling::div[1]//p');
    }

    get fechaHoraLbl() {
        return $('//p[contains(., "Fecha y hora")]/following-sibling::div[1]//p');
    }

    get motivoLbl() {
        return $('//p[contains(., "Motivo")]/following-sibling::p[1]');
    }

    get enterVideocallBtn() {
        return $('//button[contains(., "Ingresar")]');
    }

    get rescheduleBtn() {
        return $('//button[contains(., "Reprogramar")]');
    }

    get cancelVideocallBtn() {
        return $('//button[contains(., "Cancelar")]');
    }

    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    async verifyDetail(data: { petName: string; reason?: string }): Promise<void> {
        await this.pageTitle.waitForDisplayed({ timeout: 15_000 });
        const petName = (await this.mascotaLbl.getText()).trim();
        if (petName !== data.petName) throw new Error(`Se esperaba la mascota "${data.petName}", se encontró "${petName}".`);
        if (data.reason) {
            const reason = (await this.motivoLbl.getText()).trim();
            if (reason !== data.reason) throw new Error(`Se esperaba el motivo "${data.reason}", se encontró "${reason}".`);
        }
        const fechaHora = (await this.fechaHoraLbl.getText()).trim();
        if (fechaHora === '' || fechaHora === '-') throw new Error('Se esperaba una fecha/hora válida en el detalle del turno.');
    }

    async verifyEnterButtonDisabled(): Promise<void> {
        const disabled = await this.enterVideocallBtn.getAttribute('disabled');
        if (disabled === null) throw new Error('Se esperaba "Ingresar" deshabilitado (turno fuera de la ventana de 5 min).');
    }

    async verifyCancelButtonEnabled(): Promise<void> {
        const disabled = await this.cancelVideocallBtn.getAttribute('disabled');
        if (disabled !== null) throw new Error('Se esperaba "Cancelar" habilitado.');
    }

    // BUG-003/IMAS-4119 (regresión): la assistanceId original de un turno ya reprogramado queda
    // CANCELADO en el backend, pero antes del fix seguía mostrando sus 3 acciones como si el turno
    // siguiera vigente. Mismos 3 locators que Desktop, ver VideocallViewPage.ts (Playwright).
    async verifyAllActionsDisabled(): Promise<void> {
        const enterDisabled = await this.enterVideocallBtn.getAttribute('disabled');
        if (enterDisabled === null) throw new Error('Se esperaba "Ingresar" deshabilitado (turno ya cancelado/reemplazado).');
        const rescheduleDisabled = await this.rescheduleBtn.getAttribute('disabled');
        if (rescheduleDisabled === null) throw new Error('Se esperaba "Reprogramar" deshabilitado (turno ya cancelado/reemplazado).');
        const cancelDisabled = await this.cancelVideocallBtn.getAttribute('disabled');
        if (cancelDisabled === null) throw new Error('Se esperaba "Cancelar" deshabilitado (turno ya cancelado/reemplazado).');
    }

    async startReschedule(): Promise<void> {
        await this.jsClick(this.rescheduleBtn);
    }

    async startCancel(): Promise<void> {
        await this.jsClick(this.cancelVideocallBtn);
    }
}
