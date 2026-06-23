import type { Identification } from '@models/shared';
import type { TokenVentaMercadoPago } from '@models/mercadoPago/paymentTokens';

export interface CheckoutPayload {
  calculateParam: CalculateParam;
  payer: Payer;
  tokenVentaMercadoPago: CheckoutTokenVenta;
  paymentMethodId: string;
  transactionAmount: number;
  idVenta: number | null;
  tokenSale: string | null;
  externalReference: string | null;
  payId: number | null;
  campania: string;
  urlImagenProducto: string;
  deviceId: string;
}

export interface CalculateParam {
  idTarjeta: number;
  esCredito: number;
  esDebito: number;
  cupon: string;
  couponDescription: string;
  listInvoicedProducts: InvoicedProduct[];
  subtotalWODiscount: number;
  discounts: number;
  subtotalWDiscount: number;
  total: number;
  idPayType: number;
}

export interface InvoicedProduct {
  id: number;
  qty: number;
}

export interface Payer {
  firstName: string;
  lastName: string;
  email: string;
  areaCode: string;
  telephoneNumber: string;
  streetName: string;
  streetNumber: string;
  zipCode: string;
  city: number;
  province: number;
  vip: 'Y' | 'N' | string;
  sex: 'M' | 'F' | string;
  piso: string;
  depto: string;
  dateBirth: string;
  payerIdentification: PayerIdentification;
}

export interface PayerIdentification {
  type: string;
  number: string;
  typeDocument: string;
}

export interface CheckoutTokenVenta extends Omit<TokenVentaMercadoPago, 'cardholder'> {
  cardholder: CheckoutCardholder;
}

export interface CheckoutCardholder {
  name: string;
  paymentTypeId: number;
  brandCardId: number;
  identification: Identification;
}
