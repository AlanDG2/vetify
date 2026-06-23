export type MercadoPagoCardBrand = 'visa' | 'mastercard' | 'amex';

export type MercadoPagoPaymentStatusCode =
  | 'APRO'
  | 'OTHE'
  | 'CONT'
  | 'CALL'
  | 'FUND'
  | 'SECU'
  | 'EXPI'
  | 'FORM'
  | 'CARD'
  | 'INST'
  | 'DUPL'
  | 'LOCK'
  | 'CTNA'
  | 'ATTE'
  | 'BLAC'
  | 'UNSU'
  | 'TEST';

export type MercadoPagoCard = {
  brand: MercadoPagoCardBrand;
  number: string;
  formattedNumber: string;
  securityCode: string;
  expirationMonth: string;
  expirationYear: string;
  brandCardId: number;
  paymentTypeId: number;
};

export type MercadoPagoPaymentStatus = {
  code: MercadoPagoPaymentStatusCode;
  cardholderName: MercadoPagoPaymentStatusCode;
  description: string;
  documentType?: string;
  documentNumber?: string;
};

export type MercadoPagoCheckoutPaymentData = {
  cardNumber: string;
  cardholderName: string;
  cvv: string;
  expiry: string;
  expirationMonth: string;
  expirationYear: string;
  brandCardId: number;
  paymentTypeId: number;
};

