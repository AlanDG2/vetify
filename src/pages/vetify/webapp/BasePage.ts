import { expect, type Page } from '@playwright/test';
import { siteBaseUrls } from '@config/environment';

export class VetifyWebAppBasePage {
    protected page: Page;
    protected baseUrl: string = siteBaseUrls.vetifyWebapp;
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
        await expect(this.page).toHaveURL(`${this.baseUrl}${this.path}`);
    }
}