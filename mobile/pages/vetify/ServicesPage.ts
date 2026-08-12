import { $ } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// goToVideocallBtn calcado de src/pages/vetify/webapp/ServicesPage.ts (Playwright), variante
// mobile. El resto (tarjetas de servicio) no tiene equivalente en Playwright — encontrado en
// vivo contra el emulador (dump de HTML real): cada tarjeta tiene data-cy propio
// `vetifyServiceCard-<slug>`, más sólido que matchear texto.
export class VetifyMobileServicesPage extends VetifyMobileLoggedBasePage {
    get goToVideocallBtn() {
        return $('//button[contains(., "Videollamada")]');
    }

    get emergenciasCard() {
        return $('[data-cy="vetifyServiceCard-emergencias"]');
    }

    get asistenciaPresencialCard() {
        return $('[data-cy="vetifyServiceCard-asistencia-presencial"]');
    }

    get planesCard() {
        return $('[data-cy="vetifyServiceCard-planes"]');
    }

    get videocallCard() {
        return $('[data-cy="vetifyServiceCard-videollamada"]');
    }

    async load(): Promise<void> {
        await this.navigateTo('/section/servicios');
    }
}
