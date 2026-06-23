import { promises as fs } from 'fs';
import * as path from 'path';

import { expect, request } from '@playwright/test';
import { Identification } from '@models/shared';
import { getRandomEmail, getRandomPassword, getRandomIdentificationNumber, wait } from '@helpers/Utils';
import type { PlanItem, PlanList } from '@models/vetify/institutional';
import { MercadoPagoCardsHelper } from '@helpers/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@constants/mercadoPagoPaymentStatuses';
import { MERCADOPAGO_CARD_PROVIDER } from '@constants/mercadoPagoCardProviders';
import { VetifyInstitutionalApiClient } from '@api/vetify/institutional/VetifyInstitutionalApiClient';


const DATA_SET_FOLDER = 'data-set';

export interface GetTestUserOptions {
    email?: string;
    password?: string;
    identification?: Identification;
    numberOfPlans?: number;
    brand?: 'Vetify' | 'IKE';
    registration?: boolean;
}

export interface GetTestUserResponse {
    email: string;
    password: string;
    identification: Identification;
    numberOfPlans: number;
    brand: 'Vetify' | 'IKE';
    registration: boolean;
    leadIds: string[];
}

export class UserHelper {
    static async getTestUser(): Promise<GetTestUserResponse | undefined> {
        const generatedPath = path.join(process.cwd(), DATA_SET_FOLDER, 'generated-test-users.json');
        const lockPath = `${generatedPath}.lock`;

        // simple file lock

        let lockHandle: fs.FileHandle | undefined;
        const maxRetries = 200; // ~10s at 50ms per retry
        let retries = 0;
        while (!lockHandle) {
            try {
                await fs.mkdir(path.dirname(generatedPath), { recursive: true });
                lockHandle = await fs.open(lockPath, 'wx');
            } catch {
                // lock exists, wait and retry
                if (++retries > maxRetries) throw new Error('Could not acquire lock for getTestUser');
                await wait(50);
            }
        }

        try {
            const exists = await fs.stat(generatedPath).then(() => true).catch(() => false);
            if (!exists) throw new Error('No generated test users file found. Run generateTestUsers first.');

            const raw = await fs.readFile(generatedPath, 'utf-8');
            const users: GetTestUserResponse[] = JSON.parse(raw || '[]');
            if (!users || users.length === 0) {
                console.warn('No test users available');
                return undefined;
            }

            const user = users.shift() as GetTestUserResponse;
            await fs.writeFile(generatedPath, JSON.stringify(users, null, 2), 'utf-8');

            return user;
        } finally {
            try { await lockHandle?.close(); } catch (e) {
                console.error(e);
            }
            await fs.unlink(lockPath).catch(() => { });
        }
    }

    static async generateTestUsers(options: GetTestUserOptions[] = [{}]): Promise<void> {
        const vetifyInstitutionalApiClient = new VetifyInstitutionalApiClient(await request.newContext());

        const testUsers: GetTestUserResponse[] = [];

        for (const opt of options) {
            const { brand = 'Vetify' } = opt;
            let user;

            if (brand === 'Vetify') {
                user = await UserHelper.generateVetifyTestUser(vetifyInstitutionalApiClient, opt);
            }

            if (brand === 'IKE') {
                throw Error('Not yet implemented');
            }

            if (user) {
                testUsers.push(user);
            }
        }

        const generatedPath = path.join(process.cwd(), DATA_SET_FOLDER, 'generated-test-users.json');
        await fs.mkdir(path.dirname(generatedPath), { recursive: true });

        const exists = await fs.stat(generatedPath).then(() => true).catch(() => false);
        let existingUsers: GetTestUserResponse[] = [];
        if (exists) {
            const raw = await fs.readFile(generatedPath, 'utf-8');
            existingUsers = JSON.parse(raw || '[]') as GetTestUserResponse[];
        }

        const merged = existingUsers.concat(testUsers);
        await fs.writeFile(generatedPath, JSON.stringify(merged, null, 2), 'utf-8');
    }

    private static async generateVetifyTestUser(vetifyInstitutionalApiClient: VetifyInstitutionalApiClient, options?: GetTestUserOptions): Promise<GetTestUserResponse> {
        const {
            email = getRandomEmail(),
            password = getRandomPassword(),
            numberOfPlans = 1,
            brand = 'Vetify',
            registration = false,
        } = options || {};

        const leadIds = [];

        const payerInfo = {
            firstName: 'Test',
            lastName: 'AUTOMATION',
            email,
            password,
            areaCode: '11',
            identification: {
                type: 'DNI',
                number: getRandomIdentificationNumber()
            },
            telephoneNumber: '50511958',
            streetName: 'Av Corrientes',
            streetNumber: '123',
            zipCode: '1234',
            city: 1,
            province: 1,
            vip: 'N',
        };

        for (let i = 0; i < numberOfPlans; i++) {
            // Get a random plan to use in the purchase flow
            const plans: PlanList = await vetifyInstitutionalApiClient.getPlans({
                includeFamilyPlans: false,
            });

            const randomPlan: PlanItem = plans[Math.floor(Math.random() * plans.length)];

            const paymentCard = MercadoPagoCardsHelper.buildCheckoutPaymentData(
                MERCADOPAGO_PAYMENT_STATUSES.APPROVED,
                MERCADOPAGO_CARD_PROVIDER.VISA,
            );

            const leadId = await vetifyInstitutionalApiClient.registerFirstStep({
                firstName: payerInfo.firstName,
                lastName: payerInfo.lastName,
                email: payerInfo.email,
                identification: payerInfo.identification,
                planId: randomPlan.id.toString(),
                planQuantity: 1
            });

            leadIds.push(leadId);

            await vetifyInstitutionalApiClient.registerSecondStep({
                firstName: payerInfo.firstName,
                lastName: payerInfo.lastName,
                email: payerInfo.email,
                identification: payerInfo.identification,
                planId: randomPlan.id.toString(),
                planQuantity: 1,
                leadId,
            });

            const purchaseResponse = await vetifyInstitutionalApiClient.createPurchase({
                calculateParam: {
                    idTarjeta: 1,
                    esCredito: 1,
                    esDebito: 0,
                    cupon: '',
                    couponDescription: '',
                    listInvoicedProducts: [{ id: randomPlan.id, qty: 1 }],
                    subtotalWODiscount: randomPlan.price,
                    discounts: 0,
                    subtotalWDiscount: randomPlan.price,
                    total: randomPlan.price,
                    idPayType: 1
                },
                payer: {
                    firstName: payerInfo.firstName,
                    lastName: payerInfo.lastName,
                    email: payerInfo.email,
                    areaCode: payerInfo.areaCode,
                    telephoneNumber: payerInfo.telephoneNumber,
                    streetName: payerInfo.streetName,
                    streetNumber: payerInfo.streetNumber,
                    zipCode: '1234',
                    city: 1,
                    province: 1,
                    vip: 'N',
                    sex: 'M',
                    piso: '',
                    depto: '',
                    dateBirth: '01-01-1990',
                    payerIdentification: {
                        type: '96',
                        number: payerInfo.identification.number,
                        typeDocument: '96'
                    }
                },
                tokenVentaMercadoPago: {
                    cardNumber: paymentCard.cardNumber,
                    email: payerInfo.email,
                    cardholder: {
                        name: paymentCard.cardholderName,
                        paymentTypeId: paymentCard.paymentTypeId,
                        brandCardId: paymentCard.brandCardId,
                        identification: {
                            number: payerInfo.identification.number,
                            type: payerInfo.identification.type,
                        }
                    },
                    expirationYear: paymentCard.expirationYear,
                    expirationMonth: paymentCard.expirationMonth,
                    securityCode: paymentCard.cvv
                },
                paymentMethodId: 'credit_card',
                transactionAmount: randomPlan.price,
                idVenta: null,
                tokenSale: null,
                externalReference: null,
                payId: null,
                campania: 'VETIFY-CHECKOUT-2025',
                urlImagenProducto: 'https://plans.ikeargentina.com.ar/vetify/assets/plan-image.png',
                deviceId: `test-device-id-${Date.now()}`,
            });

            // Validate that the purchase was successful
            expect(purchaseResponse).toBeDefined();
            expect(purchaseResponse.status).toBe(200);
            expect(purchaseResponse.statusMP).toBeDefined();
            expect(purchaseResponse.statusMP.status).toBe('approved');
            expect(purchaseResponse.statusMP.statusDetail).toBe('accredited');
            expect(typeof purchaseResponse.message).toBe('string');
            expect(typeof purchaseResponse.statusMP.idUser).toBe('string');
            expect(typeof purchaseResponse.statusMP.idMercadoPago).toBe('number');

            await vetifyInstitutionalApiClient.registerPaymentConfirmation({
                firstName: payerInfo.firstName,
                lastName: payerInfo.lastName,
                email: payerInfo.email,
                identification: payerInfo.identification,
                planId: randomPlan.id.toString(),
                planQuantity: 1,
                leadId,
            });

            // Wait 1 second bettween test user generation
            await wait(1_000);
        }

        return {
            email,
            password,
            identification: payerInfo.identification as Identification,
            numberOfPlans,
            brand,
            leadIds,
            registration,
        };
    }
}
