import type { Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) { }

  goto(path = '/') {
    return this.page.goto(path);
  }
}
