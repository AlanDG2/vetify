import fs from 'fs';
import { type Cookie } from '@playwright/test';
import { GENERAL_COOKIES_STORAGE_STATE_PATH } from '@config/test-configuration';
import Sites from '@config/sites';
import { getInstitutionalBaseUrl, getWebappBaseUrl } from '@config/environment';

function parseUrlDomain(url: string): string {
    let domain = 'localhost';

    try {
        const parsedUrl = new URL(url);
        domain = parsedUrl.hostname;
    } catch (error) {
        // Keep fallback values to avoid setup crashes on malformed URLs.
        console.error(error);
    }

    return domain;
}

function buildCookiePreferencesCookie(domain: string): Cookie {
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    return {
        name: 'cookie_preferences',
        value: '{%22necessary%22:true%2C%22analytics%22:true%2C%22advertising%22:true%2C%22functional%22:true}',
        domain,
        path: '/',
        expires,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
    };
}

function buildHomeTourDoneCookie(domain: string): Cookie {
    const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

    return {
        name: 'vetifyHomeTourDone',
        value: 'true',
        domain,
        path: '/',
        expires,
        httpOnly: false,
        secure: true,
        sameSite: 'None',
    };
}

export async function setupGeneralCookiesStorageState(): Promise<void> {
    let urls: string[] = [];

    Sites.forEach((site) => {
        urls.push(getWebappBaseUrl(site.id));
        urls.push(getInstitutionalBaseUrl(site.id));
    });

    // Remove duplicates
    urls = [...new Set(urls)];

    const cookies: Cookie[] = [...urls.map((u) => parseUrlDomain(u)).map((url) => buildCookiePreferencesCookie(url)), ...urls.map((url) => buildHomeTourDoneCookie(url))];

    const origins = urls.map((url) => ({
        origin: url,
        localStorage: [
            {
                name: 'cookie-consent.answer',
                value: 'allow',
            },
        ],
        sessionStorage: [],
    }));

    const storageState = {
        cookies,
        origins,
    };

    fs.mkdirSync(GENERAL_COOKIES_STORAGE_STATE_PATH.substring(0, GENERAL_COOKIES_STORAGE_STATE_PATH.lastIndexOf('/')), { recursive: true });

    fs.writeFileSync(GENERAL_COOKIES_STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2));
}
