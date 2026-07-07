import { test, expect } from '@playwright/test';
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseApiClient } from '@api/BaseApiClient';

class TestBaseApiClient extends BaseApiClient {
    constructor(maxRetries: number = 3, initialRetryDelayMs: number = 1) {
        super({} as APIRequestContext, 'https://example.test', maxRetries);
        this.initialRetryDelayMs = initialRetryDelayMs;
    }

    public runWithRetry(fn: () => Promise<APIResponse>, shouldRetry: (error: unknown, attempt: number) => boolean): Promise<APIResponse> {
        return this.executeWithRetry(fn, { shouldRetry });
    }
}

function makeResponse(statusCode: number): APIResponse {
    return {
        status: () => statusCode,
    } as unknown as APIResponse;
}

test.describe('BaseApiClient.executeWithRetry', () => {
    test('retries 5xx responses and eventually succeeds', async () => {
        const client = new TestBaseApiClient(3, 1);
        let calls = 0;

        const response = await client.runWithRetry(
            async () => {
                calls += 1;
                if (calls < 3) {
                    const error = new Error('retriable status 500') as Error & { response?: APIResponse };
                    error.response = makeResponse(500);
                    throw error;
                }
                return makeResponse(200);
            },
            (error: unknown) => {
                const response = (error as { response?: APIResponse }).response;
                return !!response && response.status() >= 500;
            },
        );

        expect(response.status()).toBe(200);
        expect(calls).toBe(3);
    });

    test('throws after max retries when response remains 5xx', async () => {
        const maxRetries = 2;
        const client = new TestBaseApiClient(maxRetries, 1);
        let calls = 0;

        await expect(
            client.runWithRetry(
                async () => {
                    calls += 1;
                    const error = new Error('retriable status 503') as Error & { response?: APIResponse };
                    error.response = makeResponse(503);
                    throw error;
                },
                (error: unknown) => {
                    const response = (error as { response?: APIResponse }).response;
                    return !!response && response.status() >= 500;
                },
            ),
        ).rejects.toThrow(/retriable status 503/i);

        expect(calls).toBe(maxRetries);
    });

    test('does not retry errors without response status', async () => {
        const client = new TestBaseApiClient(3, 1);
        let calls = 0;

        await expect(
            client.runWithRetry(
                async () => {
                    calls += 1;
                    throw new Error('network down');
                },
                (error: unknown) => {
                    const response = (error as { response?: APIResponse }).response;
                    return !!response && response.status() >= 500;
                },
            ),
        ).rejects.toThrow('network down');

        expect(calls).toBe(1);
    });
});
