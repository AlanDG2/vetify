import type { Locator, Page } from '@playwright/test';

/**
 * Pantalla de "Introduzca una nueva contraseña", hosteada por Auth0
 * (ike-webapp-staging.us.auth0.com/u/reset-password/change) — fuera del dominio de Vetify. No
 * extiende VetifyWebappBasePage: no hay un `load()` propio, se llega acá navegando al link real
 * recibido por correo (ver EmailClient + docs/user-stories/IMAS-3215-reseteo-contrasena-b2c-vetify.tests.md).
 */
export class VetifyWebappResetPasswordPage {
    private page: Page;

    readonly headingLbl: Locator;
    readonly newPasswordInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly submitButton: Locator;
    readonly newPasswordErrorLbl: Locator;
    readonly confirmPasswordErrorLbl: Locator;
    readonly mismatchErrorLbl: Locator;
    readonly successHeadingLbl: Locator;
    readonly successMessageLbl: Locator;
    readonly expiredHeadingLbl: Locator;
    readonly alreadyUsedHeadingLbl: Locator;

    constructor(page: Page) {
        this.page = page;
        this.headingLbl = this.page.getByRole('heading', { name: 'Introduzca una nueva contraseña' });
        this.newPasswordInput = this.page.getByRole('textbox', { name: 'Nueva contraseña' });
        this.confirmPasswordInput = this.page.getByRole('textbox', { name: 'Reintroduzca contraseña' });
        this.submitButton = this.page.getByRole('button', { name: 'Restablecer contraseña' });
        this.newPasswordErrorLbl = this.page.getByText('Introduzca una nueva contraseña.');
        // exact:true porque el div aria-live screen-reader-only concatena AMBOS mensajes de error
        // ("Introduzca una nueva contraseña. Debe introducir la contraseña una segunda vez") y matchea
        // como substring sin esto -- strict-mode violation confirmada en vivo 2026-09-04/05, ver
        // docs/impedimentos-bloqueos.md.
        this.confirmPasswordErrorLbl = this.page.getByText('Debe introducir la contraseña una segunda vez', { exact: true });
        this.mismatchErrorLbl = this.page.getByText('Las contraseñas no coinciden');
        this.successHeadingLbl = this.page.getByRole('heading', { name: '¡Contraseña cambiada!' });
        this.successMessageLbl = this.page.getByText('Su contraseña se ha cambiado con éxito');
        // Corregido 2026-09-01: confirmado en vivo (accessibility snapshot del error de un test que
        // buscaba mal este texto) que un link REUSADO muestra "Enlace inválido" + "Este link ha sido
        // utilizado anteriormente...", NO "Enlace caducado" — son 2 pantallas distintas, no la misma
        // como se había asumido sin confirmar el 2026-08-29. El vencimiento genuino por tiempo (24hs)
        // sigue sin confirmarse literalmente; no asumir que usa este mismo texto tampoco.
        this.expiredHeadingLbl = this.page.getByText('Enlace caducado');
        this.alreadyUsedHeadingLbl = this.page.getByRole('heading', { name: 'Enlace inválido' });
    }

    /**
     * Checklist en vivo de la política de contraseña — solo el criterio pedido, no toda la lista.
     * El ✓/• NO es texto real del DOM: confirmado en vivo 2026-09-05 (inspección de
     * `getComputedStyle(li, '::before').content`) que es un pseudo-elemento CSS -- un
     * `getByText('✓ ...')` nunca puede matchear, no es flaky, está roto de origen. Se lee el estado
     * real desde el contenido del pseudo-elemento del <li> más específico (el `.last()` es el <li>
     * hoja: los `<li>` ancestros también matchean por texto ya que su textContent incluye el de sus
     * hijos, y en orden de documento los ancestros siempre preceden a sus descendientes).
     */
    async isPolicyCriterionChecked(criterion: 'longitud' | 'minusculas' | 'mayusculas' | 'numeros' | 'especiales'): Promise<boolean> {
        const textByCriterion: Record<typeof criterion, string> = {
            longitud: 'Al menos 8 caracteres de largo',
            minusculas: 'Letras minúsculas (a-z)',
            mayusculas: 'Letras mayúsculas (A-Z)',
            numeros: 'Números (0-9)',
            especiales: 'Caracteres especiales (por ejemplo, !@#$%^&*)',
        };
        const criterionItem = this.page.locator('li', { hasText: textByCriterion[criterion] }).last();
        const beforeContent = await criterionItem.evaluate((el) => getComputedStyle(el, '::before').content);
        return beforeContent === '"✓"';
    }

    async fillPasswords(newPassword: string, confirmPassword: string): Promise<void> {
        await this.newPasswordInput.fill(newPassword);
        await this.confirmPasswordInput.fill(confirmPassword);
    }

    async submit(): Promise<void> {
        await this.submitButton.click();
    }

    /** Camino feliz: completa ambos campos con la misma contraseña y confirma. */
    async resetPassword(password: string): Promise<void> {
        await this.fillPasswords(password, password);
        await this.submit();
    }
}
