import { SiteId } from '@config/environment';

export enum CuponType {
    Reusable = 'reusable',
    OneTime = 'one-time',
}

export interface Cupon {
    code: string;
    type: CuponType;
    universal: boolean;
    projects?: SiteId[];
    percentageDiscount?: number;
}

export interface CuponRequest {
    type: CuponType;
    project?: SiteId;
}

// Lanzado cuando el backend rechaza un cupón porque YA fue usado (ej. 409 "El Token ya existe") --
// distingue una falla PERMANENTE del token (no tiene sentido devolverlo al pool, va a volver a
// fallar) de cualquier otra falla transitoria (red, 5xx, timeout) donde sí conviene liberar el
// cupón para que otra corrida lo pueda reintentar. Ver IMP-001 en docs/impedimentos-bloqueos.md --
// encontrado en vivo 2026-09-14: el pool local puede tener cupones marcados "disponibles" que ya
// fueron consumidos en el backend real (drift entre el archivo local y el estado real).
export class CuponAlreadyUsedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CuponAlreadyUsedError';
    }
}
