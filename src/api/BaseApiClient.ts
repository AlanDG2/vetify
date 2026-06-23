import type { APIRequestContext, APIResponse } from '@playwright/test';

export class BaseApiClient {
  constructor(
    protected readonly request: APIRequestContext,
    protected readonly baseURL: string,
  ) { }

  protected get(path: string, options?: Parameters<APIRequestContext['get']>[1]): Promise<APIResponse> {
    return this.request.get(this.url(path), options);
  }

  protected post(path: string, options?: Parameters<APIRequestContext['post']>[1]): Promise<APIResponse> {
    return this.request.post(this.url(path), options);
  }

  protected patch(path: string, options?: Parameters<APIRequestContext['patch']>[1]): Promise<APIResponse> {
    return this.request.patch(this.url(path), options);
  }

  protected put(path: string, options?: Parameters<APIRequestContext['patch']>[1]): Promise<APIResponse> {
    return this.request.put(this.url(path), options);
  }

  protected delete(path: string, options?: Parameters<APIRequestContext['delete']>[1]): Promise<APIResponse> {
    return this.request.delete(this.url(path), options);
  }

  private url(path: string): string {
    return new URL(path, this.baseURL).toString();
  }
}
