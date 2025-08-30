import * as vscode from 'vscode';

export class DependencyContainer {
    private static instance: DependencyContainer;
    private services: Map<string, any> = new Map();
    private factories: Map<string, (container: DependencyContainer) => any> = new Map();

    private constructor() {}

    public static getInstance(): DependencyContainer {
        if (!DependencyContainer.instance) {
            DependencyContainer.instance = new DependencyContainer();
        }
        return DependencyContainer.instance;
    }

    public register<T>(
        key: string, 
        service: T | ((container: DependencyContainer) => T)
    ): void {
        if (typeof service === 'function') {
            this.factories.set(key, service as (container: DependencyContainer) => T);
        } else {
            this.services.set(key, service);
        }
    }

    public resolve<T>(key: string): T {
        // Check if service is already instantiated
        if (this.services.has(key)) {
            return this.services.get(key);
        }

        // Check if there's a factory for this service
        if (this.factories.has(key)) {
            const factory = this.factories.get(key);
            const service = factory?.(this);
            this.services.set(key, service);
            return service;
        }

        throw new Error(`No service registered for key: ${key}`);
    }

    public reset(): void {
        this.services.clear();
        this.factories.clear();
    }

    public registerSingleton<T>(
        key: string, 
        factory: (container: DependencyContainer) => T
    ): void {
        let instance: T | null = null;
        this.register(key, (container) => {
            if (!instance) {
                instance = factory(container);
            }
            return instance;
        });
    }

    public initializeExtensionServices(context: vscode.ExtensionContext): void {
        // Import services dynamically to avoid circular dependencies
        const { ConfigManager } = require('../config/config-manager');
        const { Logger } = require('../utils/logger');
        const { RequestService } = require('../services/request-service');
        const { RequestHistoryManager } = require('../services/request-history-manager');

        // Register core services
        this.registerSingleton('configManager', () => ConfigManager.getInstance());
        this.registerSingleton('logger', () => Logger.getInstance());
        
        // Initialize services that require extension context
        this.register('historyManager', () => 
            RequestHistoryManager.initialize(context)
        );
        
        // Initialize request service with context
        RequestService.initialize(context);
        this.register('requestService', () => RequestService);
    }
}
