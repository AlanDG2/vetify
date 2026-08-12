import { $, browser } from '@wdio/globals';
import { VetifyMobileLoggedBasePage } from './LoggedBasePage';

// Confirmado en vivo con un dump. `/section/myappointments` — el título de la barra superior es
// "Mis asistencias" (distinto del label del menú, "Historial de atención"). Carga LENTA: el
// spinner (`chakra-spinner`) puede tardar más de 6s y hasta ~20s en resolver antes de mostrar la
// lista de mascotas — no asumir que 3-5s de espera alcanzan, como sí alcanza en otras pantallas.
// Elegir una mascota navega a `/pets/history/{petId}` con su historia clínica (tabla
// Fecha/Hora/Veterinaria/Estado), sin data-cy en ningún elemento.
export class VetifyMobileHistorialAtencionPage extends VetifyMobileLoggedBasePage {
    async load(): Promise<void> {
        await this.navigateTo('/section/myappointments');
    }

    private async jsClick(elementPromise: ReturnType<typeof $>): Promise<void> {
        const el = await elementPromise;
        await browser.execute((node: HTMLElement) => node.click(), el);
    }

    get subHeadingLbl() {
        return $('//p[contains(., "Historial de atención")]');
    }

    // Sin data-cy: se matchea por estructura (un botón que contiene un avatar de Chakra), no por
    // una clase con hash que puede cambiar entre builds.
    // $() resuelve al primer match — alcanza para "seleccionar la primera mascota", no hace falta
    // $$() acá.
    get firstPetCard() {
        return $('//button[.//*[@data-scope="avatar"]]');
    }

    async waitForLoaded(): Promise<void> {
        // La lista de mascotas puede tardar hasta ~20s en aparecer detrás del spinner inicial —
        // confirmado en vivo, timeout generoso a propósito.
        await this.subHeadingLbl.waitForDisplayed({ timeout: 25_000 });
    }

    async getFirstPetName(): Promise<string> {
        await this.firstPetCard.waitForDisplayed({ timeout: 10_000 });
        const nameLbl = await this.firstPetCard.$('p');
        return (await nameLbl.getText()).trim();
    }

    async selectFirstPet(): Promise<void> {
        await this.firstPetCard.waitForDisplayed({ timeout: 10_000 });
        await this.jsClick(this.firstPetCard);
    }
}
