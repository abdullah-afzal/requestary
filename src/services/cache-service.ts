import { RequestConfig, RequestResponse } from '../types/request';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';

interface CacheEntry {
    data: RequestResponse;
    timestamp: number;
    ttl: number;
}

export class CacheService {
    private static instance: CacheService;
    private cache: Map<string, CacheEntry> = new Map();
    private configManager: ConfigManager;
    private logger: Logger;

    private constructor() {
        this.configManager = ConfigManager.getInstance();
        this.logger = Logger.getInstance();
    }

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    private generateCacheKey(config: RequestConfig): string {
        // Create a unique cache key based on request configuration
        const keyParts = [
            config.method,
            config.url,
            JSON.stringify(config.params || {}),
            JSON.stringify(config.headers || {}),
            config.body ? JSON.stringify(config.body) : '',
            config.auth ? JSON.stringify(config.auth) : ''
        ];
        return keyParts.join('|');
    }

    public set(config: RequestConfig, response: RequestResponse): void {
        const { cacheResponses, maxCacheSize, cacheTTL } = this.configManager.getConfig();

        // Check if caching is enabled
        if (!cacheResponses) {
            return;
        }

        const cacheKey = this.generateCacheKey(config);

        try {
            // Enforce max cache size
            if (this.cache.size >= maxCacheSize) {
                this.pruneCache();
            }

            // Store cache entry
            this.cache.set(cacheKey, {
                data: response,
                timestamp: Date.now(),
                ttl: cacheTTL * 1000 // Convert to milliseconds
            });

            this.logger.debug('Response cached', { 
                method: config.method, 
                url: config.url 
            });
        } catch (error) {
            this.logger.warn('Failed to cache response', error);
        }
    }

    public get(config: RequestConfig): RequestResponse | null {
        const { cacheResponses } = this.configManager.getConfig();

        // Check if caching is enabled
        if (!cacheResponses) {
            return null;
        }

        const cacheKey = this.generateCacheKey(config);
        const entry = this.cache.get(cacheKey);

        // Check if entry exists and is not expired
        if (entry) {
            const now = Date.now();
            if (now - entry.timestamp < entry.ttl) {
                this.logger.debug('Cache hit', { 
                    method: config.method, 
                    url: config.url 
                });
                return entry.data;
            }

            // Remove expired entry
            this.cache.delete(cacheKey);
        }

        return null;
    }

    private pruneCache(): void {
        const now = Date.now();
        const { maxCacheSize, cacheTTL } = this.configManager.getConfig();

        // Remove expired entries
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= entry.ttl) {
                this.cache.delete(key);
            }
        }

        // If cache is still over max size, remove oldest entries
        if (this.cache.size > maxCacheSize) {
            const sortedEntries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);

            const entriesToRemove = sortedEntries.slice(0, this.cache.size - maxCacheSize);
            entriesToRemove.forEach(([key]) => this.cache.delete(key));
        }

        this.logger.debug('Cache pruned', { 
            remainingEntries: this.cache.size 
        });
    }

    public clear(): void {
        this.cache.clear();
        this.logger.info('Cache cleared');
    }

    public getStats(): { 
        size: number, 
        maxSize: number, 
        enabled: boolean 
    } {
        const { cacheResponses, maxCacheSize } = this.configManager.getConfig();
        return {
            size: this.cache.size,
            maxSize: maxCacheSize,
            enabled: cacheResponses
        };
    }
}
