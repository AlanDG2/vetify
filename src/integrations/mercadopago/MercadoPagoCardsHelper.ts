import { MERCADOPAGO_CREDIT_CARDS, MERCADOPAGO_DEBIT_CARDS } from './mercadoPagoCardProviders';
import { MERCADOPAGO_PAYMENT_STATUSES } from './mercadoPagoPaymentStatuses';
import type { MercadoPagoCheckoutPaymentData, MercadoPagoPaymentStatusCode, MercadoPagoCard, MercadoPagoCardBrand } from '@models/mercadoPago';

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

    static listPaymentStatusCodes(): MercadoPagoPaymentStatusCode[] {
        return Object.keys(MercadoPagoCardsHelper.paymentStatuses) as MercadoPagoPaymentStatusCode[];
    }

    static buildCheckoutPaymentData(statusCode: MercadoPagoPaymentStatusCode, brand: MercadoPagoCardBrand = 'visa'): MercadoPagoCheckoutPaymentData {
        const card = MercadoPagoCardsHelper.getCreditCard(brand);

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
