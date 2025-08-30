import { LogLevel } from '../types/request';

export interface RequestaryConfigSchema {
    // Request Defaults
    defaultTimeout: number;
    defaultMethod: string;
    
    // Logging Configuration
    logLevel: LogLevel;
    logToFile: boolean;
    logFilePath?: string;
    
    // History Management
    saveHistory: boolean;
    maxHistoryItems: number;
    historyExpirationDays: number;
    
    // Performance and Caching
    cacheResponses: boolean;
    maxCacheSize: number;
    cacheTTL: number;
    
    // Security
    validateSSL: boolean;
    followRedirects: boolean;
    maxRedirects: number;
    
    // Proxy Settings
    useProxy: boolean;
    proxyProtocol: 'http' | 'https' | 'socks4' | 'socks5';
    proxyHost?: string;
    proxyPort?: number;
    proxyUsername?: string;
    proxyPassword?: string;
    
    // UI Preferences
    darkMode: boolean;
    compactView: boolean;
    
    // Advanced Network Settings
    connectionTimeout: number;
    keepAlive: boolean;
    maxConnections: number;
}

export class ConfigValidator {
    public static validateConfig(config: Partial<RequestaryConfigSchema>): boolean {
        // Validate timeout
        if (config.defaultTimeout !== undefined && 
            (config.defaultTimeout < 0 || config.defaultTimeout > 300000)) {
            return false;
        }

        // Validate log level
        if (config.logLevel !== undefined && 
            !['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
            return false;
        }

        // Validate history settings
        if (config.saveHistory !== undefined) {
            if (config.maxHistoryItems !== undefined && config.maxHistoryItems < 0) {
                return false;
            }
            if (config.historyExpirationDays !== undefined && config.historyExpirationDays < 0) {
                return false;
            }
        }

        // Validate cache settings
        if (config.cacheResponses !== undefined) {
            if (config.maxCacheSize !== undefined && config.maxCacheSize < 0) {
                return false;
            }
            if (config.cacheTTL !== undefined && config.cacheTTL < 0) {
                return false;
            }
        }

        // Validate proxy settings
        if (config.useProxy) {
            if (!config.proxyHost || !config.proxyPort) {
                return false;
            }
            if (config.proxyPort !== undefined && 
                (config.proxyPort < 1 || config.proxyPort > 65535)) {
                return false;
            }
        }

        // Validate network settings
        if (config.connectionTimeout !== undefined && 
            (config.connectionTimeout < 0 || config.connectionTimeout > 300000)) {
            return false;
        }
        if (config.maxConnections !== undefined && config.maxConnections < 1) {
            return false;
        }

        return true;
    }

    public static getDefaultConfig(): RequestaryConfigSchema {
        return {
            // Request Defaults
            defaultTimeout: 30000,
            defaultMethod: 'GET',
            
            // Logging Configuration
            logLevel: 'info',
            logToFile: false,
            
            // History Management
            saveHistory: true,
            maxHistoryItems: 100,
            historyExpirationDays: 30,
            
            // Performance and Caching
            cacheResponses: false,
            maxCacheSize: 50,
            cacheTTL: 3600,
            
            // Security
            validateSSL: true,
            followRedirects: true,
            maxRedirects: 5,
            
            // Proxy Settings
            useProxy: false,
            proxyProtocol: 'http',
            
            // UI Preferences
            darkMode: false,
            compactView: false,
            
            // Advanced Network Settings
            connectionTimeout: 10000,
            keepAlive: true,
            maxConnections: 10
        };
    }

    public static mergeConfigs(
        baseConfig: RequestaryConfigSchema, 
        newConfig: Partial<RequestaryConfigSchema>
    ): RequestaryConfigSchema {
        // Validate new config
        if (!this.validateConfig(newConfig)) {
            throw new Error('Invalid configuration');
        }

        // Merge configs
        return { ...baseConfig, ...newConfig };
    }
}
