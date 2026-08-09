import type { BrowserContext, CDPSession, Page } from '@playwright/test';

/**
 * Simulates a backend outage by blocking network requests at the CDP level (Network.setBlockedURLs).
 *
 * `page.route()` / `context.route()` do NOT reliably intercept requests proxied through this app's
 * Service Worker (Workbox, `NetworkFirst` on `/api/*` — see IMAS-4159): confirmed via manual MCP
 * exploration that route.abort() left those requests resolving 200. Chrome DevTools' own "Block
 * request URL" (what QA uses manually to reproduce these bugs) blocks at the CDP Network domain,
 * below the Service Worker, so that's what this helper replicates.
 *
 * A single CDP session must be reused for both blocking and restoring — creating a new session to
 * clear a block set by a previous session on the same page target does not reliably lift it.
 */
export class NetworkOutageSimulator {
    private session: CDPSession | undefined;

    constructor(private readonly page: Page) {}

    async block(urlPatterns: string[]): Promise<void> {
        const session = await this.getSession();
        await session.send('Network.setBlockedURLs', { urls: urlPatterns });
    }

    async restore(): Promise<void> {
        if (!this.session) {
            return;
        }
        await this.session.send('Network.setBlockedURLs', { urls: [] });
    }

    private async getSession(): Promise<CDPSession> {
        if (!this.session) {
            const context: BrowserContext = this.page.context();
            this.session = await context.newCDPSession(this.page);
            await this.session.send('Network.enable');
        }
        return this.session;
    }
}
