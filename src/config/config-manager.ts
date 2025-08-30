import * as vscode from 'vscode';
import { RequestaryConfigSchema, ConfigValidator } from './config-schema';
import { Logger } from '../utils/logger';

export class ConfigManager {
    private static instance: ConfigManager;
    private config: RequestaryConfigSchema;
    private logger: Logger;

    private constructor() {
        this.logger = Logger.getInstance();
        this.config = ConfigValidator.getDefaultConfig();
        this.loadVSCodeConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public getConfig(): RequestaryConfigSchema {
        return { ...this.config };
    }

    public updateConfig(newConfig: Partial<RequestaryConfigSchema>): void {
        try {
            // Validate and merge new configuration
            this.config = ConfigValidator.mergeConfigs(this.config, newConfig);
            
            // Persist configuration to VS Code's workspace configuration
            const configuration = vscode.workspace.getConfiguration('requestary');
            
            // Update each configuration key
            Object.entries(newConfig).forEach(([key, value]) => {
                configuration.update(key, value, vscode.ConfigurationTarget.Global);
            });

            // Log configuration update
            this.logger.info('Configuration updated', { 
                updatedKeys: Object.keys(newConfig) 
            });
        } catch (error) {
            // Log and handle configuration update errors
            this.logger.error('Failed to update configuration', error as Error);
            vscode.window.showErrorMessage(`Configuration update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    public loadVSCodeConfig(): void {
        try {
            const configuration = vscode.workspace.getConfiguration('requestary');
            
            // Collect configuration updates
            const configUpdates: Partial<RequestaryConfigSchema> = {};
            
            // Mapping of VS Code config keys to our config schema
            const configMapping: { [key: string]: keyof RequestaryConfigSchema } = {
                'defaultTimeout': 'defaultTimeout',
                'defaultMethod': 'defaultMethod',
                'logLevel': 'logLevel',
                'logToFile': 'logToFile',
                'logFilePath': 'logFilePath',
                'saveHistory': 'saveHistory',
                'maxHistoryItems': 'maxHistoryItems',
                'historyExpirationDays': 'historyExpirationDays',
                'cacheResponses': 'cacheResponses',
                'maxCacheSize': 'maxCacheSize',
                'cacheTTL': 'cacheTTL',
                'validateSSL': 'validateSSL',
                'followRedirects': 'followRedirects',
                'maxRedirects': 'maxRedirects',
                'useProxy': 'useProxy',
                'proxyProtocol': 'proxyProtocol',
                'proxyHost': 'proxyHost',
                'proxyPort': 'proxyPort',
                'proxyUsername': 'proxyUsername',
                'proxyPassword': 'proxyPassword',
                'darkMode': 'darkMode',
                'compactView': 'compactView',
                'connectionTimeout': 'connectionTimeout',
                'keepAlive': 'keepAlive',
                'maxConnections': 'maxConnections'
            };

            // Collect configuration values
            Object.entries(configMapping).forEach(([vsCodeKey, configKey]) => {
                const value = configuration.get(vsCodeKey);
                if (value !== undefined) {
                    (configUpdates[configKey] as any) = value;
                }
            });

            // Validate and update configuration
            if (ConfigValidator.validateConfig(configUpdates)) {
                this.config = ConfigValidator.mergeConfigs(this.config, configUpdates);
                
                // Log successful configuration load
                this.logger.info('Configuration loaded from VS Code settings', { 
                    loadedKeys: Object.keys(configUpdates) 
                });
            } else {
                throw new Error('Invalid configuration loaded from VS Code settings');
            }
        } catch (error) {
            // Log and handle configuration load errors
            this.logger.error('Failed to load configuration', error as Error);
            vscode.window.showWarningMessage(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}. Using default configuration.`);
        }
    }

    public resetToDefaults(): void {
        try {
            // Reset to default configuration
            this.config = ConfigValidator.getDefaultConfig();
            
            // Clear VS Code configuration
            const configuration = vscode.workspace.getConfiguration('requestary');
            
            // Remove all configuration keys
            Object.keys(this.config).forEach(key => {
                configuration.update(key, undefined, vscode.ConfigurationTarget.Global);
            });

            // Log configuration reset
            this.logger.info('Configuration reset to defaults');
            vscode.window.showInformationMessage('Requestary configuration reset to defaults');
        } catch (error) {
            // Log and handle reset errors
            this.logger.error('Failed to reset configuration', error as Error);
            vscode.window.showErrorMessage(`Failed to reset configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
