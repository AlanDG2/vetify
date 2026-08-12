module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    // 1. Move the TypeScript parser and project settings to an 'overrides' block
    // so they ONLY apply to your actual TypeScript files.
    extends: ['eslint:recommended'],
    plugins: ['playwright'],
    rules: {
        // Essential Playwright Guardrails
        'playwright/no-focused-test': 'error',
        'playwright/no-skipped-test': 'warn',
        'playwright/valid-expect': 'error',
    },
    ignorePatterns: ['node_modules/', 'playwright-report/', 'test-results/', 'test-snapshots/'],
    overrides: [
        {
            // 2. Target only your TypeScript files here
            files: ['**/*.ts', '**/*.tsx'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: ['./tsconfig.json'],
                sourceType: 'module',
                ecmaVersion: 2022,
            },
            plugins: ['@typescript-eslint'],
            extends: ['plugin:@typescript-eslint/recommended', 'plugin:playwright/recommended'],
            rules: {
                '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
                '@typescript-eslint/no-explicit-any': 'off',
                quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
                'playwright/missing-playwright-await': 'off',
                'playwright/no-skipped-test': 'off',
                'playwright/no-networkidle': 'off',
                'playwright/prefer-to-have-count': 'off',
            },
        },
        {
            // mobile/ es WebdriverIO + Mocha (Appium), no Playwright — las reglas
            // 'playwright/*' de arriba asumen `test()`/`test.describe()` y producen
            // falsos positivos contra `describe()`/`it()` de Mocha (ej. no-standalone-expect).
            files: ['mobile/**/*.ts'],
            env: { mocha: true },
            rules: {
                'playwright/consistent-spacing-between-blocks': 'off',
                'playwright/expect-expect': 'off',
                'playwright/max-nested-describe': 'off',
                'playwright/missing-playwright-await': 'off',
                'playwright/no-conditional-expect': 'off',
                'playwright/no-conditional-in-test': 'off',
                'playwright/no-duplicate-hooks': 'off',
                'playwright/no-duplicate-slow': 'off',
                'playwright/no-element-handle': 'off',
                'playwright/no-eval': 'off',
                'playwright/no-focused-test': 'off',
                'playwright/no-force-option': 'off',
                'playwright/no-nested-step': 'off',
                'playwright/no-networkidle': 'off',
                'playwright/no-page-pause': 'off',
                'playwright/no-skipped-test': 'off',
                'playwright/no-standalone-expect': 'off',
                'playwright/no-unsafe-references': 'off',
                'playwright/no-unused-locators': 'off',
                'playwright/no-useless-await': 'off',
                'playwright/no-useless-not': 'off',
                'playwright/no-wait-for-navigation': 'off',
                'playwright/no-wait-for-selector': 'off',
                'playwright/no-wait-for-timeout': 'off',
                'playwright/prefer-hooks-in-order': 'off',
                'playwright/prefer-hooks-on-top': 'off',
                'playwright/prefer-locator': 'off',
                'playwright/prefer-to-have-count': 'off',
                'playwright/prefer-to-have-length': 'off',
                'playwright/prefer-web-first-assertions': 'off',
                'playwright/valid-describe-callback': 'off',
                'playwright/valid-expect': 'off',
                'playwright/valid-expect-in-promise': 'off',
                'playwright/valid-test-tags': 'off',
                'playwright/valid-title': 'off',
            },
        },
    ],
};
