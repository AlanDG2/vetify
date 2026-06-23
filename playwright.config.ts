import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Allow running tests by tags using the TAGS env var. Examples:
  // TAGS=smoke -> matches tests with "[smoke]" in the title or @smoke
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
    ['html', { open: 'never' }], // HTML report
  ],
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    // use a pre-populated storage state (cookies/localStorage) for every test
    storageState: 'storageState.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 60_000, // 1 Min
    navigationTimeout: 60_000 * 3, // 3 Min
  },
  // run a global setup that creates the storageState.json before tests
  globalSetup: './tests/global-setup.ts',
  projects: [
    // Setup project
    { name: 'setup', testDir: './tests/test-setup/' },
    {
      name: 'Chrome Desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],
});
