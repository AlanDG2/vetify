import { test, expect, Cookie } from '@playwright/test';
import { VetifyWebAppLoginPage } from '@pages/vetify/webapp/LoginPage';
import { environment } from '@config/environment';

// ToDo: Remove this import in a future, this is not a good practice
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// If storage state file exists and contains non-expired auth cookies, skip setup
const storageStatePath = 'playwright/.auth/user_with_multiple_pets.json';
let shouldSkipSetup = false;
try {
    if (fs.existsSync(storageStatePath)) {
        const raw = fs.readFileSync(storageStatePath, 'utf8');
        const state = JSON.parse(raw || '{}');
        const now = Math.floor(Date.now() / 1000);
        const cookies: Cookie[] = Array.isArray(state.cookies) ? state.cookies : [];
        // Consider the credentials valid if any cookie has an expiry in the future
        const sessionCookie = cookies.find(c => c.name === 'session');

        shouldSkipSetup = sessionCookie !== undefined && sessionCookie.expires > now
    }
} catch {
    // In case of any error while reading/parsing, do not skip setup
    shouldSkipSetup = false;
}

test.skip(shouldSkipSetup, 'Stored credentials present and not expired');

test('Iniciar session con un usuario con multiples mascotas', async ({ page }) => {
    const context = await page.context();

    const email: string = process.env.VETIFY_TEST_USER_WITH_PETS_EMAIL!;
    const password: string = process.env.VETIFY_TEST_USER_WITH_PETS_PASSWORD!;


    const loginPage = new VetifyWebAppLoginPage(page);

    await loginPage.load();

    await loginPage.login(email, password);

    await expect(page).toHaveURL(environment.VETIFY_WEBAPP_BASE_URL + '/');

    // Save storage state to a file
    await context.storageState({ path: 'playwright/.auth/user_with_multiple_pets.json' });
    await context.close();
});