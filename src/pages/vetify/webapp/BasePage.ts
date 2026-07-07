import { type Page } from '@playwright/test';
import { getWebappBaseUrl, SiteId } from '@config/environment';

export class VetifyWebappBasePage {
    protected page: Page;
    protected baseUrl: string = getWebappBaseUrl(SiteId.VETIFY_ADQUIRIENTE);
    protected path?: string;

    constructor(page: Page, path?: string) {
        this.page = page;
        if (path) {
            this.path = path;
        }
    }

    getBaseUrl() {
        return this.baseUrl;
    }

    setPath(path: string): void {
        this.path = path;
    }

    getPath() {
        return this.path;
    }

    async load(): Promise<void> {
        if (!this.path) {
            throw new Error('Path is no defined for this page');
        }
        await this.page.goto(`${this.baseUrl}${this.path}`);
    }

    async waitForPageLoaded(): Promise<void> {
        await this.page.waitForURL(this.getUrl());
    }

    getUrl(): string {
        if (!this.path) {
            throw new Error('Path is no defined for this page');
        }
        return `${this.baseUrl}${this.path}`;
    }

    async expectLoaded(): Promise<void> {
        if (!this.path) {
            throw new Error('Path is no defined for this page');
        }
        await this.page.waitForURL(`${this.baseUrl}${this.path}`);
    }
}
