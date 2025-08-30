import axios, { AxiosRequestConfig, Method, AxiosError } from 'axios';
import * as vscode from 'vscode';
import { 
    RequestConfig, 
    RequestResponse, 
    RequestError, 
    HttpMethod 
} from '../types/request';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';
import { RequestHistoryManager } from './request-history-manager';
import { RequestInterceptor } from './request-interceptor';
import { CacheService } from './cache-service';

export class RequestService {
    private static configManager = ConfigManager.getInstance();
    private static logger = Logger.getInstance();
    private static historyManager: RequestHistoryManager;
    private static interceptor = RequestInterceptor.getInstance();
    private static cacheService = CacheService.getInstance();

    public static initialize(context: vscode.ExtensionContext): void {
        this.historyManager = RequestHistoryManager.initialize(context);
    }

    private static transformConfig(config: RequestConfig): AxiosRequestConfig {
        const globalConfig = this.configManager.getConfig();
        const axiosConfig: AxiosRequestConfig = {
            method: config.method.toLowerCase() as Method,
            url: config.url,
            headers: { ...(config.headers || {}) },
            params: config.params || {},
            timeout: config.timeout || globalConfig.defaultTimeout
        };

        // Handle body
        if (config.body && config.body.type !== 'none') {
            switch (config.body.type) {
                case 'json':
                    axiosConfig.headers!['Content-Type'] = 'application/json';
                    axiosConfig.data = config.body.content;
                    break;
                case 'form-data':
                    axiosConfig.headers!['Content-Type'] = 'multipart/form-data';
                    axiosConfig.data = config.body.content;
                    break;
                case 'x-www-form-urlencoded':
                    axiosConfig.headers!['Content-Type'] = 'application/x-www-form-urlencoded';
                    axiosConfig.data = config.body.content;
                    break;
                case 'xml':
                    axiosConfig.headers!['Content-Type'] = 'application/xml';
                    axiosConfig.data = config.body.content;
                    break;
                case 'text':
                    axiosConfig.headers!['Content-Type'] = 'text/plain';
                    axiosConfig.data = config.body.content;
                    break;
            }
        }

        // Handle authentication
        if (config.auth) {
            switch (config.auth.type) {
                case 'basic':
                    axiosConfig.auth = {
                        username: config.auth.username || '',
                        password: config.auth.password || ''
                    };
                    break;
                case 'bearer':
                    axiosConfig.headers!['Authorization'] = 
                        `Bearer ${config.auth.token}`;
                    break;
            }
        }

        return axiosConfig;
    }

    static async sendRequest(config: RequestConfig): Promise<RequestResponse> {
        try {
            // Apply request interceptors
            const interceptedConfig = await this.interceptor.interceptRequest(config);
    
            // Transform config for axios
            const axiosConfig = this.transformConfig(interceptedConfig);
            
            this.logger.info(`Sending ${config.method} request to ${config.url}`);
    
            const start = Date.now();
    
            try {
                const response = await axios(axiosConfig);
                const time = Date.now() - start;
    
                // Calculate size of response body (stringified JSON or raw text)
                let rawBody: any = response.data;
                let size = 0;
                try {
                    size = new TextEncoder().encode(
                        typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody)
                    ).length;
                } catch {
                    size = 0;
                }
    
                const interceptedResponse = await this.interceptor.interceptResponse(
                    {
                        status: response.status,
                        headers: response.headers as Record<string, string | number | boolean>,
                        body: response.data,
                        time,
                        size
                    },
                    config
                );
    
                // Save successful request to history
                if (this.historyManager) {
                    this.historyManager.addSuccessfulRequest(config, interceptedResponse);
                }
    
                return interceptedResponse;
            } catch (error) {
                // Check for cache hit
                if ((error as any).type === "CACHE_HIT") {
                    return (error as any).cachedResponse;
                }
                throw error;
            }
        } catch (error: unknown) {
            // Detailed error logging and handling
            let requestError: RequestError;
    
            if (error instanceof AxiosError) {
                requestError = {
                    message: error.message,
                    code: error.code,
                    details: error.response?.data
                };
    
                this.logger.error("Request failed", error, {
                    url: config.url,
                    method: config.method,
                    errorCode: error.code,
                    errorResponse: error.response?.data
                });
            } else if (error instanceof Error) {
                requestError = {
                    message: error.message
                };
    
                this.logger.error("Unexpected error during request", error);
            } else {
                requestError = {
                    message: "Unknown error",
                    details: error
                };
            }
    
            // Apply error interceptors
            const interceptedError = await this.interceptor.interceptError(
                requestError, 
                config
            );
    
            // Save failed request to history
            if (this.historyManager) {
                this.historyManager.addFailedRequest(config, interceptedError);
            }
    
            throw interceptedError;
        }
    }

    // Utility methods for advanced request handling
    static async retryRequest(
        config: RequestConfig, 
        maxRetries: number = 3, 
        retryDelay: number = 1000
    ): Promise<RequestResponse> {
        let lastError: RequestError | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.sendRequest(config);
            } catch (error) {
                lastError = error as RequestError;
                
                this.logger.warn(`Request attempt ${attempt} failed`, {
                    url: config.url,
                    method: config.method,
                    error: lastError.message
                });

                // Wait before retrying
                if (attempt < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }

        // Throw the last error if all attempts fail
        throw lastError;
    }
}
