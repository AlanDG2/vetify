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

    constructor(page: Page) {
        this.page = page;
        this.headingLbl = this.page.getByRole('heading', { name: 'Introduzca una nueva contraseña' });
        this.newPasswordInput = this.page.getByRole('textbox', { name: 'Nueva contraseña' });
        this.confirmPasswordInput = this.page.getByRole('textbox', { name: 'Reintroduzca contraseña' });
        this.submitButton = this.page.getByRole('button', { name: 'Restablecer contraseña' });
        this.newPasswordErrorLbl = this.page.getByText('Introduzca una nueva contraseña.');
        this.confirmPasswordErrorLbl = this.page.getByText('Debe introducir la contraseña una segunda vez');
        this.mismatchErrorLbl = this.page.getByText('Las contraseñas no coinciden');
        this.successHeadingLbl = this.page.getByRole('heading', { name: '¡Contraseña cambiada!' });
        this.successMessageLbl = this.page.getByText('Su contraseña se ha cambiado con éxito');
        // Pantalla genérica de Auth0 — mismo texto para link vencido (24hs) y link ya usado (reuso), no distingue el motivo.
        this.expiredHeadingLbl = this.page.getByText('Enlace caducado');
    }

    /** Checklist en vivo de la política de contraseña — solo el criterio pedido, no toda la lista. */
    policyCriterionChecked(criterion: 'longitud' | 'minusculas' | 'mayusculas' | 'numeros' | 'especiales'): Locator {
        const textByCriterion: Record<typeof criterion, string> = {
            longitud: 'Al menos 8 caracteres de largo',
            minusculas: 'Letras minúsculas (a-z)',
            mayusculas: 'Letras mayúsculas (A-Z)',
            numeros: 'Números (0-9)',
            especiales: 'Caracteres especiales (por ejemplo, !@#$%^&*)',
        };
        return this.page.getByText(`✓ ${textByCriterion[criterion]}`);
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
