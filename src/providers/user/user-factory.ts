import { VetifyInstitutionalApiClient } from '@api/vetify/institutional/vetify-institutional-api';
import { SiteId } from '@config/environment';
import { getRandomEmail, getRandomIdentificationNumber, getRandomPassword, wait } from '@helpers/automation-utils';
import { MERCADOPAGO_CARD_PROVIDER } from '@integrations/mercadopago/mercadoPagoCardProviders';
import { MercadoPagoCardsHelper } from '@integrations/mercadopago/MercadoPagoCardsHelper';
import { MERCADOPAGO_PAYMENT_STATUSES } from '@integrations/mercadopago/mercadoPagoPaymentStatuses';
import type { Identification } from '@models/shared';
import type { PlanItem, PlanList } from '@models/vetify';
import { expect, request } from '@playwright/test';
import { Cupon, CuponAlreadyUsedError, CuponFactory } from '@providers/cupon';
import { v4 as uuidv4 } from 'uuid';
import { UserTag } from './tags';
import { UserPool } from './user-pool';
import { type TestUser, UserSource } from './user-provider';

export interface GetTestUserOptions {
    email?: string;
    password?: string;
    identification?: Identification;
    numberOfPlans?: number;
    siteId: SiteId;
    registration?: boolean;
    configLabel?: string;
    // 2026-09-14 (IMAS-4490): permite pedir un plan puntual por clCuenta en vez de uno random del
    // catálogo -- necesario para condicionados, donde cada plan (Esencial/Classic/Cachorros/
    // Premium/Emergencias) tiene su propio PDF a verificar. Si no se pasa, se mantiene el
    // comportamiento de siempre (plan random). Solo tiene efecto para `VETIFY_ADQUIRENTE`/
    // `OSDE_ADQUIRENTE` (Capitado no pasa por catálogo).
    planId?: string;
}

export interface GetTestUserResponse {
    email: string;
    password: string;
    identification: Identification;
    numberOfPlans: number;
    siteId: SiteId;
    registration: boolean;
    leadIds: string[];
    configLabel?: string;
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

    static async generateTestUsers(options: GetTestUserOptions[] = []): Promise<Record<string, number>> {
        const vetifyInstitutionalApiClient = new VetifyInstitutionalApiClient(await request.newContext());

        const testUsers: GetTestUserResponse[] = [];
        const createdCountByLabel: Record<string, number> = {};

        for (const opt of options) {
            const { siteId, configLabel = 'Unknown' } = opt;
            let user;

            switch (siteId) {
                case SiteId.VETIFY_ADQUIRENTE:
                case SiteId.OSDE_ADQUIRENTE:
                    user = await this.generateVetifyTestUser(vetifyInstitutionalApiClient, opt);
                    break;
                case SiteId.OSDE_CAPITADO:
                case SiteId.FLUX_CAPITADO:
                    user = await this.generateCapitadoTestUser(vetifyInstitutionalApiClient, opt);
                    break;
                default:
                    throw new Error(`User generation flow not implemented for siteId: ${siteId as string}`);
            }

            if (user) {
                user.configLabel = configLabel;
                testUsers.push(user);
                createdCountByLabel[configLabel] = (createdCountByLabel[configLabel] ?? 0) + 1;
            }
        }

        pool.addFreshUsers(
            testUsers.map((user) => ({
                id: uuidv4(),
                siteId: user.siteId,
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

        return createdCountByLabel;
    }

    private static async generateVetifyTestUser(vetifyInstitutionalApiClient: VetifyInstitutionalApiClient, options: GetTestUserOptions): Promise<GetTestUserResponse | undefined> {
        const { email = getRandomEmail(), password = getRandomPassword(), numberOfPlans = 1, siteId, registration = false, planId } = options;

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

        // Bug real encontrado y corregido 2026-09-14: esto nunca pasaba `brand`, así que
        // `getPlans()` siempre filtraba con el default 'vetify' -- incluso para OSDE_ADQUIRENTE,
        // donde el catálogo real (`cuenta=MA_VETIFY`) hoy solo tiene un plan con "OSDE" en el
        // nombre, que ese mismo filtro excluye. Sin este fix, OSDE_ADQUIRENTE fallaba con
        // "Cannot read properties of undefined (reading 'id')" (0 planes tras el filtro) pese a que
        // el catálogo sí tenía un plan disponible para esa marca. Ver IMP-017 en
        // docs/impedimentos-bloqueos.md.
        const brand = siteId === SiteId.OSDE_ADQUIRENTE ? 'osde' : 'vetify';

        try {
            for (let i = 0; i < numberOfPlans; i++) {
                // includeFamilyPlans:true cuando se pide un planId puntual -- los planes "+1" (family)
                // quedarían excluidos por el filtro default si el caller pidió justo uno de esos.
                const plans: PlanList = await vetifyInstitutionalApiClient.getPlans({
                    includeFamilyPlans: !!planId,
                    brand,
                });

                let randomPlan: PlanItem | undefined;
                if (planId) {
                    randomPlan = plans.find((p) => p.id.toString() === planId);
                    if (!randomPlan) {
                        throw new Error(`Plan ${planId} no está disponible en el catálogo real hoy (cuenta=MA_VETIFY, brand=${brand}) -- ver IMP-017 en docs/impedimentos-bloqueos.md.`);
                    }
                } else {
                    randomPlan = plans[Math.floor(Math.random() * plans.length)];
                }

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
                siteId,
                leadIds,
                registration,
            };
        } catch (e) {
            console.error(`⚠️ Failed to generate Vetify test user for email ${email}:`, e);
            return undefined;
        }
    }

    private static async generateCapitadoTestUser(
        vetifyInstitutionalApiClient: VetifyInstitutionalApiClient,
        options: GetTestUserOptions,
    ): Promise<GetTestUserResponse | undefined> {
        const { email = getRandomEmail(), password = getRandomPassword(), siteId, registration = false } = options;

        const identification: Identification = {
            type: 'DNI',
            number: getRandomIdentificationNumber(),
        };

        let cupon: Cupon;

        try {
            cupon = await CuponFactory.generateRegistrationCupon({ siteId });
        } catch (e: any) {
            console.error(`⚠️ Failed to generate registration cupon for site ${siteId}: ${e.message ?? e}`);
            return undefined;
        }

        // Trazabilidad: hallazgo real 2026-09-14, ningún log anterior decía qué código de cupón se
        // había usado en un intento fallido -- imposible investigar cuál token específico estaba mal.
        console.log(`Using registration cupon ${cupon.code} for ${siteId} (${email})`);

        try {
            await vetifyInstitutionalApiClient.registerUserCapitado({
                firstName: 'Test',
                lastName: 'Automation',
                phone: '+541112345678',
                documentType: identification.type,
                documentNumber: identification.number,
                email: email,
                token: cupon.code,
            });

            return {
                email,
                password,
                identification,
                numberOfPlans: 1,
                siteId,
                leadIds: [],
                registration,
            };
        } catch (e) {
            console.error(`⚠️ Failed to generate Capitado test user for email ${email}:`, e);
            // Si el cupón ya estaba usado en el backend (drift real vs. pool local), está muerto de
            // verdad -- no tiene sentido devolverlo, va a volver a fallar igual. Cualquier OTRA falla
            // (red, 5xx, timeout) sí amerita devolverlo al pool para que otra corrida lo reintente en
            // vez de perderlo para siempre. Ver IMP-001 en docs/impedimentos-bloqueos.md.
            if (e instanceof CuponAlreadyUsedError) {
                console.error(`   Cupón ${cupon.code} ya estaba usado en el backend -- se descarta definitivamente (no se devuelve al pool).`);
            } else {
                CuponFactory.releaseRegistrationCupon(cupon);
                console.error(`   Cupón ${cupon.code} devuelto al pool (falla no relacionada al cupón en sí).`);
            }
            return undefined;
        }
    }
}
