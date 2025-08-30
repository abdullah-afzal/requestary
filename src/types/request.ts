export type HttpMethod = 
    | 'GET' 
    | 'POST' 
    | 'PUT' 
    | 'DELETE' 
    | 'PATCH' 
    | 'HEAD' 
    | 'OPTIONS';

export type AuthType = 'none' | 'basic' | 'bearer' | 'oauth2';
export type BodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'xml' | 'text' | 'binary';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface BaseAuthConfig {
    type: AuthType;
}

export interface BasicAuthConfig extends BaseAuthConfig {
    type: 'basic';
    username: string;
    password: string;
}

export interface BearerAuthConfig extends BaseAuthConfig {
    type: 'bearer';
    token: string;
}

export interface OAuth2AuthConfig extends BaseAuthConfig {
    type: 'oauth2';
    clientId: string;
    clientSecret: string;
    tokenUrl: string;
    scopes?: string[];
}

export type AuthConfig = 
    | { type: 'none' }
    | BasicAuthConfig 
    | BearerAuthConfig 
    | OAuth2AuthConfig;

export interface RequestParams {
    [key: string]: string | number | boolean;
}

export interface headers {
    [key: string]: string | number | boolean;
}

export interface BaseRequestBody {
    type: BodyType;
}

export interface JsonRequestBody extends BaseRequestBody {
    type: 'json';
    content: Record<string, unknown>;
}

export interface FormDataRequestBody extends BaseRequestBody {
    type: 'form-data';
    content: Record<string, { 
        type: 'text' | 'file'; 
        value: string | File 
    }>;
}

export interface XWWWFormUrlencodedRequestBody extends BaseRequestBody {
    type: 'x-www-form-urlencoded';
    content: Record<string, string>;
}

export interface XMLRequestBody extends BaseRequestBody {
    type: 'xml';
    content: string;
}

export interface TextRequestBody extends BaseRequestBody {
    type: 'text';
    content: string;
}

export interface BinaryRequestBody extends BaseRequestBody {
    type: 'binary';
    content: File | Blob | Buffer | ArrayBuffer;
}

export type RequestBody = 
    | { type: 'none' }
    | JsonRequestBody 
    | FormDataRequestBody 
    | XWWWFormUrlencodedRequestBody 
    | XMLRequestBody 
    | TextRequestBody 
    | BinaryRequestBody;

export interface RequestConfig {
    method: HttpMethod;
    url: string;
    params?: RequestParams;
    headers?: headers;
    body?: RequestBody;
    auth?: AuthConfig;
    timeout?: number;
}

export interface RequestResponse {
    status: number;
    headers: Record<string, string | number | boolean>;
    body: unknown;
    time: number;
    size: number;
}

export interface RequestError {
    message: string;
    code?: string | number;
    details?: any;
}

// Validation Utilities
export class RequestValidator {
    public static validateMethod(method: string): method is HttpMethod {
        const validMethods: HttpMethod[] = [
            'GET', 'POST', 'PUT', 'DELETE', 
            'PATCH', 'HEAD', 'OPTIONS'
        ];
        return validMethods.includes(method as HttpMethod);
    }

    public static validateUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    public static validateRequestConfig(config: RequestConfig): boolean {
        // Validate method
        if (!this.validateMethod(config.method)) {
            return false;
        }

        // Validate URL
        if (!this.validateUrl(config.url)) {
            return false;
        }

        // Validate auth config
        if (config.auth) {
            switch (config.auth.type) {
                case 'basic':
                    if (!config.auth.username || !config.auth.password) {
                        return false;
                    }
                    break;
                case 'bearer':
                    if (!config.auth.token) {
                        return false;
                    }
                    break;
                case 'oauth2':
                    if (!config.auth.clientId || !config.auth.clientSecret || !config.auth.tokenUrl) {
                        return false;
                    }
                    break;
            }
        }

        return true;
    }
}
