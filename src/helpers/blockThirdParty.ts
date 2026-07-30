import { BrowserContext } from '@playwright/test';

export async function blockThirdParty(context: BrowserContext) {
    const blockedDomains = ['hotjar.com', 'hotjar.io'];

    await context.route('**/*', async (route) => {
        const url = route.request().url();

        if (blockedDomains.some((domain) => url.includes(domain))) {
            await route.abort();
            return;
        }

        await route.continue();
    });
}
