import { GENERAL_COOKIES_STORAGE_STATE_PATH } from '@config/test-configuration';
import { defineConfig, devices } from '@playwright/test';
import { getWebappBaseUrl } from './src/config/environment';
import sites from './src/config/sites';

export default defineConfig({
    // Allow running tests by tags using the TAGS env var. Examples:
    // TAGS=smoke -> matches tests with '[smoke]' in the title or @smoke
    // TAGS=smoke,regression -> matches any of the listed tags
    grep: (() => {
        const tags = process.env.TAGS;
        if (!tags) return undefined;
        const parts = tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .map((t) => `(\\[${t}\\]|@${t})`);
        if (parts.length === 0) return undefined;
        return new RegExp(parts.join('|'));
    })(),
    timeout: 60_000 * 3, // 3Min
    expect: {
        timeout: 30_000,
    },
    reporter: [
        ['list'], // keeps your normal terminal output
        ['allure-playwright', { outputFolder: 'allure-results' }],
    ],
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    use: {
        // use a pre-populated storage state (cookies/localStorage) for every test
        storageState: GENERAL_COOKIES_STORAGE_STATE_PATH,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        actionTimeout: 60_000, // 1 Min
        navigationTimeout: 60_000 * 3, // 3 Min
    },
    // run a global setup that creates the storageState.json before tests
    globalSetup: './tests/global-setup.ts',
    projects: (() => {
        const projects: any[] = [];

        for (const site of sites) {
            const baseUrl = getWebappBaseUrl(site.id);
            if (!baseUrl) {
                // Fail-fast: missing environment variable for site's base URL
                throw new Error(`Missing base URL for site '${site.name}'. Set the env var ${site.baseUrlEnvVar}`);
            }

            projects.push({
                name: `${site.name} Desktop`,
                testDir: site.testFolder,
                use: {
                    ...devices['Desktop Chrome'],
                    baseURL: baseUrl,
                },
            });

            // Experimento 2026-08-05: habilitado SOLO para "Vetify WebApp" para medir qué locators
            // rompen contra un viewport mobile real (Bottom Sheet vs Drawer del selector de horario,
            // principalmente) antes de decidir si se habilita para los otros 4 sitios.
            if (site.name === 'Vetify WebApp') {
                projects.push({
                    name: `${site.name} Android`,
                    testDir: site.testFolder,
                    use: {
                        ...devices['Pixel 5'],
                        baseURL: baseUrl,
                    },
                });
            }
        }

        return projects;
    })(),
});
