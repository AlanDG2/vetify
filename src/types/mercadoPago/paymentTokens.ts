import type { Identification } from '@models/shared';

export interface MercadoPagoCreateCardTokenResponse {
    tokenGeneradoMercadoPago: MercadoPagoGeneratedToken;
    intallInstallment: MercadoPagoInstallment;
    erroresMP: unknown | null;
}

export interface MercadoPagoGeneratedToken {
    id: string;
    first_six_digits: string;
    expiration_month: number;
    expiration_year: number;
    last_four_digits: string;
    cardholder: MercadoPagoCardholder;
    status: string;
    date_created: string;
    date_last_updated: string;
    date_due: string;
    luhn_validation: boolean;
    live_mode: boolean;
    require_esc: boolean;
    card_number_length: number;
    security_code_length: number;
}

export interface MercadoPagoCardholder {
    name: string;
    identification: Identification;
}

export interface MercadoPagoInstallment {
    payment_method_id: string;
    payment_type_id: string;
    issuer: MercadoPagoIssuer;
    processing_mode: string;
    merchant_account_id: string | null;
    payer_costs: MercadoPagoPayerCost[];
    agreements: unknown | null;
}

export interface MercadoPagoIssuer {
    id: string;
    name: string;
    secure_thumbnail: string;
    thumbnail: string;
}

export interface MercadoPagoPayerCost {
    installments: number;
    installment_rate: number;
    discount_rate: number;
    reimbursement_rate: number;
    labels: MercadoPagoPayerCostLabel[];
    installment_rate_collector: MercadoPagoInstallmentRateCollector[];
    min_allowed_amount: number;
    max_allowed_amount: number;
    recommended_message: string;
    installment_amount: number | null;
    total_amount: number | null;
    payment_method_option_id: string;
}

export interface MercadoPagoPayerCostLabel {
    label: string;
}

export interface MercadoPagoInstallmentRateCollector {
    installment_rate_collector: string;
}

export interface TokenVentaMercadoPago {
    cardNumber: string;
    email: string;
    cardholder: TokenCardholder;
    expirationYear: string;
    expirationMonth: string;
    securityCode: string;
}

export interface TokenCardholder {
    name: string;
    identification: Identification;
}

export interface PaymentTokenPayload {
    tokenVentaMercadoPago: TokenVentaMercadoPago;
    paymentMethodId: string;
}

export type TokenIdentification = Identification;
export type TokenGeneradoMercadoPago = MercadoPagoGeneratedToken;
export type Cardholder = MercadoPagoCardholder;
export type IntallInstallment = MercadoPagoInstallment;
export type Issuer = MercadoPagoIssuer;
export type PayerCost = MercadoPagoPayerCost;
export type PayerCostLabel = MercadoPagoPayerCostLabel;
export type InstallmentRateCollector = MercadoPagoInstallmentRateCollector;
