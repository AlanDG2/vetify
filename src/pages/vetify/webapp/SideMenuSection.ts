import { type Page, type Locator } from '@playwright/test';
import { VetifyWebAppBasePage } from './BasePage';

export class VetifyWebappSideMenuSection extends VetifyWebAppBasePage {
  readonly closeSideMenuBtn: Locator;

  // Entries
  readonly videocallEntry: Locator;

  constructor(page: Page) {
    super(page, '/section/servicios');

    this.closeSideMenuBtn = page.locator('[data-cy="closeButton"]');

    this.videocallEntry = page.locator('[data-cy="vetifyMenuItem-videollamada"]');
  }
}
