import type { MercadoPagoCard, MercadoPagoCardBrand, MercadoPagoCheckoutPaymentData, MercadoPagoPaymentStatusCode } from '@models/mercadoPago';
import { MERCADOPAGO_CREDIT_CARDS, MERCADOPAGO_DEBIT_CARDS } from './mercadoPagoCardProviders';
import { MERCADOPAGO_PAYMENT_STATUSES } from './mercadoPagoPaymentStatuses';

/**
 * Mercado Pago test credit cards and payment scenarios.
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards
 */
export class MercadoPagoCardsHelper {
    static readonly creditCards = MERCADOPAGO_CREDIT_CARDS;
    static readonly debitCards = MERCADOPAGO_DEBIT_CARDS;
    static readonly paymentStatuses = MERCADOPAGO_PAYMENT_STATUSES;

    static getCreditCard(brand: MercadoPagoCardBrand = 'visa'): MercadoPagoCard {
        return MercadoPagoCardsHelper.creditCards[brand];
    }

    static getDebitCard(brand: Extract<MercadoPagoCardBrand, 'visa' | 'mastercard'> = 'visa'): MercadoPagoCard {
        return MercadoPagoCardsHelper.debitCards[brand];
    }

    static listPaymentStatusCodes(): MercadoPagoPaymentStatusCode[] {
        return Object.keys(MercadoPagoCardsHelper.paymentStatuses) as MercadoPagoPaymentStatusCode[];
    }

    /** `cardKind` default ('credit') preserva el comportamiento de siempre para todo el código
     * existente — MercadoPago sandbox no tiene tarjetas de débito Amex, por eso el tipo de `brand`
     * se restringe a visa/mastercard únicamente cuando se pide débito. */
    static buildCheckoutPaymentData(statusCode: MercadoPagoPaymentStatusCode, brand: MercadoPagoCardBrand = 'visa', cardKind: 'credit' | 'debit' = 'credit'): MercadoPagoCheckoutPaymentData {
        const card = cardKind === 'debit' ? MercadoPagoCardsHelper.getDebitCard(brand as 'visa' | 'mastercard') : MercadoPagoCardsHelper.getCreditCard(brand);

        return {
            cardNumber: card.number,
            cardholderName: statusCode,
            cvv: card.securityCode,
            expirationMonth: card.expirationMonth,
            expirationYear: card.expirationYear,
            expiry: `${card.expirationMonth}/${card.expirationYear.slice(-2)}`,
            brandCardId: card.brandCardId,
            paymentTypeId: card.paymentTypeId,
        };
    }
}
