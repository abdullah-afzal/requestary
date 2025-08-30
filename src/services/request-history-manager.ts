import * as vscode from 'vscode';
import { 
    RequestConfig, 
    RequestResponse, 
    RequestError 
} from '../types/request';
import { ConfigManager } from '../config/config-manager';
import { Logger } from '../utils/logger';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    request: RequestConfig;
    response?: RequestResponse;
    error?: RequestError;
    status: 'success' | 'error';
}

export class RequestHistoryManager {
    private static instance: RequestHistoryManager;
    private configManager: ConfigManager;
    private logger: Logger;
    private history: HistoryEntry[] = [];
    private storageKey = 'requestary.requestHistory';

    private constructor(private context: vscode.ExtensionContext) {
        this.configManager = ConfigManager.getInstance();
        this.logger = Logger.getInstance();
        this.loadHistory();
    }

    public static initialize(context: vscode.ExtensionContext): RequestHistoryManager {
        if (!RequestHistoryManager.instance) {
            RequestHistoryManager.instance = new RequestHistoryManager(context);
        }
        return RequestHistoryManager.instance;
    }

    public static getInstance(): RequestHistoryManager {
        if (!RequestHistoryManager.instance) {
            throw new Error('RequestHistoryManager not initialized. Call initialize first.');
        }
        return RequestHistoryManager.instance;
    }

    private loadHistory(): void {
        try {
            const storedHistory = this.context.globalState.get<HistoryEntry[]>(this.storageKey);
            if (storedHistory) {
                this.history = storedHistory;
                this.logger.debug(`Loaded ${this.history.length} history entries`);
            }
        } catch (error) {
            this.logger.error('Failed to load request history', error as Error);
        }
    }

    private saveHistory(): void {
        const config = this.configManager.getConfig();
        
        // Trim history if it exceeds max items
        if (this.history.length > config.maxHistoryItems) {
            this.history = this.history.slice(-config.maxHistoryItems);
        }

        try {
            this.context.globalState.update(this.storageKey, this.history);
        } catch (error) {
            this.logger.error('Failed to save request history', error as Error);
        }
    }

    public addSuccessfulRequest(
        request: RequestConfig, 
        response: RequestResponse
    ): HistoryEntry {
        const config = this.configManager.getConfig();
        
        if (!config.saveHistory) {
            this.logger.debug('History saving is disabled');
            return null as unknown as HistoryEntry;
        }

        const entry: HistoryEntry = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            request,
            response,
            status: 'success'
        };

        this.history.push(entry);
        this.saveHistory();

        this.logger.debug('Added successful request to history', { 
            method: request.method, 
            url: request.url 
        });

        return entry;
    }

    public addFailedRequest(
        request: RequestConfig, 
        error: RequestError
    ): HistoryEntry {
        const config = this.configManager.getConfig();
        
        if (!config.saveHistory) {
            this.logger.debug('History saving is disabled');
            return null as unknown as HistoryEntry;
        }

        const entry: HistoryEntry = {
            id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            request,
            error,
            status: 'error'
        };

        this.history.push(entry);
        this.saveHistory();

        this.logger.debug('Added failed request to history', { 
            method: request.method, 
            url: request.url,
            errorMessage: error.message
        });

        return entry;
    }

    public getHistory(): HistoryEntry[] {
        return [...this.history];
    }

    public getHistoryById(id: string): HistoryEntry | undefined {
        return this.history.find(entry => entry.id === id);
    }

    public clearHistory(): void {
        this.history = [];
        this.saveHistory();
        this.logger.info('Request history cleared');
    }

    public exportHistory(format: 'json' | 'csv' = 'json'): void {
        const config = this.configManager.getConfig();
        
        // Prompt user to choose save location
        vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`requestary_history.${format}`),
            filters: {
                'History Files': [format]
            }
        }).then(fileUri => {
            if (fileUri) {
                try {
                    let content: string;
                    if (format === 'json') {
                        content = JSON.stringify(this.history, null, 2);
                    } else {
                        // Basic CSV export (simplified)
                        content = this.history.map(entry => 
                            `${entry.timestamp},${entry.request.method},${entry.request.url},${entry.status}`
                        ).join('\n');
                    }

                    vscode.workspace.fs.writeFile(fileUri, Buffer.from(content));
                    vscode.window.showInformationMessage(`History exported to ${fileUri.fsPath}`);
                } catch (error) {
                    this.logger.error('Failed to export history', error as Error);
                    vscode.window.showErrorMessage('Failed to export request history');
                }
            }
        });
    }
}
