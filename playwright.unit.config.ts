import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/unit-tests',
    timeout: 30_000,
    fullyParallel: true,
    globalSetup: undefined,
    reporter: [['list']],
});
