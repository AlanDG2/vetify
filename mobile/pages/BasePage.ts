import { browser } from '@wdio/globals';
// Trae la ampliación de tipos de 'webdriverio' (getContexts/switchContext, etc.) —
// @wdio/globals por sí solo declara WebdriverIO.Browser vacío.
import type {} from 'webdriverio';

const WEBVIEW_CONTEXT_PATTERN = /WEBVIEW/;

export abstract class BasePage {
    async switchToWebViewContext(): Promise<void> {
        const contexts = await browser.getContexts();
        const webviewContext = contexts.find((context) =>
            WEBVIEW_CONTEXT_PATTERN.test(typeof context === 'string' ? context : context.id),
        );

        if (!webviewContext) {
            throw new Error(`No se encontro contexto WEBVIEW. Contextos disponibles: ${JSON.stringify(contexts)}`);
        }

        await browser.switchContext(typeof webviewContext === 'string' ? webviewContext : webviewContext.id);
    }

    async switchToNativeContext(): Promise<void> {
        await browser.switchContext('NATIVE_APP');
    }
}
