import type { MercadoPagoPaymentStatusCode } from '@models/mercadoPago';

/**
 * Mercado Pago test payment status codes (cardholder name drives the result).
 * @see https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test/cards
 */
export const MERCADOPAGO_PAYMENT_STATUSES = {
  APPROVED: 'APRO',
  DECLINED_GENERAL: 'OTHE',
  PENDING: 'CONT',
  DECLINED_AUTHORIZATION: 'CALL',
  DECLINED_INSUFFICIENT_FUNDS: 'FUND',
  DECLINED_INVALID_SECURITY_CODE: 'SECU',
  DECLINED_EXPIRATION: 'EXPI',
  DECLINED_FORM_ERROR: 'FORM',
  REJECTED_MISSING_CARD_NUMBER: 'CARD',
  REJECTED_INVALID_INSTALLMENTS: 'INST',
  REJECTED_DUPLICATE: 'DUPL',
  REJECTED_DISABLED_CARD: 'LOCK',
  REJECTED_CARD_TYPE_NOT_ALLOWED: 'CTNA',
  REJECTED_PIN_ATTEMPTS_EXCEEDED: 'ATTE',
  REJECTED_BLACKLISTED: 'BLAC',
  NOT_SUPPORTED: 'UNSU',
  AMOUNT_RULES: 'TEST',
} as const satisfies Record<string, MercadoPagoPaymentStatusCode>;
