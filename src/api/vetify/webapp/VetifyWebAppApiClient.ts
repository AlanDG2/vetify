import { expect, type Page } from '@playwright/test';
import { APIRequestContext } from 'playwright-core';
import { DateTime } from 'luxon';
import { getRandomInt, getRandomElement } from '@helpers/Utils';
import { BaseApiClient } from '@api/BaseApiClient';
import { environment } from '@config/environment';

export class VetifyWebappApiClient extends BaseApiClient {
    private authToken: string;

    constructor(request: APIRequestContext, authToken: string) {
        super(request, environment.VETIFY_WEBAPP_BASE_URL);
        this.authToken = authToken;
    }

    static async getApi(page: Page): Promise<VetifyWebappApiClient> {
        const cookies = await page.context().cookies();
        const sessionCookie = cookies.find(c => c.name === 'session');

        if (!sessionCookie) {
            throw new Error('No session cookie found');
        }

        const sesionToken = JSON.parse(decodeURIComponent(sessionCookie.value));
        return new VetifyWebappApiClient(page.context().request, sesionToken.accessToken);
    }


    // Get all the pets that an user has
    async getUserPets(): Promise<any> {
        const response = await super.get('/api/services/pets/my-products', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error('Error geting user\'s pets');
        }

        return response.json();
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

    async scheduleVideocall(data?: {
        petId?: string,
        reason?: string,
        date?: string,
        time?: string,
        fileIds?: string[],
        additionalComment?: string,
    }): Promise<any> {
        const monthOffset = getRandomInt(0, 3);
        const dayOffset = getRandomInt(1, 10);
        const selectedDay = DateTime.now().plus({ days: dayOffset, months: monthOffset });

        const {
            reason = `Consulta ${Date.now()}`,
            date = selectedDay.toISO(),
            time = getRandomElement(['09:30', '12:00', '13:30', '16:00']),
            fileIds = [],
            additionalComment = `Comentarios adicionales de la consulta. ${Date.now()}`
        } = data || {};

        let petId = data?.petId;

        if (!petId) {
            const petsList = await this.getUserPets();
            const randomPet: any = getRandomElement(petsList);
            petId = randomPet.id;
        }

        const payload = {
            answers: [
                {
                    questionId: 'petId',
                    key: 'petId',
                    value: petId
                },
                {
                    questionId: 'reason',
                    key: 'reason',
                    value: reason,
                },
                {
                    questionId: 'calendar',
                    key: 'rango',
                    value: time
                },
                {
                    questionId: 'calendar',
                    key: 'fecha',
                    value: date
                }
            ],
            additionalInformation: {
                medias: fileIds.map((fId: string) => ({
                    id: fId,
                    url: '',
                    type: ''
                })),
                message: additionalComment
            }
        };

        const response = await super.post('/api/services/assistance/493/create', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
            data: payload
        });

        if (!response.ok()) {
            throw new Error('Error scheduling a videocall');
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
            additionalComment
        };
    }

    async getCancelationReasons(): Promise<any[]> {
        const response = await super.get('/api/services/pets/cancel_reasons', {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
        });

        if (!response.ok()) {
            throw new Error('Error getting the reasons to cancel a videocall');
        }

        return response.json();
    }

    async cancelVideoCall(videocallId: string, reasonId?: number): Promise<any> {
        if (reasonId === undefined) {
            const rasonsApi = await this.getCancelationReasons();
            const randomReason = getRandomElement(rasonsApi);
            reasonId = randomReason.id;
        }

        const response = await super.put(`/api/services/pets/cancel/${videocallId}`, {
            headers: {
                Authorization: `Bearer ${this.authToken}`,
            },
            data: {
                motivo_id: reasonId
            },
        });

        if (!response.ok()) {
            throw new Error('Error canceling videocall');
        }

        return response.json();
    }
}