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

/**
 * Simula "Plan sin condicionado disponible" (IMP-020, roadmap QA-AUTO-062): fuerza
 * `pathCondicionado: null` en el primer plan real de la cuenta, dejando el resto de los campos
 * (precio, grupo, código de producto, etc.) intactos -- a diferencia de `mockAccountWithNoOperablePlan`
 * de arriba, acá SÍ hace falta la respuesta real primero (`route.fetch()`), porque no se conoce el
 * schema completo del endpoint para fabricarlo a mano sin arriesgar romper otro campo (ver IMP-014:
 * campos faltantes como priceAmount/priceLabel ya rompieron el render de esta misma pantalla antes).
 *
 * `GET /api/services/plans/engage/{dni}` es el mismo endpoint con outages intermitentes documentados
 * en IMP-017 -- se reintenta unas pocas veces adentro del propio handler en vez de dejar que una sola
 * llamada 500 tire abajo el test por una causa no relacionada a lo que se está probando.
 *
 * No confirmado visualmente en producción qué texto/estado exacto muestra la UI para este caso (el
 * outage de IMP-017 estaba activo el día que se escribió este mock) -- el test que lo usa solo afirma
 * que "Condiciones del Servicio" deja de estar disponible, no un mensaje puntual. Revisar si aparece
 * algún mensaje visible ("Condicionado no disponible" o similar) la próxima vez que se corra con el
 * ambiente sano, y sumar esa aserción.
 */
export async function mockFirstPlanWithoutCondicionado(page: Page): Promise<void> {
    await page.route('**/api/services/plans/engage/**', async (route) => {
        let response;
        let json: any;
        for (let attempt = 0; attempt < 4; attempt++) {
            response = await route.fetch();
            if (response.ok()) {
                json = await response.json();
                break;
            }
        }
        if (!json) {
            // El endpoint no respondió 200 en ningún intento -- no hay nada real que mockear, se deja
            // pasar la última respuesta tal cual (probablemente el mismo 500 de IMP-017) en vez de
            // fabricar un cuerpo inventado.
            await route.fulfill({ response: response! });
            return;
        }
        if (Array.isArray(json.elements) && json.elements.length > 0) {
            json.elements[0].pathCondicionado = null;
        }
        await route.fulfill({ response: response!, json });
    });
}
