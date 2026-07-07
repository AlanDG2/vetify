import type { Locator, Page } from '@playwright/test';

export abstract class BaseSection {
    constructor(
        protected readonly page: Page,
        protected readonly root: Locator,
    ) {}
}
