import type { APIRequestContext, APIResponse } from '@playwright/test';
import { retryWithExponentialBackoff } from '@helpers/automation-utils';

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
    protected async executeWithRetry(fn: () => Promise<APIResponse>): Promise<APIResponse> {
        return retryWithExponentialBackoff(fn, this.maxRetries, this.initialRetryDelayMs, (error: any, _attempt: number) => {
            // Only retry if we have a response with a 5xx status code
            if (error.response && typeof error.response.status === 'function') {
                const status = error.response.status();
                return status >= 500;
            }
            // Don't retry if there's no status code (network error, timeout, etc.)
            // This conservative approach ensures we don't retry non-retriable errors
            return false;
        });
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
