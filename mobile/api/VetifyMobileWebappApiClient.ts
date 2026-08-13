import { browser } from '@wdio/globals';
import { DateTime } from 'luxon';
import { environment } from '../../src/config/environment';
import { getRandomElement, getRandomInt, wait } from '../../src/helpers/automation-utils';

// Equivalente mobile de src/api/vetify/webapp/vetify-webapp-api.ts (Playwright). No hay un
// APIRequestContext de Playwright disponible en una sesión de WebdriverIO/Appium — este cliente
// usa fetch() (global en Node 18+) directo contra el mismo backend, con el token de sesión leído
// vía browser.getCookies() (comando WebDriver clásico, funciona en contexto WEBVIEW porque Appium
// lo proxea a chromedriver) en vez de page.context().cookies() de Playwright. Confirmado en vivo
// que la cookie "session" tiene el mismo formato JSON con accessToken en ambas plataformas (mismo
// sitio, mismo backend de auth). Ver decision-log 2026-08-12.
//
// Cubre solo el subconjunto de endpoints que usan los specs mobile portados hasta ahora
// (videocall.spec.ts) — no es una copia 1:1 completa del cliente Playwright.
export class VetifyMobileWebappApiClient {
    private readonly maxRetries = 3;
    private readonly initialRetryDelayMs = 100;

    private constructor(private readonly authToken: string) {}

    static async getApiClient(): Promise<VetifyMobileWebappApiClient> {
        const cookies = await browser.getCookies();
        const sessionCookie = cookies.find((c) => c.name === 'session');
        if (!sessionCookie) throw new Error('No session cookie found');

        const sessionToken = JSON.parse(decodeURIComponent(sessionCookie.value));
        return new VetifyMobileWebappApiClient(sessionToken.accessToken);
    }

    private url(path: string): string {
        return new URL(path, environment.VETIFY_WEBAPP_BASE_URL).toString();
    }

    // Mismo criterio que BaseApiClient.executeWithRetry() (Playwright): reintenta ante cualquier
    // error (por defecto), con una espera fija entre intentos — no es backoff exponencial real
    // pese al nombre en el original, se calca el comportamiento tal cual.
    private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
        let lastError: unknown;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (attempt === this.maxRetries) throw error;
                await wait(this.initialRetryDelayMs);
            }
        }
        throw lastError;
    }

    private async request(path: string, init?: RequestInit): Promise<Response> {
        return this.executeWithRetry(() =>
            fetch(this.url(path), {
                ...init,
                headers: {
                    Authorization: `Bearer ${this.authToken}`,
                    ...(init?.headers ?? {}),
                },
            }),
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getUserPets(): Promise<any[]> {
        const response = await this.request('/api/services/pets/my-products');
        if (!response.ok) throw new Error("Error getting user's pets");
        return response.json();
    }

    async userHasPlanWithPet(): Promise<boolean> {
        const pets = await this.getUserPets();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return pets.some((p: any) => p.estado === 'OCUPADO');
    }

    // Equivalente mobile de src/api/vetify/webapp/vetify-webapp-api.ts getPetBreeds() — usado para
    // comparar el listado de razas mostrado en el paso 3 del wizard contra el real (TS-02 TC-11/12).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getPetBreeds(): Promise<any[]> {
        const response = await this.request('/api/services/pets/especies');
        if (!response.ok) throw new Error('Error getting pet breeds');
        return response.json();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getPlanWithoutPet(): Promise<any | undefined> {
        const pets = await this.getUserPets();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return pets.find((p: any) => p.estado !== 'OCUPADO');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getScheduledVideocalls(): Promise<any[]> {
        const response = await this.request('/api/services/assistance/local/programmed?filterByProvider=true');
        if (!response.ok) throw new Error('Error getting the scheduled videocalls');
        return response.json();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getScheduledVideoCallById(assistanceId: string): Promise<any> {
        const response = await this.request(`/api/services/pets/appointment/${assistanceId}`);
        if (!response.ok) throw new Error('Error getting the scheduled videocalls');
        return response.json();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async getScheduleTimeAvailability(date: string): Promise<any> {
        const response = await this.request(`/api/services/pets/available-time-schedules?date=${date}`);
        if (!response.ok) throw new Error('Error getting the scheduled videocalls');
        return response.json();
    }

    async scheduleVideocall(data?: {
        petId?: string;
        reason?: string;
        date?: string;
        time?: string;
        fileIds?: string[];
        additionalComment?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }): Promise<any> {
        const monthOffset = getRandomInt(0, 3);
        const dayOffset = getRandomInt(1, 10);
        const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

        const {
            reason = `Consulta ${Date.now()}`,
            date = selectedDay.toISO() ?? undefined,
            fileIds = [],
            additionalComment = `Comentarios adicionales de la consulta. ${Date.now()}`,
        } = data || {};

        let { petId, time } = data || {};

        if (!petId) {
            const petsList = await this.getUserPets();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const randomPet: any = getRandomElement(petsList);
            petId = randomPet.id;
        }

        if (!time) {
            const timeAvailability = await this.getScheduleTimeAvailability(selectedDay.toFormat('yyyy-MM-dd'));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            time = getRandomElement(timeAvailability.map((t: any) => t.hora)) as string;
        }

        const payload = {
            answers: [
                { questionId: 'petId', key: 'petId', value: petId },
                { questionId: 'reason', key: 'reason', value: reason },
                { questionId: 'calendar', key: 'rango', value: time },
                { questionId: 'calendar', key: 'fecha', value: date },
            ],
            additionalInformation: {
                medias: fileIds.map((fId: string) => ({ id: fId, url: '', type: '' })),
                message: additionalComment,
            },
        };

        const response = await this.request('/api/services/assistance/493/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`Error scheduling a videocall: ${response.status} ${await response.text()}`);

        const { assistanceId } = await response.json();
        if (!assistanceId) throw new Error('scheduleVideocall response missing assistanceId');

        return { assistanceId, petId, reason, date, time, fileIds, additionalComment };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async cancelVideoCall(videocallId: string): Promise<any> {
        // Ver comentario en el original Playwright: motivo_id:1 fijo, la UI real no expone
        // selector de motivo y /cancel_reasons (pantalla vieja) da 500 de forma consistente.
        const response = await this.request(`/api/services/pets/cancel/${videocallId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo_id: 1 }),
        });

        if (!response.ok) throw new Error('Error canceling videocall');
        return response.json();
    }

    async cancelAllScheduledVideocalls(): Promise<void> {
        const scheduled = await this.getScheduledVideocalls();
        for (const videocall of scheduled) {
            await this.cancelVideoCall(videocall.id ?? videocall.assistanceId).catch(() => undefined);
        }
    }
}
