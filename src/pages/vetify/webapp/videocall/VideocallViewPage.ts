import { VetifyWebappLoggedBasePage } from '@pages/vetify/webapp/LoggedBasePage';
import { expect, Locator, Page } from '@playwright/test';
import { step } from '@utils/decorators';

export class VetifyWebappVideocallViewPage extends VetifyWebappLoggedBasePage {
    private assistanceId: string;

    readonly pageTitle: Locator;
    readonly infoBannerLbl: Locator;

    // Detail fields
    readonly mascotaLbl: Locator;
    readonly fechaHoraLbl: Locator;
    readonly motivoLbl: Locator;
    readonly detalleLbl: Locator;

    // Actions — IMAS-3894 CA05 (Ingresar habilitado 5 min antes) / CA03 (Cancelar, ≥30 min antes) / CA04 (Reprogramar)
    readonly enterVideocallBtn: Locator;
    readonly rescheduleBtn: Locator;
    readonly cancelVideocallBtn: Locator;

    constructor(page: Page, assistanceId: string) {
        super(page, `/petsAssistance/${assistanceId}`);
        this.assistanceId = assistanceId;

        this.pageTitle = page.getByRole('heading', { name: 'Detalles del turno' });
        this.infoBannerLbl = page.getByText('Podrás ingresar 5 minutos antes del turno.');

        // Confirmado vía MCP contra QA real: cada campo es un <p> de label seguido de un <p> de valor
        // en el mismo bloque — mismo patrón que la pantalla de revisión del agendamiento. "Mascota" es
        // la excepción: el bloque siguiente incluye también el avatar de la mascota; si la imagen no
        // carga (ej. bloqueada por blockThirdParty en tests), el fallback de iniciales se concatena al
        // texto — se apunta al <p> del nombre específicamente, no al wrapper completo.
        this.mascotaLbl = page.locator('p:text-is("Mascota")').locator('xpath=following-sibling::*[1]').locator('p').first();
        this.fechaHoraLbl = page.locator('p:text-is("Fecha y hora")').locator('xpath=following-sibling::*[1]');
        this.motivoLbl = page.locator('p:text-is("Motivo")').locator('xpath=following-sibling::*[1]');
        this.detalleLbl = page.locator('p:text-is("Detalle")').locator('xpath=following-sibling::*[1]');

        this.enterVideocallBtn = page.getByRole('button', { name: 'Ingresar' });
        this.rescheduleBtn = page.getByRole('button', { name: 'Reprogramar' });
        this.cancelVideocallBtn = page.getByRole('button', { name: 'Cancelar', exact: true });
    }

    @step('Esperar a que la pantalla de detalle de videollamada cargue')
    async waitForPageLoaded() {
        await Promise.all([
            super.waitForPageLoaded(),
            this.page.waitForResponse((response) => response.url().includes(`/api/services/pets/appointment/${this.assistanceId}`) && response.status() === 200),
            this.pageTitle.waitFor({ state: 'visible' }),
        ]);
    }

    @step('Verificar el detalle del turno (mascota, fecha/hora, motivo)')
    async verifyDetail(data: { petName: string; reason?: string }): Promise<void> {
        await expect(this.pageTitle).toBeVisible();
        await expect(this.mascotaLbl).toHaveText(data.petName);
        if (data.reason) {
            await expect(this.motivoLbl).toHaveText(data.reason);
        }
        await expect(this.fechaHoraLbl).not.toHaveText('-');
    }

    @step('Verificar que "Ingresar" está deshabilitado (turno fuera de la ventana de 5 min)')
    async verifyEnterButtonDisabled(): Promise<void> {
        await expect(this.enterVideocallBtn).toBeDisabled();
    }

    @step('Verificar que "Cancelar" está habilitado (turno cancelable)')
    async verifyCancelButtonEnabled(): Promise<void> {
        await expect(this.cancelVideocallBtn).toBeEnabled();
    }

    // BUG-003/IMAS-4119 (hallazgo 2, resuelto): la assistanceId original de un turno ya reprogramado
    // queda en estado CANCELADO en el backend pero seguía renderizando sus 3 acciones como si el
    // turno estuviera vigente (Reprogramar habilitado). El fix deshabilita las 3 acciones en ese caso.
    @step('Verificar que las 3 acciones están deshabilitadas (turno ya cancelado/reemplazado)')
    async verifyAllActionsDisabled(): Promise<void> {
        await expect(this.enterVideocallBtn).toBeDisabled();
        await expect(this.rescheduleBtn).toBeDisabled();
        await expect(this.cancelVideocallBtn).toBeDisabled();
    }

    @step('Iniciar el flujo de reprogramación del turno')
    async startReschedule(): Promise<void> {
        await Promise.all([this.page.waitForURL(/\/petsAssistance\/reprogramarTurno\//), this.rescheduleBtn.click()]);
    }

    @step('Abrir el modal de cancelación del turno')
    async startCancel(): Promise<void> {
        await this.cancelVideocallBtn.click();
    }
}
