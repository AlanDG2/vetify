import { BaseApiClient } from '@api/base-api';
import { environment } from '@config/environment';
import { getRandomElement, getRandomInt } from '@helpers/automation-utils';
import { Identification } from '@models/shared/identification';
import { expect, type Page } from '@playwright/test';
import { DateTime } from 'luxon';
import { APIRequestContext } from 'playwright-core';

export interface ActivatePolicyRequest {
    idType: string;
    accountId: string;
    firstName: string;
    lastName: string;
    email: string;
    identification: Identification;
}

export class VetifyWebappApiClient extends BaseApiClient {
    private authToken: string;

    constructor(request: APIRequestContext, authToken: string, maxRetries?: number) {
        super(request, environment.VETIFY_WEBAPP_BASE_URL, maxRetries);
        this.authToken = authToken;
    }

    static async getApiClient(page: Page): Promise<VetifyWebappApiClient> {
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find((c) => c.name === 'session');

        if (!sessionCookie) {
            throw new Error('No session cookie found');
        }

        const sesionToken = JSON.parse(decodeURIComponent(sessionCookie.value));
        return new VetifyWebappApiClient(page.context().request, sesionToken.accessToken);
    }

    // =========================================================================
    // Section: User
    // =========================================================================

    async createUser(user: { email: string; password: string; brandUrl?: string }): Promise<void> {
        const response = await this.post('/api/users/create', {
            headers: {
                'Content-Type': 'application/json',
            },
            data: {
                email: user.email,
                password: user.password,
                brandUrl: user.brandUrl ?? 'vetify-qa.ikeapp.com',
            },
        });

        if (!response.ok()) {
            throw new Error(`Failed to create users: ${response.status()} ${response.statusText()}`);
        }
    }

    // =========================================================================
    // Section: Pets
    // =========================================================================

    // Get all the pets that an user has
    async getUserPets(): Promise<any[]> {
        const response = await super.get('/api/services/pets/my-products', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error("Error getting user's pets");
        }

        return response.json();
    }

    async getPetBreeds(): Promise<any> {
        const response = await super.get('/api/services/pets/especies', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error("Error getting user's pets");
        }

        return response.json();
    }

    async userHasPlanWithPet(): Promise<boolean> {
        const pets = await this.getUserPets();
        return pets.some((p: any) => p.estado === 'OCUPADO');
    }

    async getPlanWithoutPet(): Promise<any | undefined> {
        const pets = await this.getUserPets();
        return pets.find((p: any) => p.estado !== 'OCUPADO');
    }

    // =========================================================================
    // Section: Videocalls
    // =========================================================================

    async getScheduledVideocalls(): Promise<any[]> {
        const response = await super.get('/api/services/assistance/local/programmed?filterByProvider=true', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error('Error getting the scheduled videocalls');
        }

        return response.json();
    }

    async getScheduledVideoCallById(assistanceId: string): Promise<any> {
        const response = await super.get(`/api/services/pets/appointment/${assistanceId}`, {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error('Error getting the scheduled videocalls');
        }

        return response.json();
    }

    // IMAS-4546: cobertura real de videollamadas por mascota. `limite:100` es el valor sentinela que
    // usa el backend para "sin límite" (plan ilimitado) — confirmado vía MCP contra QA real
    // 2026-09-19 (cuenta B2C Emergencias/Cachorro, ambas devuelven {"disponible":100,"limite":100}),
    // a diferencia de un plan limitado real (ej. OSDE Esencial, {"disponible":N,"limite":2}).
    async getVideollamadaCobertura(petId: string): Promise<{ disponible: number; limite: number }> {
        const response = await super.get(`/api/services/pets/pet/${petId}/videollamada/cobertura`, {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error(`Error getting videollamada coverage: ${response.status()} ${await response.text()}`);
        }

        return response.json();
    }

    async getScheduleTimeAvailability(date: string) {
        const response = await super.get(`/api/services/pets/available-time-schedules?date=${date}`, {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error('Error getting the scheduled videocalls');
        }

        return response.json();
    }

    async scheduleVideocall(data?: { petId?: string; reason?: string; date?: string; time?: string; fileIds?: string[]; additionalComment?: string }): Promise<any> {
        const monthOffset = getRandomInt(0, 3);
        const dayOffset = getRandomInt(1, 10);
        const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

        const {
            reason = `Consulta ${Date.now()}`,
            date = selectedDay.toISO(),
            fileIds = [],
            additionalComment = `Comentarios adicionales de la consulta. ${Date.now()}`,
        } = data || {};

        let { petId, time } = data || {};

        if (!petId) {
            const petsList = await this.getUserPets();
            const randomPet: any = getRandomElement(petsList);
            petId = randomPet.id;
        }

        if (!time) {
            const timeAvailabilty = await this.getScheduleTimeAvailability(selectedDay.toFormat('yyyy-MM-dd'));
            time = getRandomElement(timeAvailabilty.map((t: any) => t.hora)) as string;
        }

        const payload = {
            answers: [
                {
                    questionId: 'petId',
                    key: 'petId',
                    value: petId,
                },
                {
                    questionId: 'reason',
                    key: 'reason',
                    value: reason,
                },
                {
                    questionId: 'calendar',
                    key: 'rango',
                    value: time,
                },
                {
                    questionId: 'calendar',
                    key: 'fecha',
                    value: date,
                },
            ],
            additionalInformation: {
                medias: fileIds.map((fId: string) => ({
                    id: fId,
                    url: '',
                    type: '',
                })),
                message: additionalComment,
            },
        };

        const response = await super.post('/api/services/assistance/493/create', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
            data: payload,
        });

        if (!response.ok()) {
            throw new Error(`Error scheduling a videocall: ${response.status()} ${await response.text()}`);
        }

        const { assistanceId } = await response.json();

        expect(assistanceId).toBeDefined();

        return {
            assistanceId,
            petId,
            reason,
            date,
            time,
            fileIds,
            additionalComment,
        };
    }

    async cancelVideoCall(videocallId: string): Promise<any> {
        // El modal de cancelación real (rediseño IMAS-3894, ver CancelVideocallModal.ts) no tiene
        // selector de motivo. `GET /cancel_reasons` es de la pantalla vieja (con selector) y
        // devuelve 500 de forma consistente en QA — nunca hace falta llamarlo. El backend, sin
        // embargo, sí requiere `motivo_id` en el body (un body vacío da 500); confirmado por
        // prueba directa contra la API que `1` es un motivo válido que el backend acepta siempre
        // — se usa como valor fijo ya que la UI real no expone ningún selector para elegir otro.
        const response = await super.put(`/api/services/pets/cancel/${videocallId}`, {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
            data: { motivo_id: 1 },
        });

        if (!response.ok()) {
            throw new Error('Error canceling videocall');
        }

        return response.json();
    }

    async cancelAllScheduledVideocalls(): Promise<void> {
        const scheduledVideocalls = await this.getScheduledVideocalls();
        for (const videocall of scheduledVideocalls) {
            await this.cancelVideoCall(videocall.id ?? videocall.assistanceId).catch(() => {});
        }
    }
}
