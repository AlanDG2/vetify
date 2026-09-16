import { BaseApiClient } from '@api/base-api';
import { environment } from '@config/environment';
import type { MercadoPagoCreateCardTokenResponse, PaymentTokenPayload } from '@models/mercadoPago';
import { Identification } from '@models/shared';
import type { CheckoutPayload, PlanList } from '@models/vetify/institutional';
import { CuponAlreadyUsedError } from '@providers/cupon';
import { APIRequestContext } from 'playwright-core';

const CAMPAIGN_ID = '701O200000lHMtlIAG';

export interface GetPlanOptions {
    includeFamilyPlans?: boolean;
    // TODO: In a future, we may want to filter plans by type (individual or family). For now, we will include all plans.
    // type?: 'individual' | 'family'
    brand?: 'vetify' | 'osde';
}

interface FirstStepOptions {
    firstName: string;
    lastName: string;
    email: string;
    identification: Identification;
    planId: string;
    planQuantity: number;
}

interface SecondStepOptions {
    firstName: string;
    lastName: string;
    email: string;
    identification: Identification;
    planId: string;
    planQuantity: number;
    leadId: string;
}

interface PaymentConfirmationStepOptions {
    firstName: string;
    lastName: string;
    email: string;
    identification: Identification;
    planId: string;
    planQuantity: number;
    leadId: string;
}

interface RegisterUserCapitadoOptions {
    firstName: string;
    lastName: string;
    phone: string;
    documentType: string;
    documentNumber: string;
    email: string;
    token: string;
}

export class VetifyInstitutionalApiClient extends BaseApiClient {
    private authToken: string | null = null;

    constructor(request: APIRequestContext) {
        super(request, environment.VETIFY_INSTITUTIONAL_BASE_URL);
    }

    async getPlans(options?: GetPlanOptions): Promise<PlanList> {
        const { includeFamilyPlans = true, brand = 'vetify' } = options || {};

        const token = await this.getAuthToken();

        // Confirmado en vivo 2026-09-14: este endpoint se mudó a un dominio separado con prefijo
        // /api/v1/ -- `this.get()` acepta una URL absoluta y la usa tal cual (ver BaseApiClient.url()),
        // ignorando `this.baseURL`.
        const response = await this.get(`${environment.VETIFY_QUANTUM_BASE_URL}/api/v1/jengage/catalog/products?cuenta=MA_VETIFY`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok()) {
            throw new Error(`Failed to get plans: ${response.status()} ${response.statusText()}`);
        }

        const plans = (await response.json()) as PlanList;

        const isFamilyPlan = (p: any) => p.name.includes('+1');

        return plans.filter((p: any) => {
            if (!includeFamilyPlans && isFamilyPlan(p)) {
                return false;
            }
            if (brand === 'vetify' && p.name.includes('OSDE')) {
                return false;
            }
            return true;
        });
    }

    // No usado en ningún flujo actual (sin callers) -- NO se corrigió la URL como en getPlans()/
    // createPurchase() porque no se pudo verificar en vivo (nada lo ejercita hoy). Si se llega a usar,
    // probablemente tenga el mismo problema de dominio/path -- ver IMP-017 en impedimentos-bloqueos.md.
    async createCreditCardToken(paymentTokenPayload: PaymentTokenPayload): Promise<MercadoPagoCreateCardTokenResponse> {
        const token = await this.getAuthToken();

        const response = await this.post('api/quantum/jengage/payment/crear-token-tarjeta', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: paymentTokenPayload,
        });

        if (!response.ok()) {
            throw new Error(`Failed to create credit card token: ${response.status()} ${response.statusText()}`);
        }

        const data = await response.json();

        return data as MercadoPagoCreateCardTokenResponse;
    }

    async registerFirstStep(options: FirstStepOptions): Promise<string> {
        const token = await this.getAuthToken();

        const { firstName, lastName, email, identification, planId, planQuantity } = options;

        const payload = {
            leadId: '',
            PASO_ALCANZADO: 1,
            PAGADO: false,
            MOTIVO_RECHAZO: '',
            LINK: '',
            NOMBRE: firstName,
            APELLIDO: lastName,
            CODIGO_AREA: '11',
            TELEFONO: '50511958',
            email: email,
            TIPO_DOCUMENTO: '96',
            TIPO_DOCUMENTO_SELECCIONADO: identification.type,
            NUMERO_DOCUMENTO: identification.number,
            LANDING: 'Mascotas',
            CampaignId: CAMPAIGN_ID,
            Products: [{ id: planId, cantidad: planQuantity }],
            JSON_VERIFICACION_EMAIL: '',
            JSON_VERIFICACION_TELEFONO: '',
            CUPON: '',
            CUPON_DETALLE: '',
        };

        const response = await this.post('/api/sf/first-step', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: payload,
        });

        if (!response.ok()) {
            throw new Error(`Failed to create purchase: ${response.status()} ${response.statusText()}`);
        }

        const data: any = await response.json();

        if (!data.leadId) {
            throw new Error('Lead id not retrived');
        }

        return data.leadId;
    }

    async registerSecondStep(options: SecondStepOptions): Promise<void> {
        const token = await this.getAuthToken();

        const { firstName, lastName, email, identification, planId, planQuantity, leadId } = options;

        const payload = {
            PASO_ALCANZADO: 2,
            PAGADO: false,
            MOTIVO_RECHAZO: '',
            LINK: '',
            NOMBRE: firstName,
            APELLIDO: lastName,
            CODIGO_AREA: '11',
            TELEFONO: '50511958',
            email: email,
            TIPO_DOCUMENTO: '96',
            TIPO_DOCUMENTO_SELECCIONADO: identification.type,
            NUMERO_DOCUMENTO: identification.number,
            LANDING: 'Mascotas',
            PROVINCIA: '1',
            LOCALIDAD: '1',
            CALLE: 'Av Corrientes',
            NUMERO_CALLE: '123',
            PISO: null,
            DEPTO: '',
            CODIGO_POSTAL: '1234',
            JSON_VERIFICACION_EMAIL: '',
            JSON_VERIFICACION_TELEFONO: '',
            CUPON_DETALLE: '',
            CUPON: '',
            Products: [{ id: planId, cantidad: planQuantity }],
            CampaignId: CAMPAIGN_ID,
            leadId,
        };

        const response = await this.post('/api/sf/second-step', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: payload,
        });

        if (!response.ok()) {
            throw new Error(`Failed to create purchase: ${response.status()} ${response.statusText()}`);
        }
    }

    async registerPaymentConfirmation(options: PaymentConfirmationStepOptions): Promise<void> {
        const token = await this.getAuthToken();

        const { firstName, lastName, email, identification, planId, planQuantity, leadId } = options;

        const payload = {
            PASO_ALCANZADO: 3,
            PAGADO: true,
            MOTIVO_RECHAZO: '',
            LINK: '',
            NOMBRE: firstName,
            APELLIDO: lastName,
            CODIGO_AREA: '11',
            TELEFONO: '50511958',
            email: email,
            TIPO_DOCUMENTO: '96',
            TIPO_DOCUMENTO_SELECCIONADO: identification.type,
            NUMERO_DOCUMENTO: identification.number,
            LANDING: 'Mascotas',
            PROVINCIA: '1',
            LOCALIDAD: '1',
            CALLE: 'Av Corrientes',
            NUMERO_CALLE: '123',
            PISO: null,
            DEPTO: '',
            CODIGO_POSTAL: '1234',
            JSON_VERIFICACION_EMAIL: '',
            JSON_VERIFICACION_TELEFONO: '',
            CUPON_DETALLE: '',
            CUPON: '',
            Products: [{ id: planId, cantidad: planQuantity }],
            CampaignId: CAMPAIGN_ID,
            leadId,
        };

        const response = await this.post('/api/sf/ecommerce', {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: payload,
        });

        if (!response.ok()) {
            throw new Error(`Failed to create purchase: ${response.status()} ${response.statusText()}`);
        }
    }

    async createPurchase(checkoutData: CheckoutPayload): Promise<any> {
        const token = await this.getAuthToken();

        // Confirmado en vivo 2026-09-14 (compra real aprobada, póliza 20359411): este endpoint se
        // mudó al mismo dominio nuevo que getPlans() -- ver esa nota más arriba.
        const response = await this.post(`${environment.VETIFY_QUANTUM_BASE_URL}/api/v1/jengage/payment/pagar-mp?cuenta=MA_VETIFY`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            data: checkoutData,
        });

        if (!response.ok()) {
            // Incluir el body crudo -- el backend devuelve mensajes de error específicos
            // (ej. {"error":"Error al calcular precio del producto"}) que un status code solo
            // no muestra, y son la única pista real para diagnosticar un fallo de compra.
            const bodyText = await response.text().catch(() => '<no se pudo leer el body>');
            throw new Error(`Failed to create purchase: ${response.status()} ${response.statusText()} | body: ${bodyText}`);
        }

        return response.json();
    }

    async registerUserCapitado(options: RegisterUserCapitadoOptions): Promise<any> {
        const { firstName, lastName, phone, documentType, documentNumber, email, token } = options;

        const payload = {
            nombre: firstName,
            apellido: lastName,
            telefono: phone,
            tipoDocumento: documentType,
            documento: documentNumber,
            mail: email,
            token,
        };

        const response = await this.post('/api/registro', {
            headers: {
                'Content-Type': 'application/json',
            },
            data: payload,
        });

        if (!response.ok()) {
            const body = await response.text().catch(() => '');
            // Hallazgo real 2026-09-14: el pool local de cupones puede tener códigos marcados
            // "disponibles" que el backend real ya consumió antes (409 "El Token ya existe (registro
            // duplicado)") -- distinguir esto de cualquier otra falla es lo que le permite al llamador
            // decidir si conviene devolver el cupón al pool (ver CuponFactory.releaseRegistrationCupon)
            // o darlo por perdido para siempre.
            if (response.status() === 409 && /token.*existe|duplicad/i.test(body)) {
                throw new CuponAlreadyUsedError(`Cupón ya usado (409): ${body}`);
            }
            throw new Error(`Failed to register user: ${response.status()} ${response.statusText()} | ${body}`);
        }

        return response.json();
    }

    private async getAuthToken(): Promise<string> {
        if (!this.authToken) {
            const response = await this.get('/api/quantum/jauth/token');

            if (!response.ok()) {
                throw new Error(`Failed to get token: ${response.status()} ${response.statusText()}`);
            }

            const data = await response.json();

            if (!data.accessToken) {
                throw new Error('Access token not found in response');
            }

            this.authToken = data.accessToken as string;
        }

        return this.authToken;
    }
}
