import { expect } from '@playwright/test';
import { setAllureDetails, test } from '@tests/framework/base-test';
import { step } from 'allure-js-commons';

// IMAS-4492 — Landing de Performance — Fechas de cupón ecommerce (eliminarlas)
//
// Verifica que el footer del checkout de Vetify es el footer institucional genérico,
// SIN texto promocional del cupón y SIN fechas de vigencia, sin importar de qué landing
// provenga la intención de compra (from=salud_mascotas, from=osde, etc.).
//
// Comportamiento esperado post-HU:
// - El footer muestra el texto legal estándar de Vetify (CUIT, domicilio, marca registrada)
// - NO muestra "Bases y condiciones" del cupón
// - NO muestra "20% OFF" en el footer
// - NO muestra fechas de vigencia (dd/mm/aaaa)
//
// Confirmado en QA 2026-09-01: el footer del checkout ya es el genérico de Vetify.
// TC-01 y TC-02 verifican desktop y mobile para la landing /salud-mascotas.

const DATE_PATTERN = /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/;

const CHECKOUT_URL_WITH_FROM = 'https://qa.vetify.com.ar/checkout/form?plan=2319&cupon=VETIFY20X3&from=salud_mascotas';
const CHECKOUT_URL_WITHOUT_FROM = 'https://qa.vetify.com.ar/checkout/form?plan=2319';

test.describe('IMAS-4492 — Footer institucional del checkout (sin texto promocional del cupón)', () => {
    // =========================================================================
    // TS-01 Footer institucional sin texto promocional
    // =========================================================================
    test.describe('TS-01 Footer institucional sin texto promocional del cupón', () => {
        test('TC-01 - Vetify B2C - Footer genérico sin cupón ni fechas (desktop, from=salud_mascotas)', { tag: ['@critical'] }, async ({ container, page }) => {
            // CA01: Footer visible — CA02: Texto legal de Vetify presente —
            // CA03: Sin "Bases y condiciones" — CA04: Sin "20% OFF" en footer —
            // CA05: Sin fechas
            await setAllureDetails({
                preconditions: ['Checkout abierto con cupón VETIFY20X3 aplicado al plan 2319 (Vetify Emergencias),来的 from=salud_mascotas.'],
                steps: [
                    'Cargar el checkout con cupón VETIFY20X3 y from=salud_mascotas.',
                    'Extraer el texto del footer.',
                    'Verificar que contiene el texto legal institucional de Vetify.',
                    'Verificar que NO contiene "Bases y condiciones".',
                    'Verificar que NO contiene "20% OFF" en el footer.',
                    'Verificar que NO contiene fechas de vigencia.',
                ],
                expectedResult: [
                    'El footer es el institucional de Vetify (CUIT, domicilio, marca registrada).',
                    'No contiene texto promocional del cupón ni fechas de vigencia.',
                ],
            });

            await step('1. Cargar el checkout con from=salud_mascotas.', async () => {
                await page.goto(CHECKOUT_URL_WITH_FROM);
                await container.b2c.checkoutPage.checkoutFooter.waitFor({ state: 'visible', timeout: 15000 });
            });

            await step('2. Extraer el texto del footer.', async () => {
                const footerText = await container.b2c.checkoutPage.getFooterText();

                // CA01 — Footer visible y con texto institucional
                expect.soft(footerText, 'El footer debe ser visible y tener contenido').toBeTruthy();
                expect.soft(footerText, 'Debe contener la marca registrada de Iké Asistencia Argentina S.A.')
                    .toContain('Iké Asistencia Argentina S.A.');

                // CA03 — Sin sección promocional de cupón
                expect.soft(footerText, 'No debe contener "Bases y condiciones" (texto promocional del cupón)')
                    .not.toContain('Bases y condiciones');

                // CA04 — Sin "20% OFF" en el footer (puede estar en el panel de la orden, no en el footer)
                expect.soft(footerText, 'El footer NO debe contener "20% OFF"')
                    .not.toContain('20% OFF');

                // CA05 — Sin fechas de vigencia
                expect.soft(footerText, 'El footer NO debe contener fechas de vigencia (dd/mm/aaaa)')
                    .not.toMatch(DATE_PATTERN);
            });
        });

        test('TC-02 - Vetify B2C - Footer genérico sin cupón ni fechas (mobile, from=salud_mascotas)', { tag: ['@critical'] }, async ({ container, page }) => {
            // CA02: Comportamiento responsive del footer institucional
            await setAllureDetails({
                preconditions: [
                    'Checkout abierto con cupón VETIFY20X3 aplicado al plan 2319.',
                    'Viewport mobile (375x812).',
                ],
                steps: [
                    'Cambiar a viewport mobile (375x812).',
                    'Cargar el checkout con from=salud_mascotas.',
                    'Extraer el texto del footer.',
                    'Verificar que contiene el texto legal institucional de Vetify.',
                    'Verificar que NO contiene "Bases y condiciones", "20% OFF" ni fechas.',
                ],
                expectedResult: [
                    'El footer mobile es el institucional de Vetify, sin texto promocional.',
                ],
            });

            await step('1. Cambiar a viewport mobile (375x812).', async () => {
                await page.setViewportSize({ width: 375, height: 812 });
            });

            await step('2. Cargar el checkout con from=salud_mascotas.', async () => {
                await page.goto(CHECKOUT_URL_WITH_FROM);
                await container.b2c.checkoutPage.checkoutFooter.waitFor({ state: 'visible', timeout: 15000 });
            });

            await step('3. Verificar contenido del footer.', async () => {
                const footerText = await container.b2c.checkoutPage.getFooterText();

                expect.soft(footerText, 'El footer debe ser visible y tener contenido').toBeTruthy();
                expect.soft(footerText, 'Debe contener la marca registrada de Iké Asistencia Argentina S.A.')
                    .toContain('Iké Asistencia Argentina S.A.');
                expect.soft(footerText, 'No debe contener "Bases y condiciones"').not.toContain('Bases y condiciones');
                expect.soft(footerText, 'El footer NO debe contener "20% OFF"').not.toContain('20% OFF');
                expect.soft(footerText, 'El footer NO debe contener fechas de vigencia').not.toMatch(DATE_PATTERN);
            });
        });

        test('TC-03 - Vetify B2C - Footer genérico sin from param (desktop)', { tag: ['@critical'] }, async ({ container, page }) => {
            // CA01/CA04 (alcance directo de IMAS-4492): el footer del checkout es el
            // institucional de Vetify, sin texto promocional ni fechas, sin importar
            // de qué landing provenga la intención. TC-01/TC-02 ya cubren el camino
            // con cupón activo y from=salud_mascotas. TC-03 valida la ruta mínima
            // (sin cupón, sin from) — el footer debe seguir siendo el institucional
            // genérico, sin texto promocional ni fechas.
            await setAllureDetails({
                preconditions: [
                    'Checkout abierto del plan 2319 (Vetify Emergencias), sin cupón aplicado.',
                    'Sin query param "from" en la URL (entrada directa al checkout).',
                ],
                steps: [
                    'Cargar el checkout sin from param y sin cupón.',
                    'Extraer el texto del footer.',
                    'Verificar que es el footer institucional de Vetify.',
                    'Verificar que NO contiene texto promocional ni fechas.',
                ],
                expectedResult: [
                    'El footer es el institucional genérico de Vetify, sin texto del cupón ni fechas de vigencia.',
                ],
            });

            await step('1. Cargar el checkout sin param "from".', async () => {
                await page.goto(CHECKOUT_URL_WITHOUT_FROM);
                await container.b2c.checkoutPage.checkoutFooter.waitFor({ state: 'visible', timeout: 15000 });
            });

            await step('2. Verificar contenido del footer.', async () => {
                const footerText = await container.b2c.checkoutPage.getFooterText();

                expect.soft(footerText, 'El footer debe ser visible y tener contenido').toBeTruthy();
                expect.soft(footerText, 'Debe contener la marca registrada de Iké Asistencia Argentina S.A.')
                    .toContain('Iké Asistencia Argentina S.A.');
                expect.soft(footerText, 'No debe contener "Bases y condiciones"').not.toContain('Bases y condiciones');
                expect.soft(footerText, 'El footer NO debe contener "20% OFF"').not.toContain('20% OFF');
                expect.soft(footerText, 'El footer NO debe contener fechas de vigencia').not.toMatch(DATE_PATTERN);
            });
        });
    });
});
