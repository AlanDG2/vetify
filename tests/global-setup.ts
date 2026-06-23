import fs from 'fs';
import path from 'path';
import { siteBaseUrls } from '@config/environment';


// The goal is to avoid the banner: "Cookies y opciones de publicidad"
async function setCookiesPreferences() {
    const urls: string[] = [
        siteBaseUrls.vetifyInstitutional,
        siteBaseUrls.vetifyWebapp,
    ].filter(u => u && u.length > 1);

    let cookies = urls.map((url: string) => {
        let domain = 'localhost';
        let secure = false;
        try {
            const u = new URL(url);
            domain = u.hostname;
            secure = u.protocol === 'https:';
        } catch (e) {
            // fallback to defaults
            console.error(e)
        }

        const cookieName = 'cookie_preferences';
        const cookieValue = '{%22necessary%22:true%2C%22analytics%22:true%2C%22advertising%22:true%2C%22functional%22:true}';
        const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 day

        return {
            name: cookieName,
            value: cookieValue,
            domain,
            path: '/',
            expires,
            httpOnly: false,
            secure,
            sameSite: 'Lax',
        };
    });

    cookies = cookies.concat(urls.map((url: string) => {
        let domain = 'localhost';
        let secure = false;
        try {
            const u = new URL(url);
            domain = u.hostname;
            secure = u.protocol === 'https:';
        } catch (e) {
            // fallback to defaults
            console.error(e)
        }
        const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 day

        return {
            name: 'vetifyHomeTourDone',
            value: 'true',
            domain,
            path: '/',
            expires,
            httpOnly: false,
            secure,
            sameSite: 'Lax',
        };
    }));


    const storage = {
        cookies,
        origins: [],
    };

    const outPath = path.resolve(process.cwd(), 'storageState.json');
    fs.writeFileSync(outPath, JSON.stringify(storage, null, 2));
}


export default async function globalSetup() {
    await setCookiesPreferences();
}
