import { $ } from '@wdio/globals';
import { VetifyMobileAppBasePage } from './VetifyMobileAppBasePage';

// Locators calcados de src/pages/vetify/webapp/SideMenuSection.ts (Playwright) donde existían.
// El resto (logout + todos los items del menu) se encontró en vivo contra el emulador (dump de
// HTML del drawer real) — confirmado que TODOS los items tienen data-cy `vetifyMenuItem-<slug>`.
export class VetifyMobileSideMenuSection extends VetifyMobileAppBasePage {
    get closeSideMenuBtn() {
        return $('[data-cy="closeButton"]');
    }

    get logoutBtn() {
        return $('[data-cy="logoutButton"]');
    }

    // Items del menu, confirmados en vivo (dump de HTML, 2026-08-11):
    get inicioEntry() {
        return $('[data-cy="vetifyMenuItem-inicio"]');
    }

    get ayudaEntry() {
        return $('[data-cy="vetifyMenuItem-ayuda"]');
    }

    get perfilEntry() {
        return $('[data-cy="vetifyMenuItem-perfil"]');
    }

    get mascotasEntry() {
        return $('[data-cy="vetifyMenuItem-mascotas"]');
    }

    get planesYCoberturasEntry() {
        return $('[data-cy="vetifyMenuItem-planes-y-coberturas"]');
    }

    get vetifyPlusEntry() {
        return $('[data-cy="vetifyMenuItem-vetify-plus"]');
    }

    get emergenciasEntry() {
        return $('[data-cy="vetifyMenuItem-emergencias"]');
    }

    get asistenciaPresencialEntry() {
        return $('[data-cy="vetifyMenuItem-asistencia-presencial"]');
    }

    get asistenciaADomicilioEntry() {
        return $('[data-cy="vetifyMenuItem-asistencia-a-domicilio"]');
    }

    get facturasEntry() {
        return $('[data-cy="vetifyMenuItem-facturas"]');
    }

    get reintegrosEntry() {
        return $('[data-cy="vetifyMenuItem-reintegros"]');
    }

    get historialDeAtencionEntry() {
        return $('[data-cy="vetifyMenuItem-historial-de-atención"]');
    }

    get videocallEntry() {
        return $('[data-cy="vetifyMenuItem-videollamada"]');
    }

    get veterinariasEntry() {
        return $('[data-cy="vetifyMenuItem-veterinarias"]');
    }
}
