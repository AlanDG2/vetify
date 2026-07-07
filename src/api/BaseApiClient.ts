import type { APIRequestContext, APIResponse } from '@playwright/test';
import { wait } from '@helpers/automation-utils';

type RetryOptions = {
    retries?: number;
    delayMs?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
};

export class BaseApiClient {
    protected maxRetries: number = 3;
    protected initialRetryDelayMs: number = 100;

    constructor(
        protected readonly request: APIRequestContext,
        protected readonly baseURL: string,
        maxRetries?: number,
    ) {
        if (maxRetries !== undefined) {
            this.maxRetries = maxRetries;
        }
    }

    /**
     * Executes an HTTP request with exponential backoff retry logic.
     * Only retries on 5xx server errors.
     */
    protected async executeWithRetry<T>(
        fn: () => Promise<T>,
        { retries = this.maxRetries, delayMs = this.initialRetryDelayMs, shouldRetry = () => true }: RetryOptions = {},
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;

                if (attempt === retries || !shouldRetry(error, attempt)) {
                    throw error;
                }

                if (delayMs > 0) {
                    await wait(delayMs);
                }
            }
        }

        throw lastError;
    }

    protected get(path: string, options?: Parameters<APIRequestContext['get']>[1]): Promise<APIResponse> {
        return this.executeWithRetry(() => this.request.get(this.url(path), options));
    }

    protected post(path: string, options?: Parameters<APIRequestContext['post']>[1]): Promise<APIResponse> {
        return this.executeWithRetry(() => this.request.post(this.url(path), options));
    }

    protected patch(path: string, options?: Parameters<APIRequestContext['patch']>[1]): Promise<APIResponse> {
        return this.executeWithRetry(() => this.request.patch(this.url(path), options));
    }

    protected put(path: string, options?: Parameters<APIRequestContext['put']>[1]): Promise<APIResponse> {
        return this.executeWithRetry(() => this.request.put(this.url(path), options));
    }

    protected delete(path: string, options?: Parameters<APIRequestContext['delete']>[1]): Promise<APIResponse> {
        return this.executeWithRetry(() => this.request.delete(this.url(path), options));
    }

    private url(path: string): string {
        return new URL(path, this.baseURL).toString();
    }
}
