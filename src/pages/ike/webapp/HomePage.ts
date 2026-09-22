import type { Locator, Page } from '@playwright/test';
import { IkeWebappBasePage } from './BasePage';

export class IkeWebappHomePage extends IkeWebappBasePage {
    readonly userDrawerBtn: Locator;
    readonly myAssistancesHeading: Locator;
    readonly notificationPromptAcceptBtn: Locator;

    constructor(page: Page) {
        super(page, '/');
        // Señal principal de acceso real (usuario autenticado + sesión no redirigida a /auth/login ni a
        // /validation/policy): el botón del menú de usuario, siempre presente en la pantalla de inicio.
        // NO se usa el texto "Mis asistencias" como señal principal porque esa sección depende de
        // GET /api/services/category/overview, que reproduce el mismo 500 intermitente ya documentado en
        // otros productos de este ambiente de QA (ver qa-workspace/known-issues.md, bloqueo-1 / IMP-017) —
        // no relacionado con IMAS-3742. Confirmado en el trace de un test real: 500 en ese endpoint con la
        // sesión igual de autenticada y sin redirección.
        this.userDrawerBtn = this.page.getByRole('button', { name: 'userDrawer' });
        this.myAssistancesHeading = this.page.getByText('Mis asistencias');
        // Modal propio de la app (no es el permiso nativo del navegador) que aparece en el primer
        // login de una sesión sin permisos de notificaciones ya decididos — confirmado corriendo la
        // suite con `npx playwright test` (no apareció en las validaciones manuales por MCP porque
        // ese browser persistente ya tenía la decisión tomada de una sesión previa).
        this.notificationPromptAcceptBtn = this.page.getByRole('button', { name: 'Aceptar' });
    }

    async dismissNotificationPromptIfPresent(): Promise<void> {
        // Puede tardar unos segundos en aparecer tras la carga inicial (no es instantáneo) — se espera
        // una ventana corta en vez de chequear visibilidad una sola vez, para no perderlo por timing.
        try {
            await this.notificationPromptAcceptBtn.waitFor({ state: 'visible', timeout: 8000 });
            await this.notificationPromptAcceptBtn.click();
        } catch {
            // No apareció en la ventana de espera — no bloquea el flujo.
        }
    }
}
