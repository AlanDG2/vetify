import { APIRequestContext } from 'playwright-core';
import { BaseApiClient } from '@api/base-api';
import { environment } from '@config/environment';

export interface UserAuthCredentials {
    email: string;
    password: string;
}

export interface SessionToken {
    accessToken: string;
    idToken: string;
    scope: string;
    expiresIn: number;
    tokenType: string;
    expirationDate: number;
}

export class AuthenticationApiClient extends BaseApiClient {
    constructor(request: APIRequestContext) {
        super(request, environment.AUTH_API_BASE_URL);
    }
}
