// Temporary standalone script (not part of the test suite) — activates a REAL QA account
// (not a synthetic pool/fresh user) that is blocked by the same known environment bug as IMP-004:
// GET/POST validation returns isClient:false even for accounts that do have a real plan purchased.
// Workaround (given by the project owner, who administers this QA account): intercept the
// /api/users/update_for_signup response at the CDP Fetch domain (page.route() is unreliable for
// /api/* here — this app runs a Workbox Service Worker on /api/*, see src/helpers/simulateOutage.ts)
// and force isClient/emailVerified/blocked/canChangePassword/tour to the "activated" values so the
// SPA lets the account through the gate screen. All OTHER endpoints (pets, plans, etc.) are left
// completely untouched — only this one gate-check response is patched. Delete after use.
import { GENERAL_COOKIES_STORAGE_STATE_PATH } from '@config/test-configuration';
import { SiteId } from '@config/environment';
import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';
import { VetifyWebappLoginPage, VetifyWebappPolicyValidationPage } from '@pages/vetify/webapp';
import { chromium } from '@playwright/test';

const EMAIL = process.argv[2];
const PASSWORD = process.argv[3];
const DNI = process.argv[4];

if (!EMAIL || !PASSWORD || !DNI) {
    console.error('Usage: activate-real-account.ts <email> <password> <dni>');
    process.exit(1);
}

async function main() {
    const browser = await chromium.launch({ headless: process.env.ACCOUNT_ACTIVATION_HEADLESS !== 'false' });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await context.setStorageState(GENERAL_COOKIES_STORAGE_STATE_PATH);

        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Fetch.enable', {
            patterns: [{ urlPattern: '*/api/users/update_for_signup*', requestStage: 'Response' }],
        });

        cdp.on('Fetch.requestPaused', async (event: any) => {
            const { requestId, request } = event;
            if (!request.url.includes('/api/users/update_for_signup')) {
                await cdp.send('Fetch.continueRequest', { requestId });
                return;
            }
            console.log('Intercepted update_for_signup, patching response...');
            const { body, base64Encoded } = await cdp.send('Fetch.getResponseBody', { requestId });
            const rawBody = base64Encoded ? Buffer.from(body, 'base64').toString('utf-8') : body;
            const json = JSON.parse(rawBody);
            const patched = {
                ...json,
                emailVerified: true,
                isClient: true,
                blocked: false,
                canChangePassword: true,
                tour: true,
            };
            console.log('Original isClient:', json.isClient, '-> patched isClient:', patched.isClient);
            const patchedBody = Buffer.from(JSON.stringify(patched), 'utf-8').toString('base64');
            await cdp.send('Fetch.fulfillRequest', {
                requestId,
                responseCode: 200,
                responseHeaders: [{ name: 'content-type', value: 'application/json' }],
                body: patchedBody,
            });
        });

        const loginPage = new VetifyWebappLoginPage(page);
        const policyValidationPage = new VetifyWebappPolicyValidationPage(page);

        console.log(`Logging in as ${EMAIL}...`);
        await loginPage.load();
        await loginPage.login(EMAIL, PASSWORD);
        await page.waitForTimeout(4000);
        console.log('Post-login URL:', page.url());

        if (page.url().includes('/validation/policy')) {
            await policyValidationPage.validatePolicy({
                firstName: 'Alan David',
                lastName: 'Gonzalez Guzman',
                identification: { type: 'DNI', number: DNI },
            });
            await page.waitForTimeout(3000);
            console.log('Post-validation URL:', page.url());

            const continueBtn = page.getByRole('button', { name: 'Continuar' });
            if (await continueBtn.isVisible().catch(() => false)) {
                console.log('Found "Continuar" button (Ya tenés cobertura) — clicking...');
                await continueBtn.click();
                await page.waitForTimeout(3000);
                console.log('Post-continue URL:', page.url());
            }
        }

        if (page.url().includes('/validation/policy') || page.url().includes('/auth/login')) {
            console.log('STILL BLOCKED — current URL:', page.url());
            const bodyText = await page.locator('body').innerText().catch(() => '<unreadable>');
            console.log('Page text snapshot:\n', bodyText.slice(0, 1500));
            await page.screenshot({ path: 'test-results/activate-real-account-debug.png', fullPage: true }).catch(() => {});
            console.log('Screenshot saved to test-results/activate-real-account-debug.png');
            return;
        }

        console.log('SUCCESS: past the gate screen. Checking real backend pet/plan state...');
        const apiClient = await VetifyWebappApiClient.getApiClient(page);
        const pets = await apiClient.getUserPets();
        console.log('Real getUserPets() response:', JSON.stringify(pets));
        const hasPlanWithPet = await apiClient.userHasPlanWithPet();
        console.log('userHasPlanWithPet():', hasPlanWithPet);

        const storageState = await page.context().storageState();
        console.log('Storage state cookies count:', storageState.cookies.length);

        console.log(JSON.stringify({ email: EMAIL, password: PASSWORD, dni: DNI, siteId: SiteId.VETIFY_ADQUIRENTE, plans: pets, hasPlanWithPet }, null, 2));

        // Navigate to the videocall request flow to observe the REAL UI state for this account.
        // (Not using the POM's decorated methods directly — @step() requires a real `test()` context.)
        console.log('Navigating to videocall flow via SPA soft-nav (no full reload, to keep the patched auth state in memory)...');
        const goToVideocallBtn = page.locator('button:text("Ir a videollamada")');
        if (await goToVideocallBtn.isVisible().catch(() => false)) {
            await goToVideocallBtn.click();
        } else {
            // Fallback: look for any nav item/menu leading to the service.
            await page.getByText('Videollamada', { exact: false }).first().click({ timeout: 10000 }).catch(async () => {
                console.log('No obvious "Videollamada" nav element found on Home — dumping Home page text.');
            });
        }
        await page.waitForTimeout(3000);
        console.log('Entry screen URL:', page.url());
        const entryText = await page.locator('body').innerText().catch(() => '<unreadable>');
        console.log('Entry screen page text:\n', entryText.slice(0, 1500));
        await page.screenshot({ path: 'test-results/activate-real-account-entry.png', fullPage: true }).catch(() => {});
        if (page.url().includes('/service/493')) {
            await page.getByRole('button', { name: 'Agendar nueva videollamada' }).click({ timeout: 10000 }).catch(() => console.log('No "Agendar nueva videollamada" button found.'));
            await page.waitForTimeout(3000);
        }
        console.log('Videocall flow URL:', page.url());
        const flowText = await page.locator('body').innerText().catch(() => '<unreadable>');
        console.log('Videocall flow page text:\n', flowText.slice(0, 1500));
        await page.screenshot({ path: 'test-results/activate-real-account-videocall.png', fullPage: true }).catch(() => {});
    } finally {
        await context.close();
        await browser.close();
    }
}

main().catch((e) => {
    console.error('FAILED:', e);
    process.exit(1);
});
