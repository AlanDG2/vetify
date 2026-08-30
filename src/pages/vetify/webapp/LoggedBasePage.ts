import { VetifyWebappBasePage } from '@pages/vetify/webapp/BasePage';
import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappSideMenuSection } from './SideMenuSection';

export class VetifyWebappLoggedBasePage extends VetifyWebappBasePage {
    readonly sideMenuTriggerDesktopBtn: Locator;
    readonly sideMenuTriggerMobileBtn: Locator;
    readonly genericErrorDialogAcceptBtn: Locator;

    readonly sideMenuSection: VetifyWebappSideMenuSection;

    constructor(page: Page, path?: string) {
        super(page, path);

        this.sideMenuTriggerDesktopBtn = page.locator('[data-cy="vetifyMenuButton"]');
        this.sideMenuTriggerMobileBtn = page.locator('[data-cy="vetifyBottomNav-mas"]');
        // Dialogo generico "Algo salio mal / Proba de nuevo en un momento" -- confirmado en vivo
        // 2026-08-30 que aparece de forma intermitente (mismo patron de backend flaky ya documentado
        // en IMP-012/IMP-014) y, mientras esta abierto, pone aria-hidden en el resto de la pagina --
        // rompe cualquier getByRole() aunque el elemento real siga visible en el DOM.
        this.genericErrorDialogAcceptBtn = page.getByRole('button', { name: 'Aceptar' });
        this.sideMenuSection = new VetifyWebappSideMenuSection(page);
    }

    async dismissErrorDialogIfPresent(): Promise<void> {
        if (await this.genericErrorDialogAcceptBtn.isVisible().catch(() => false)) {
            await this.genericErrorDialogAcceptBtn.click();
        }
    }

    async openSideMenu() {
        // Antes hardcodeaba isMobile=false -- nunca fallaba en el proyecto Desktop (vetifyMenuButton
        // visible ahi) pero colgaba 60s en "Vetify WebApp Android" (ese boton no es visible en ese
        // viewport, el trigger real ahi es el bottom nav). Confirmado en vivo 2026-08-30 al automatizar
        // logout. Un simple isVisible() sincronico tambien fallo justo despues de una navegacion
        // (ninguno de los 2 triggers esta listo todavia, mid-transicion) -- se espera a que CUALQUIERA
        // de los 2 este realmente visible antes de decidir cual clickear.
        await Promise.race([this.sideMenuTriggerDesktopBtn.waitFor({ state: 'visible' }), this.sideMenuTriggerMobileBtn.waitFor({ state: 'visible' })]);

        if (await this.sideMenuTriggerDesktopBtn.isVisible()) {
            await this.sideMenuTriggerDesktopBtn.click();
        } else {
            await this.sideMenuTriggerMobileBtn.click();
        }
    }

    async logout(): Promise<void> {
        await this.openSideMenu();
        await this.sideMenuSection.logoutButton.click();
        await this.page.waitForURL(/\/auth\/login/);
    }
}
