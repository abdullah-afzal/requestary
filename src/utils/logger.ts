import * as vscode from 'vscode';
import { ConfigManager } from '../config/config-manager';

export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private configManager: ConfigManager;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Requestary');
        this.configManager = ConfigManager.getInstance();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
        const config = this.configManager.getConfig();
        const logLevels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = logLevels.indexOf(config.logLevel);
        const messageLevelIndex = logLevels.indexOf(level);
        
        return messageLevelIndex >= currentLevelIndex;
    }

    public debug(message: string, ...args: any[]): void {
        if (this.shouldLog('debug')) {
            this.log('DEBUG', message, ...args);
        }
    }

    public info(message: string, ...args: any[]): void {
        if (this.shouldLog('info')) {
            this.log('INFO', message, ...args);
        }
    }

    public warn(message: string, ...args: any[]): void {
        if (this.shouldLog('warn')) {
            this.log('WARN', message, ...args);
            vscode.window.showWarningMessage(message);
        }
    }

    public error(message: string, error?: Error, ...args: any[]): void {
        if (this.shouldLog('error')) {
            this.log('ERROR', message, ...args);
            
            // Show error message in VS Code
            vscode.window.showErrorMessage(message);
            
            // Log full error details
            if (error) {
                this.outputChannel.appendLine(`Error Details: ${error.stack || error.message}`);
            }
        }
    }

    private log(level: string, message: string, ...args: any[]): void {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        // Log to output channel
        this.outputChannel.appendLine(logMessage);
        
        // Log additional arguments if present
        if (args.length > 0) {
            args.forEach(arg => {
                this.outputChannel.appendLine(JSON.stringify(arg, null, 2));
            });
        }
    }

    public show(): void {
        this.outputChannel.show();
    }

    public clear(): void {
        this.outputChannel.clear();
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }
}
