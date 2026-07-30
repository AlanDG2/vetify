import { type Locator, type Page } from '@playwright/test';
import { VetifyWebappBasePage } from './BasePage';

export class VetifyWebappSideMenuSection extends VetifyWebappBasePage {
    readonly closeSideMenuBtn: Locator;

    // Entries
    readonly videocallEntry: Locator;

    constructor(page: Page) {
        super(page, '/section/servicios');

        this.closeSideMenuBtn = page.locator('[data-cy="closeButton"]');

        this.videocallEntry = page.locator('[data-cy="vetifyMenuItem-videollamada"]');
    }
}
