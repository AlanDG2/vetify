import { $ } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Confirmado en vivo con un dump. Sin heading real (mismo patrón que el resto del proyecto — el
// título es un <p> de la barra superior). Tiene 2 secciones: "Cuentas de acreditación" y "Mis
// reintegros", cada una con su propio estado vacío ("Aún no tenés..."). Sin data-cy en ningún
// elemento de contenido.
export class VetifyMobileReintegrosPage extends VetifyMobileLoggedBasePage {
    async load(): Promise<void> {
        await this.navigateTo('/section/myreintegros');
    }

    get pageTitleLbl() {
        return $('//p[contains(., "Reintegros")]');
    }

    get cuentasHeadingLbl() {
        return $('//p[contains(., "Cuentas de acreditación")]');
    }

    get cuentasEmptyStateLbl() {
        return $('//p[contains(., "Aún no tenés cuentas registradas")]');
    }

    get misReintegrosHeadingLbl() {
        return $('//p[contains(., "Mis reintegros")]');
    }

    get misReintegrosEmptyStateLbl() {
        return $('//p[contains(., "Aún no tenés reintegros solicitados")]');
    }

    // BUG-007/IMAS-4279 (docs/bugs/BUG-007-reintegros-dni-formato-invalido.md): confirmado en vivo
    // en una SEGUNDA cuenta distinta a la del reporte original — el historial de reintegros falla
    // al cargar (400 VAL-002 del backend por DNI con formato inválido en la cuenta) y la app
    // muestra este modal de error en vez de la lista, con "Acceder al historial" deshabilitado.
    get loadErrorDialogHeadingLbl() {
        return $('//*[@role="alertdialog"]//p[contains(., "Algo salió mal")]');
    }

    get accederAlHistorialBtn() {
        return $('//button[contains(., "Acceder al historial")]');
    }

    async verifyLoaded(): Promise<void> {
        await this.pageTitleLbl.waitForDisplayed({ timeout: 15_000 });
        await this.cuentasHeadingLbl.waitForDisplayed({ timeout: 10_000 });
    }
}
