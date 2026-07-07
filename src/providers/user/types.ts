import { Identification } from '@models/shared';
import { UserTag } from './tags';

export enum UserSource {
    Pooled = 'pooled',
    Fresh = 'fresh',
}

export interface TestUser {
    id: string;
    brand: string;
    email: string;
    password: string;
    identification: Identification;
    leadIds?: string[];
    numberOfPlans: number;
    registration: boolean;
    source: UserSource;
    tags: UserTag[];
}

export interface UserRequest {
    source: UserSource;
    tags?: UserTag[];
    numberOfPlans?: number;
    reserve?: boolean; // Optional flag to indicate if the user should be reserved or not
    ignoreReserved?: boolean; // Optional flag to indicate if reserved users should be ignored
}
