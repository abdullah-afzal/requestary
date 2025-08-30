import * as vscode from 'vscode';
import { DependencyContainer } from './dependency-container';

export interface CommandDefinition {
    id: string;
    handler: (context: vscode.ExtensionContext, ...args: any[]) => Promise<void> | void;
}

export class CommandRegistry {
    private static instance: CommandRegistry;
    private commands: Map<string, CommandDefinition> = new Map();
    private container: DependencyContainer;

    private constructor() {
        this.container = DependencyContainer.getInstance();
    }

    public static getInstance(): CommandRegistry {
        if (!CommandRegistry.instance) {
            CommandRegistry.instance = new CommandRegistry();
        }
        return CommandRegistry.instance;
    }

    public register(command: CommandDefinition): void {
        if (this.commands.has(command.id)) {
            throw new Error(`Command with id '${command.id}' is already registered`);
        }
        this.commands.set(command.id, command);
    }

    public registerCommands(context: vscode.ExtensionContext): void {
        // Retrieve logger for logging command registrations
        const logger = this.container.resolve<any>('logger');

        this.commands.forEach((command) => {
            const disposable = vscode.commands.registerCommand(
                command.id, 
                async (...args: any[]) => {
                    try {
                        logger.debug(`Executing command: ${command.id}`, { args });
                        await command.handler(context, ...args);
                    } catch (error) {
                        logger.error(`Error executing command ${command.id}`, error);
                        vscode.window.showErrorMessage(
                            `Error in command ${command.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
                        );
                    }
                }
            );
            context.subscriptions.push(disposable);
        });
    }

    public getCommand(id: string): CommandDefinition | undefined {
        return this.commands.get(id);
    }

    public createCommand(
        id: string, 
        handler: (context: vscode.ExtensionContext, ...args: any[]) => Promise<void> | void
    ): CommandDefinition {
        const command: CommandDefinition = { id, handler };
        this.register(command);
        return command;
    }

    public reset(): void {
        this.commands.clear();
    }
}
