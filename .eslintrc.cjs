module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
    },
    // 1. Move the TypeScript parser and project settings to an 'overrides' block
    // so they ONLY apply to your actual TypeScript files.
    extends: [
        "eslint:recommended",
    ],
    plugins: ["playwright"],
    rules: {
        // Essential Playwright Guardrails
        "playwright/no-focused-test": "error",
        "playwright/no-skipped-test": "warn",
        "playwright/valid-expect": "error"
    },
    ignorePatterns: [
        "node_modules/",
        "playwright-report/",
        "test-results/",
        "test-snapshots/"
    ],
    overrides: [
        {
            // 2. Target only your TypeScript files here
            files: ["**/*.ts", "**/*.tsx"],
            parser: "@typescript-eslint/parser",
            parserOptions: {
                project: ["./tsconfig.json"],
                sourceType: "module",
                ecmaVersion: 2022,
            },
            plugins: ["@typescript-eslint"],
            extends: [
                "plugin:@typescript-eslint/recommended",
                "plugin:playwright/recommended"
            ],
            rules: {
                "@typescript-eslint/no-unused-vars": [
                    "error",
                    { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
                ],
                "@typescript-eslint/no-explicit-any": "off",
                "quotes": ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": true }],
                "playwright/missing-playwright-await": "off",
                "playwright/no-skipped-test": "off",
                "playwright/no-networkidle": "off",
                "playwright/prefer-to-have-count": "off"
            }
        }
    ]
};