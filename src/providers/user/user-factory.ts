import { v4 as uuidv4 } from 'uuid';
import { expect, request } from '@playwright/test';
import { VetifyInstitutionalApiClient } from '@api/vetify/institutional/vetify-institutional-api';
import { SiteId } from '@config/environment';
import { getRandomEmail, getRandomIdentificationNumber, getRandomPassword, wait } from '@helpers/automation-utils';
import { MERCADOPAGO_CARD_PROVIDER } from '@integrations/mercadopago/mercadoPagoCardProviders';
import { MercadoPagoCardsHelper } from '@integrations/mercadopago/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@integrations/mercadopago/mercadoPagoPaymentStatuses';
import type { Identification } from '@models/shared';
import type { PlanItem, PlanList } from '@models/vetify';
import { UserPool } from './user-pool';
import { type TestUser, UserSource } from './user-provider';
import { UserTag } from './tags';
import { VetifyWebappApiClient } from '@api/vetify/webapp/vetify-webapp-api';

export interface GetTestUserOptions {
    email?: string;
    password?: string;
    identification?: Identification;
    numberOfPlans?: number;
    brand?: SiteId;
    registration?: boolean;
}

export interface GetTestUserResponse {
    email: string;
    password: string;
    identification: Identification;
    numberOfPlans: number;
    brand: SiteId;
    registration: boolean;
    leadIds: string[];
}

const pool = new UserPool();

export class UserFactory {
    static resetState(): void {
        this.resetPooledReservations();
        this.resetFreshReservations();
    }

    static resetPooledReservations(): void {
        pool.resetPooledReservations();
    }

    static resetFreshReservations(): void {
        pool.resetFreshReservations();
    }

    static getFreshAccounts(): TestUser[] {
        return pool.getFreshAccounts();
    }

    static updateFreshAccounts(freshAccounts: TestUser[]) {
        pool.updateFreshAccounts(freshAccounts);
    }

    static async generateTestUsers(options: GetTestUserOptions[] = [{}]): Promise<void> {
        const vetifyInstitutionalApiClient = new VetifyInstitutionalApiClient(await request.newContext());
        const vetifyWebappApiClient = new VetifyWebappApiClient(await request.newContext(), '');

        const testUsers: GetTestUserResponse[] = [];

        for (const opt of options) {
            const { brand = SiteId.VETIFY_ADQUIRIENTE } = opt;
            let user;

            if (brand === SiteId.VETIFY_ADQUIRIENTE) {
                user = await this.generateVetifyTestUser(vetifyInstitutionalApiClient, vetifyWebappApiClient, opt);
            }

            if (brand === SiteId.OSDE_ADQUIRIENTE) {
                user = await this.generateVetifyTestUser(vetifyInstitutionalApiClient, vetifyWebappApiClient, opt);
            }

            if (user) {
                testUsers.push(user);
            }
        }

        pool.addFreshUsers(
            testUsers.map((user) => ({
                id: uuidv4(),
                brand: user.brand,
                email: user.email,
                password: user.password,
                identification: user.identification,
                numberOfPlans: user.numberOfPlans,
                leadIds: user.leadIds,
                registration: user.registration,
                source: UserSource.Fresh,
                tags: [UserTag.UNREGISTERED, UserTag.NO_PET, UserTag.PLAN_WITHOUT_PET],
            })),
        );
    }

    private static async generateVetifyTestUser(
        vetifyInstitutionalApiClient: VetifyInstitutionalApiClient,
        vetifyWebappApiClient: VetifyWebappApiClient,
        options?: GetTestUserOptions,
    ): Promise<GetTestUserResponse> {
        const { email = getRandomEmail(), password = getRandomPassword(), numberOfPlans = 1, brand = SiteId.VETIFY_ADQUIRIENTE, registration = false } = options || {};

        const leadIds = [];

        const payerInfo = {
            firstName: 'Test',
            lastName: 'AUTOMATION',
            email,
            password,
            areaCode: '11',
            identification: {
                type: 'DNI',
                number: getRandomIdentificationNumber(),
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

            const paymentCard = MercadoPagoCardsHelper.buildCheckoutPaymentData(MERCADOPAGO_PAYMENT_STATUSES.APPROVED, MERCADOPAGO_CARD_PROVIDER.VISA);

            const leadId = await vetifyInstitutionalApiClient.registerFirstStep({
                firstName: payerInfo.firstName,
                lastName: payerInfo.lastName,
                email: payerInfo.email,
                identification: payerInfo.identification,
                planId: randomPlan.id.toString(),
                planQuantity: 1,
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
                    idPayType: 1,
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
                        typeDocument: '96',
                    },
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
                        },
                    },
                    expirationYear: paymentCard.expirationYear,
                    expirationMonth: paymentCard.expirationMonth,
                    securityCode: paymentCard.cvv,
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

            // Small delay to avoid overwhelming the API with rapid requests when creating multiple plans
            await wait(500);
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
