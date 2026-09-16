import type { Page, Request } from '@playwright/test';

// IMP-021 (docs/impedimentos-bloqueos.md): los resultados del buscador de veterinarias se renderizan
// dentro de un <iframe> cross-origin de Google Maps -- Playwright no puede inspeccionar ese DOM.
// El buscador en si (VeterinariasSearchModal.locationInput) SI es del dominio propio, y dispara un
// GET real por cada tecla a `maps.googleapis.com/maps/api/place/js/AutocompletionService.GetPredictionsJson`
// (confirmado en vivo 2026-09-10 con captura de red real -- JSONP, no JSON puro). Se verifica ese
// request/response en vez de intentar leer los pines del iframe.

const AUTOCOMPLETE_PATTERN = '**/maps/api/place/js/AutocompletionService.GetPredictionsJson**';

/** Extrae el nombre del callback JSONP (param `callback=`) de la URL del request real. */
function getJsonpCallbackName(request: Request): string {
    const url = new URL(request.url());
    const callback = url.searchParams.get('callback');
    if (!callback) throw new Error(`No se encontró el param "callback" en la request de autocomplete: ${request.url()}`);
    return callback;
}

/**
 * Intercepta la próxima request de autocomplete y fuerza una respuesta "sin resultados"
 * (`ZERO_RESULTS`, sin predictions) -- simula QA-AUTO-057 ("Mapa sin resultados"), un estado que el
 * autocomplete real de Google Places casi nunca devuelve por sí solo (confirmado: hasta con texto sin
 * sentido devuelve sugerencias "fuzzy").
 */
export async function mockNoAutocompleteResults(page: Page): Promise<void> {
    await page.route(AUTOCOMPLETE_PATTERN, async (route) => {
        const callback = getJsonpCallbackName(route.request());
        const body = `/**/${callback} && ${callback}(${JSON.stringify({ predictions: [], status: 'ZERO_RESULTS' })})`;
        await route.fulfill({ status: 200, contentType: 'application/json', body });
    });
}
