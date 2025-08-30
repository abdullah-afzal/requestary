import * as vscode from 'vscode';
import axios, { Method, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getWebviewContent } from './ui/webview-content';

// Request Collection Interface
export interface RequestCollection {
    name: string;
    requests: RequestConfig[];
}

// Detailed Request Configuration
export interface RequestConfig {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: { [key: string]: string };
    body?: string;
    auth?: {
        type: 'basic' | 'bearer' | 'oauth2' | 'none';
        username?: string;
        password?: string;
        token?: string;
        clientId?: string;
        clientSecret?: string;
        tokenUrl?: string;
    };
    params?: { [key: string]: string };
}

// Request Item for TreeView
class RequestItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly method: string,
        public readonly url: string,
        public readonly config: RequestConfig,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None
    ) {
        super(label, collapsibleState);
        this.tooltip = `${method} ${url}`;
        this.description = url;
        this.contextValue = 'requestItem';
    }
}

// Request Provider for TreeView
class RequestProvider implements vscode.TreeDataProvider<RequestItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<RequestItem | undefined | null | void> = new vscode.EventEmitter<RequestItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<RequestItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private requests: RequestItem[] = [];
    private collections: RequestCollection[] = [];

    constructor(private context: vscode.ExtensionContext) {
        // Load saved collections
        this.loadCollections();
    }

    getTreeItem(element: RequestItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: RequestItem): Thenable<RequestItem[]> {
        // If no element, return all requests and collections
        if (!element) {
            // Create collection items
            const collectionItems = this.collections.map(collection => 
                new RequestItem(
                    collection.name, 
                    'COLLECTION', 
                    `${collection.requests.length} requests`, 
                    { 
                        id: collection.name, 
                        name: collection.name, 
                        method: 'GET', 
                        url: '', 
                        headers: {} 
                    },
                    vscode.TreeItemCollapsibleState.Expanded
                )
            );

            // Add individual requests
            return Promise.resolve([...collectionItems, ...this.requests]);
        }

        // If the element is a collection, return its requests
        const collection = this.collections.find(c => c.name === element.label);
        if (collection) {
            return Promise.resolve(
                collection.requests.map(req => 
                    new RequestItem(
                        req.name, 
                        req.method, 
                        req.url, 
                        req
                    )
                )
            );
        }

        // Default: return empty array
        return Promise.resolve([]);
    }

    addRequest(config: RequestConfig) {
        const newRequest = new RequestItem(
            config.name || `${config.method} Request`, 
            config.method, 
            config.url, 
            config
        );
        this.requests.push(newRequest);
        this._onDidChangeTreeData.fire();
        return newRequest;
    }

    addCollection(collection: RequestCollection) {
        this.collections.push(collection);
        this.saveCollections();
        this._onDidChangeTreeData.fire();
    }

    clearRequests() {
        this.requests = [];
        this._onDidChangeTreeData.fire();
    }

    private loadCollections() {
        const storedCollections = this.context.globalState.get<RequestCollection[]>('requestaryCollections', []);
        this.collections = storedCollections;
    }

    private saveCollections() {
        this.context.globalState.update('requestaryCollections', this.collections);
    }

    importCollection(filePath: string) {
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const thunderCollection: {
                collectionName?: string;
                requests: Array<{
                    _id?: string;
                    name: string;
                    method: string;
                    url: string;
                    headers?: Array<{
                        name: string;
                        value: string;
                        isDisabled?: boolean;
                    }> | { [key: string]: string };
                    params?: Array<{
                        name: string;
                        value: string;
                    }> | { [key: string]: string };
                    body?: {
                        type?: string;
                        raw?: string;
                        form?: any[];
                    };
                    auth?: {
                        type: string;
                        bearer?: string;
                    };
                }>;
            } = JSON.parse(fileContent);
            
            // Convert Thunder Client collection to Requestary collection format
            const importedCollection: RequestCollection = {
                name: thunderCollection.collectionName || 'Imported Collection',
                requests: thunderCollection.requests.map((req) => {
                    // Convert headers from different possible formats
                    const headers: { [key: string]: string } = {};
                    
                    // Handle array of headers
                    if (Array.isArray(req.headers)) {
                        req.headers
                            .filter((header: any) => !header.isDisabled)
                            .forEach((header: any) => {
                                headers[header.name] = header.value.replace(/\{|\}/g, ''); // Remove curly braces
                            });
                    } 
                    // Handle object of headers
                    else if (typeof req.headers === 'object') {
                        Object.entries(req.headers).forEach(([key, value]) => {
                            headers[key] = String(value).replace(/\{|\}/g, '');
                        });
                    }

                    // Handle body conversion
                    let body = undefined;
                    if (req.body && req.body.raw) {
                        body = req.body.raw;
                    }

                    return {
                        id: req._id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: req.name,
                        method: req.method,
                        url: req.url,
                        headers: headers,
                        body: body,
                        auth: req.auth ? {
                            type: req.auth.type === 'bearer' ? 'bearer' : 'none',
                            token: req.auth.type === 'bearer' ? req.auth.bearer : undefined
                        } : { type: 'none' }
                    };
                })
            };

            this.addCollection(importedCollection);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to import collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}

async function sendRequest(outputChannel: vscode.OutputChannel, requestProvider?: RequestProvider) {
    // Prompt for request details
    const method = await vscode.window.showQuickPick([
        'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
    ], { placeHolder: 'Select HTTP Method' });

    if (!method) {
        return; // User cancelled
    }
    const url = await vscode.window.showInputBox({
        prompt: 'Enter the URL',
        placeHolder: 'https://api.example.com/endpoint'
    });

    if (!url) {
        return; // User cancelled
    }

    try {
        // Prepare request configuration
        const requestConfig: AxiosRequestConfig = {
            method: method.toLowerCase() as Method,
            url: url,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Optional: Add request body for POST, PUT, PATCH
        if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
            const body = await vscode.window.showInputBox({
                prompt: 'Enter request body (JSON)',
                placeHolder: '{"key": "value"}'
            });
            if (body) {
                try {
                    requestConfig.data = JSON.parse(body);
                } catch (parseError) {
                    vscode.window.showErrorMessage('Invalid JSON body');
                    return;
                }
            }
        }

        // Send the request
        const response = await axios(requestConfig);

        // Add request to tree view if provider is available
        if (requestProvider) {
            requestProvider.addRequest({
                id: `req_${Date.now()}`,
                name: `${method} ${url}`,
                method: method,
                url: url,
                headers: {},
                body: JSON.stringify(requestConfig.data, null, 2)
            });
        }

        // Clear and show output channel
        outputChannel.clear();
        outputChannel.appendLine(`Request: ${method} ${url}`);
        outputChannel.appendLine(`Status: ${response.status} ${response.statusText}`);
        outputChannel.appendLine('Headers:');
        Object.entries(response.headers).forEach(([key, value]) => {
            outputChannel.appendLine(`  ${key}: ${value}`);
        });
        outputChannel.appendLine('\nResponse Body:');
        outputChannel.appendLine(JSON.stringify(response.data, null, 2));
        outputChannel.show();

        // Optional: Show success message
        vscode.window.showInformationMessage('Request sent successfully!');

        return response;
    } catch (error: any) {
        // Handle request errors
        vscode.window.showErrorMessage(`Request failed: ${error.message}`);
        throw error;
    }
}

export function activate(context: vscode.ExtensionContext) {
    // Create output channel for responses
    const outputChannel = vscode.window.createOutputChannel('Requestary');

    // Create Request Provider and TreeView
    const requestProvider = new RequestProvider(context);
    const requestTreeView = vscode.window.createTreeView('requestary.requestView', {
        treeDataProvider: requestProvider,
        canSelectMany: true
    });

    // Register command to send request via command palette
    let disposableCommandRequest = vscode.commands.registerCommand('requestary.sendRequest', async () => {
        await sendRequest(outputChannel, requestProvider);
    });

    // Register command to open request panel
    let disposableOpenPanel = vscode.commands.registerCommand('requestary.openRequestPanel', () => {
        const panel = vscode.window.createWebviewPanel(
            'requestaryPanel',
            'Requestary',
            vscode.ViewColumn.One,
            { 
                enableScripts: true,
                retainContextWhenHidden: true 
            }
        );

        // Set the icon for the panel
        const iconPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'requestary-tab-icon.svg'));
        panel.iconPath = iconPath;

        panel.webview.html = getWebviewContent(context);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendRequest':
                        try {
                            // Prepare request configuration
                            const requestConfig: AxiosRequestConfig = {
                                method: message.method.toLowerCase() as Method,
                                url: message.url,
                                headers: message.headers || {},
                                params: message.params || {}
                            };

                            // Add body if present
                            if (message.body) {
                                try {
                                    requestConfig.data = JSON.parse(message.body);
                                } catch {
                                    requestConfig.data = message.body;
                                }
                            }

                            // Ensure headers exist
                            requestConfig.headers = requestConfig.headers || {};

                            // Add authentication if provided
                            if (message.auth) {
                                switch (message.auth.type) {
                                    case 'basic':
                                        requestConfig.auth = {
                                            username: message.auth.username,
                                            password: message.auth.password
                                        };
                                        break;
                                    case 'bearer':
                                        requestConfig.headers['Authorization'] = `Bearer ${message.auth.token}`;
                                        break;
                                    case 'oauth2':
                                        // Add OAuth 2.0 logic if needed
                                        break;
                                }
                            }

                            // Send the request
                            const response = await axios(requestConfig);

                            // Add request to tree view
                            requestProvider.addRequest({
                                id: `req_${Date.now()}`,
                                name: `${message.method} ${message.url}`,
                                method: message.method,
                                url: message.url,
                                headers: message.headers || {},
                                body: message.body
                            });

                            // Send response back to webview
                            panel.webview.postMessage({
                                command: 'requestResponse',
                                status: response.status,
                                headers: response.headers,
                                body: response.data
                            });

                            // Log to output channel
                            outputChannel.clear();
                            outputChannel.appendLine(`Request: ${message.method} ${message.url}`);
                            outputChannel.appendLine(`Status: ${response.status}`);
                            outputChannel.appendLine('Request Headers:');
                            Object.entries(requestConfig.headers || {}).forEach(([key, value]) => {
                                outputChannel.appendLine(`  ${key}: ${value}`);
                            });
                            outputChannel.appendLine('\nResponse Headers:');
                            Object.entries(response.headers).forEach(([key, value]) => {
                                outputChannel.appendLine(`  ${key}: ${value}`);
                            });
                            outputChannel.appendLine('\nResponse Body:');
                            outputChannel.appendLine(JSON.stringify(response.data, null, 2));
                            outputChannel.show();
                        } catch (error: any) {
                            // Send error back to webview
                            panel.webview.postMessage({
                                command: 'requestError',
                                error: error.message || 'Unknown error occurred'
                            });

                            // Log error to output channel
                            outputChannel.appendLine(`Error: ${error.message}`);
                            outputChannel.show();
                        }
                        break;
                    
                    case 'downloadSampleCollection':
                        try {
                            // Trigger the download sample collection command
                            await vscode.commands.executeCommand('requestary.downloadSampleCollection');
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to download sample collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                        break;
                    
                    case 'importCollection':
                        try {
                            // Trigger the import collection command
                            const fileUris = await vscode.window.showOpenDialog({
                                canSelectMany: false,
                                filters: {
                                    'Collection Files': ['json']
                                },
                                title: 'Select Collection to Import'
                            });

                            if (fileUris && fileUris[0]) {
                                const success = requestProvider.importCollection(fileUris[0].fsPath);
                                if (success) {
                                    vscode.window.showInformationMessage('Collection imported successfully!');
                                }
                            }
                        } catch (error) {
                            vscode.window.showErrorMessage(`Failed to import collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    // Register command to import collection
    let disposableImportCollection = vscode.commands.registerCommand('requestary.importCollection', async () => {
        const fileUris = await vscode.window.showOpenDialog({
            canSelectMany: false,
            filters: {
                'Collection Files': ['json']
            }
        });

        if (fileUris && fileUris[0]) {
            const success = requestProvider.importCollection(fileUris[0].fsPath);
            if (success) {
                vscode.window.showInformationMessage('Collection imported successfully!');
            }
        }
    });

    // Register command to create a new request
    let disposableNewRequest = vscode.commands.registerCommand('requestary.newRequest', async () => {
        // Open the request panel
        await vscode.commands.executeCommand('requestary.openRequestPanel');
    });

    // Register command to clear request history
    let disposableClearRequests = vscode.commands.registerCommand('requestary.clearRequests', () => {
        requestProvider.clearRequests();
    });

    // Register command to download sample collection
    let disposableDownloadSampleCollection = vscode.commands.registerCommand('requestary.downloadSampleCollection', async () => {
        try {
            // Get user's home directory
            const userHomeDir = process.env.HOME || process.env.USERPROFILE || os.homedir();
            const defaultPath = path.join(userHomeDir, 'sample-requestary-collection.json');

            // Prompt user to choose save location with a default in home directory
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultPath),
                filters: {
                    'JSON Files': ['json']
                },
                title: 'Save Requestary Sample Collection'
            });

            if (saveUri) {
                // Read the sample collection from the extension's path
                const sampleCollectionPath = path.join(context.extensionPath, 'sample-collection.json');
                
                try {
                    // Ensure directory exists
                    const saveDir = path.dirname(saveUri.fsPath);
                    fs.mkdirSync(saveDir, { recursive: true });

                    // Copy file with proper permissions
                    fs.copyFileSync(sampleCollectionPath, saveUri.fsPath, fs.constants.COPYFILE_EXCL);

                    // Show success message with file path
                    vscode.window.showInformationMessage(`Sample collection downloaded to: ${saveUri.fsPath}`);
                } catch (writeError) {
                    // More detailed error handling
                    let errorMessage = 'Failed to save the file.';
                    if (writeError instanceof Error) {
                        if (writeError.message.includes('EACCES')) {
                            errorMessage = 'Permission denied. Try selecting a different directory with write access.';
                        } else if (writeError.message.includes('ENOSPC')) {
                            errorMessage = 'No space left on the device.';
                        }
                    }
                    vscode.window.showErrorMessage(errorMessage);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to download sample collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    });

    // Add commands to subscriptions
    context.subscriptions.push(
        disposableCommandRequest, 
        disposableOpenPanel, 
        disposableNewRequest,
        disposableClearRequests,
        disposableImportCollection,
        disposableDownloadSampleCollection,
        requestTreeView
    );
}

export function deactivate() {
    // Cleanup logic if needed
}
