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
