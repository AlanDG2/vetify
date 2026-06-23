import type { MercadoPagoCard, MercadoPagoCardBrand } from '@models/mercadoPago';

/**
 * Mercado Pago test credit card providers.
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards
 */
export const MERCADOPAGO_CARD_PROVIDER = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
} as const satisfies Record<string, MercadoPagoCardBrand>;

export const MERCADOPAGO_CARD_EXPIRATION = {
  month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  year: (new Date().getFullYear() + 3).toString(),
} as const;

export const MERCADOPAGO_DEBIT_CARDS = {
  [MERCADOPAGO_CARD_PROVIDER.VISA]: {
    brand: MERCADOPAGO_CARD_PROVIDER.VISA,
    number: '4002768694395619',
    formattedNumber: '4002 7686 9439 5619',
    securityCode: '123',
    expirationMonth: MERCADOPAGO_CARD_EXPIRATION.month,
    expirationYear: MERCADOPAGO_CARD_EXPIRATION.year,
    brandCardId: 1,
    paymentTypeId: 2,
  },
  [MERCADOPAGO_CARD_PROVIDER.MASTERCARD]: {
    brand: MERCADOPAGO_CARD_PROVIDER.MASTERCARD,
    number: '5287338310253304',
    formattedNumber: '5287 3383 1025 3304',
    securityCode: '123',
    expirationMonth: MERCADOPAGO_CARD_EXPIRATION.month,
    expirationYear: MERCADOPAGO_CARD_EXPIRATION.year,
    brandCardId: 4,
    paymentTypeId: 2,
  }
}

export const MERCADOPAGO_CREDIT_CARDS = {
  [MERCADOPAGO_CARD_PROVIDER.VISA]: {
    brand: MERCADOPAGO_CARD_PROVIDER.VISA,
    number: '4509953566233704',
    formattedNumber: '4509 9535 6623 3704',
    securityCode: '123',
    expirationMonth: MERCADOPAGO_CARD_EXPIRATION.month,
    expirationYear: MERCADOPAGO_CARD_EXPIRATION.year,
    brandCardId: 1,
    paymentTypeId: 1,
  },
  [MERCADOPAGO_CARD_PROVIDER.MASTERCARD]: {
    brand: MERCADOPAGO_CARD_PROVIDER.MASTERCARD,
    number: '5031755734530604',
    formattedNumber: '5031 7557 3453 0604',
    securityCode: '123',
    expirationMonth: MERCADOPAGO_CARD_EXPIRATION.month,
    expirationYear: MERCADOPAGO_CARD_EXPIRATION.year,
    brandCardId: 4,
    paymentTypeId: 1,
  },
  [MERCADOPAGO_CARD_PROVIDER.AMEX]: {
    brand: MERCADOPAGO_CARD_PROVIDER.AMEX,
    number: '371180303257522',
    formattedNumber: '3711 803032 57522',
    securityCode: '1234',
    expirationMonth: MERCADOPAGO_CARD_EXPIRATION.month,
    expirationYear: MERCADOPAGO_CARD_EXPIRATION.year,
    brandCardId: 3,
    paymentTypeId: 1,
  },
} as const satisfies Record<MercadoPagoCardBrand, MercadoPagoCard>;
