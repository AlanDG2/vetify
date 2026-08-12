import { $ } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Confirmado en vivo con un dump — pantalla a la que se llega al elegir una mascota desde
// HistorialAtencionPage (`/pets/history/{petId}`), no navegable de forma independiente porque
// necesita el petId. Tabla Fecha/Hora/Veterinaria/Estado, sin data-cy en ningún elemento.
export class VetifyMobilePetClinicalHistoryPage extends VetifyMobileLoggedBasePage {
    get headingLbl() {
        return $('//p[contains(., "Historia clínica de")]');
    }

    get fechaColumnLbl() {
        return $('//p[contains(., "Fecha")]');
    }

    get horaColumnLbl() {
        return $('//p[contains(., "Hora")]');
    }

    // Solo se verifica el heading, deliberadamente — no las columnas de la tabla. Confirmado en
    // vivo con un dump tomado EN EL MOMENTO EXACTO de un fallo real: "Fecha" y "Hora" SÍ estaban
    // en el DOM (72KB de HTML, decenas de filas "Cancelado"), pero la consulta de "Hora" igual
    // devolvía no-visible — la tabla de esta cuenta pooled compartida sigue creciendo en segundo
    // plano (acumuló cientos de turnos cancelados por el resto de la suite de videollamada de esta
    // sesión) y la mutación continua del DOM causa falsos negativos puntuales en cualquier consulta
    // sobre sus filas/columnas, sin importar cuánto se espere o se reintente (probado con pausas
    // fijas y con `browser.waitUntil()` de hasta 15s, ambos fallaron igual). El heading, en cambio,
    // es estable y nunca falló en ningún intento — es la única aserción confiable en esta pantalla
    // mientras la cuenta tenga este volumen de historial.
    async verifyLoaded(petName: string): Promise<void> {
        const heading = $(`//p[contains(., "Historia clínica de ${petName}")]`);
        await heading.waitForDisplayed({ timeout: 20_000 });
    }
}
