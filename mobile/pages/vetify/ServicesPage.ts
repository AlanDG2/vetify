import { $ } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// goToVideocallBtn calcado de src/pages/vetify/webapp/ServicesPage.ts (Playwright), variante
// mobile. El resto (tarjetas de servicio) no tiene equivalente en Playwright.
//
// 2026-08-24: las tarjetas ANTES tenían data-cy propio (`vetifyServiceCard-<slug>`), pero un
// deploy reciente se lo sacó a las 8 tarjetas de esta pantalla (confirmado en vivo: 0 elementos
// con `[data-cy^="vetifyServiceCard"]` en el DOM real, coincide con el prompt de "nueva versión
// disponible" que tira el sitio). Las tarjetas siguen ahí visualmente, solo se perdió el hook de
// automatización — no es un bug de producto. Selectores reescritos por texto visible (más frágil
// ante cambios de copy, pero es lo único estable disponible hoy).
export class VetifyMobileServicesPage extends VetifyMobileLoggedBasePage {
    get goToVideocallBtn() {
        return $('//button[contains(., "Videollamada")]');
    }

    get emergenciasCard() {
        return $('//p[text()="Emergencias"]');
    }

    get asistenciaPresencialCard() {
        return $('//p[text()="Asistencia presencial"]');
    }

    get planesCard() {
        return $('//p[text()="Planes y coberturas"]');
    }

    get videocallCard() {
        return $('//p[text()="Videollamadas"]');
    }

    async load(): Promise<void> {
        await this.navigateTo('/section/servicios');
    }
}
