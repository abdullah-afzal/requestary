import { RequestConfig, RequestResponse, RequestError } from '../types/request';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';
import { CacheService } from './cache-service';

export type InterceptorHook = (
    config: RequestConfig
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptorHook = (
    response: RequestResponse, 
    config: RequestConfig
) => RequestResponse | Promise<RequestResponse>;

export type ErrorInterceptorHook = (
    error: RequestError, 
    config: RequestConfig
) => RequestError | Promise<RequestError>;

export class RequestInterceptor {
    private static instance: RequestInterceptor;
    private configManager: ConfigManager;
    private logger: Logger;
    private cacheService: CacheService;

    // Interceptor hooks
    private requestHooks: InterceptorHook[] = [];
    private responseHooks: ResponseInterceptorHook[] = [];
    private errorHooks: ErrorInterceptorHook[] = [];

    private constructor() {
        this.configManager = ConfigManager.getInstance();
        this.logger = Logger.getInstance();
        this.cacheService = CacheService.getInstance();

        // Add default interceptors
        this.addDefaultInterceptors();
    }

    public static getInstance(): RequestInterceptor {
        if (!RequestInterceptor.instance) {
            RequestInterceptor.instance = new RequestInterceptor();
        }
        return RequestInterceptor.instance;
    }

    private addDefaultInterceptors(): void {
        // Logging interceptor
        this.requestHooks.push(this.loggingRequestInterceptor);
        this.responseHooks.push(this.loggingResponseInterceptor);
        this.errorHooks.push(this.loggingErrorInterceptor);

        // Caching interceptor
        this.requestHooks.push(this.cachingRequestInterceptor);
        this.responseHooks.push(this.cachingResponseInterceptor);
    }

    private async loggingRequestInterceptor(config: RequestConfig): Promise<RequestConfig> {
        this.logger.debug('Intercepted request', {
            method: config.method,
            url: config.url,
            params: config.params,
            headers: config.headers
        });
        return config;
    }

    private async loggingResponseInterceptor(
        response: RequestResponse, 
        config: RequestConfig
    ): Promise<RequestResponse> {
        this.logger.debug('Intercepted response', {
            method: config.method,
            url: config.url,
            status: response.status
        });
        return response;
    }

    private async loggingErrorInterceptor(
        error: RequestError, 
        config: RequestConfig
    ): Promise<RequestError> {
        this.logger.error('Intercepted error', {
            message: error.message,
        ...(error as any).details && { details: (error as any).details }
        });
        return error;
    }

    private async cachingRequestInterceptor(config: RequestConfig): Promise<RequestConfig> {
        // Check cache before making request
        const cachedResponse = this.cacheService.get(config);
        if (cachedResponse) {
            // Throw a special error to short-circuit request
            throw { 
                type: 'CACHE_HIT', 
                cachedResponse 
            };
        }
        return config;
    }

    private async cachingResponseInterceptor(
        response: RequestResponse, 
        config: RequestConfig
    ): Promise<RequestResponse> {
        // Cache successful responses
        this.cacheService.set(config, response);
        return response;
    }

    public addRequestInterceptor(hook: InterceptorHook): void {
        this.requestHooks.push(hook);
    }

    public addResponseInterceptor(hook: ResponseInterceptorHook): void {
        this.responseHooks.push(hook);
    }

    public addErrorInterceptor(hook: ErrorInterceptorHook): void {
        this.errorHooks.push(hook);
    }

    public async interceptRequest(config: RequestConfig): Promise<RequestConfig> {
        let interceptedConfig = config;
        for (const hook of this.requestHooks) {
            interceptedConfig = await hook(interceptedConfig);
        }
        return interceptedConfig;
    }

    public async interceptResponse(
        response: RequestResponse, 
        config: RequestConfig
    ): Promise<RequestResponse> {
        let interceptedResponse = response;
        for (const hook of this.responseHooks) {
            interceptedResponse = await hook(interceptedResponse, config);
        }
        return interceptedResponse;
    }

    public async interceptError(
        error: RequestError, 
        config: RequestConfig
    ): Promise<RequestError> {
        let interceptedError = error;
        for (const hook of this.errorHooks) {
            interceptedError = await hook(interceptedError, config);
        }
        return interceptedError;
    }
}
