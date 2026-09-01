import type { Page } from '@playwright/test';

/**
 * Simula una cuenta cuyo único plan está Inactivo o Dado de baja (IMAS-4408, escenarios 2/3),
 * sin depender de una edición manual real en la base (IMP-015: no existe self-service para esto,
 * Alexis edita SISE a mano -- bloqueo confirmado, escalado y respondido "no por ahora").
 *
 * A diferencia del bloqueo ya documentado para simular una CAÍDA de backend (`NetworkOutageSimulator`
 * -- ese sí necesita CDP porque el Service Worker intercepta antes que `page.route()`), reemplazar el
 * CONTENIDO de una respuesta puntual con `route.fulfill()` funciona de forma confiable en este sitio
 * (confirmado en vivo 2026-08-31): el Service Worker no bloquea la fulfillment, solo compite por quién
 * responde primero cuando se intenta abortar/bloquear sin reemplazo.
 *
 * Cubre las 5 pantallas que pide la HU con 2 endpoints:
 * - `/api/services/pets/my-products` -> `[]`: Home, Mascotas, Planes y coberturas y Videollamada
 *   todos leen de acá (ninguno filtra por `estado` en el cliente -- confían en que el backend ya
 *   excluya los planes no operables, así que el array vacío es la simulación fiel de "no me queda
 *   ningún plan operable", no un `estado` puntual inventado).
 * - `/api/bff/reintegros/mascotas` -> `[]`: Reintegros usa un endpoint separado, no `my-products`.
 *
 * Debe registrarse ANTES de `container.vetify.webapp.homePage.load()` (o cualquier primera
 * navegación), para que Playwright intercepte la primera llamada real también.
 */
export async function mockAccountWithNoOperablePlan(page: Page): Promise<void> {
    await page.route('**/api/services/pets/my-products', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/bff/reintegros/mascotas', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
}
