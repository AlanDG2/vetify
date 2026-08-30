import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';

export class VetifyWebappSideMenuSection extends VetifyWebappBasePage {
    readonly closeSideMenuBtn: Locator;
    readonly logoutButton: Locator;

    // Entries -- data-cy de los 15 items reales confirmados en vivo 2026-08-30 (vetifyMenuItem-*)
    readonly videocallEntry: Locator;
    readonly veterinariasEntry: Locator;
    readonly ayudaEntry: Locator;
    readonly planesYCoberturasEntry: Locator;
    readonly reintegrosEntry: Locator;
    readonly vetifyPlusEntry: Locator;
    readonly inicioEntry: Locator;
    readonly perfilEntry: Locator;
    readonly mascotasEntry: Locator;
    readonly emergenciasEntry: Locator;
    readonly asistenciaPresencialEntry: Locator;
    readonly asistenciaADomicilioEntry: Locator;
    readonly historialDeAtencionEntry: Locator;
    readonly cooperEntry: Locator;
    readonly facturasEntry: Locator;

    constructor(page: Page) {
        super(page, '/section/servicios');

        this.closeSideMenuBtn = page.locator('[data-cy="closeButton"]');
        this.logoutButton = page.locator('[data-cy="logoutButton"]');

        this.videocallEntry = page.locator('[data-cy="vetifyMenuItem-videollamada"]');
        this.veterinariasEntry = page.locator('[data-cy="vetifyMenuItem-veterinarias"]');
        this.ayudaEntry = page.locator('[data-cy="vetifyMenuItem-ayuda"]');
        this.planesYCoberturasEntry = page.locator('[data-cy="vetifyMenuItem-planes-y-coberturas"]');
        this.reintegrosEntry = page.locator('[data-cy="vetifyMenuItem-reintegros"]');
        this.vetifyPlusEntry = page.locator('[data-cy="vetifyMenuItem-vetify-plus"]');
        this.inicioEntry = page.locator('[data-cy="vetifyMenuItem-inicio"]');
        this.perfilEntry = page.locator('[data-cy="vetifyMenuItem-perfil"]');
        this.mascotasEntry = page.locator('[data-cy="vetifyMenuItem-mascotas"]');
        this.emergenciasEntry = page.locator('[data-cy="vetifyMenuItem-emergencias"]');
        this.asistenciaPresencialEntry = page.locator('[data-cy="vetifyMenuItem-asistencia-presencial"]');
        this.asistenciaADomicilioEntry = page.locator('[data-cy="vetifyMenuItem-asistencia-a-domicilio"]');
        this.historialDeAtencionEntry = page.locator('[data-cy="vetifyMenuItem-historial-de-atención"]');
        this.cooperEntry = page.locator('[data-cy="vetifyMenuItem-cooper"]');
        this.facturasEntry = page.locator('[data-cy="vetifyMenuItem-facturas"]');
    }
}
