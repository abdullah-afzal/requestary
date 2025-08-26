import * as vscode from 'vscode';
import axios, { Method, AxiosRequestConfig } from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Request Collection Interface
interface RequestCollection {
    name: string;
    requests: RequestConfig[];
}

// Detailed Request Configuration
interface RequestConfig {
    id: string;
    name: string;
    method: string;
    url: string;
    headers: { [key: string]: string };
    body?: string;
    auth?: {
        type: 'basic' | 'bearer' | 'none';
        username?: string;
        password?: string;
        token?: string;
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
            const importedCollection: RequestCollection = JSON.parse(fileContent);
            
            // Validate collection
            if (!importedCollection.name || !Array.isArray(importedCollection.requests)) {
                throw new Error('Invalid collection format');
            }

            // Add unique IDs if not present
            importedCollection.requests.forEach(req => {
                if (!req.id) {
                    req.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }
            });

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

        panel.webview.html = getWebviewContent();

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

    // Add commands to subscriptions
    context.subscriptions.push(
        disposableCommandRequest, 
        disposableOpenPanel, 
        disposableNewRequest,
        disposableClearRequests,
        disposableImportCollection,
        requestTreeView
    );
}

function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Requestary</title>
        <style>
            :root {
                --bg-color: var(--vscode-editor-background);
                --text-color: var(--vscode-editor-foreground);
                --input-bg: var(--vscode-input-background);
                --input-border: var(--vscode-input-border);
                --button-bg: var(--vscode-button-background);
                --button-hover-bg: var(--vscode-button-hoverBackground);
                --tab-bg: var(--vscode-editorGroup-background);
                --tab-border: var(--vscode-editorGroup-border);
                --dropdown-bg: var(--vscode-dropdown-background);
                --dropdown-border: var(--vscode-dropdown-border);
                --dropdown-fg: var(--vscode-dropdown-foreground);
            }
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                scrollbar-width: thin;
                scrollbar-color: var(--input-border) transparent;
            }
            body {
                font-family: var(--vscode-font-family);
                color: var(--text-color);
                background-color: var(--bg-color);
                line-height: 1.6;
                padding: 15px;
            }
            .request-container {
                max-width: 1200px;
                margin: 0 auto;
            }
            .request-header {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
            }
            .request-header select, 
            .request-header input, 
            .request-header button {
                padding: 8px 12px;
                border: 1px solid var(--input-border);
                background-color: var(--input-bg);
                color: var(--text-color);
                border-radius: 4px;
                transition: all 0.2s ease;
            }
            .request-header select {
                width: 150px;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M1 4l5 5 5-5' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 8px center;
                cursor: pointer;
            }
            .request-header select:hover,
            .request-header select:focus {
                border-color: var(--button-bg);
                outline: none;
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            .request-header input {
                flex-grow: 1;
            }
            .request-header button {
                background-color: var(--button-bg);
                color: white;
                border: none;
                cursor: pointer;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 5px;
                min-width: 100px;
            }
            .request-header button:hover {
                background-color: var(--button-hover-bg);
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .tabs {
                display: flex;
                border-bottom: 1px solid var(--tab-border);
                background-color: var(--tab-bg);
                border-radius: 4px 4px 0 0;
                overflow: hidden;
            }
            .tab {
                padding: 12px 15px;
                cursor: pointer;
                border-right: 1px solid var(--tab-border);
                transition: all 0.2s ease;
                font-weight: 500;
                position: relative;
            }
            .tab:hover {
                background-color: rgba(128,128,128,0.1);
            }
            .tab.active {
                background-color: var(--input-bg);
                font-weight: bold;
            }
            .tab.active::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background-color: var(--button-bg);
            }
            .tab-content {
                display: none;
                padding: 15px;
                background-color: var(--input-bg);
                border: 1px solid var(--input-border);
                border-top: none;
            }
            .tab-content.active {
                display: block;
            }
            .dynamic-section {
                display: grid;
                gap: 10px;
            }
            .dynamic-row {
                display: grid;
                grid-template-columns: 1fr 1fr 100px 50px; /* Adjusted column widths */
                gap: 10px;
                align-items: center;
            }
            .dynamic-row .form-data-type {
                justify-self: end;
            }
            .dynamic-row .remove-btn {
                justify-self: center;
            }
            .dynamic-row input, 
            .dynamic-row select {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--input-border);
                background-color: var(--input-bg);
                color: var(--text-color);
                border-radius: 4px;
                transition: border-color 0.2s ease;
            }
            .dynamic-row .form-data-value {
                grid-column: 1 / span 2; /* Span across first two columns */
            }
            .dynamic-row.with-type .form-data-value {
                grid-column: 1 / span 1; /* Adjust when type is present */
            }
            .remove-btn {
                background-color: transparent;
                color: var(--text-color);
                border: 1px solid transparent;
                padding: 2px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s ease;
                width: 24px;
                height: 24px;
            }
            .remove-btn:hover {
                background-color: rgba(255, 0, 0, 0.1);
                border-color: rgba(255, 0, 0, 0.3);
            }
            .remove-btn:hover svg {
                stroke: red;
            }
            .remove-btn svg {
                stroke: var(--text-color);
                stroke-width: 2;
                width: 16px;
                height: 16px;
            }
            #response {
                margin-top: 15px;
                border: 1px solid var(--input-border);
                padding: 15px;
                white-space: pre-wrap;
                word-wrap: break-word;
                background-color: var(--input-bg);
                max-height: 400px;
                overflow-y: auto;
                border-radius: 4px;
                font-family: monospace;
            }
            .body-type-selector {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                flex-wrap: wrap;
            }
            .body-type-selector button {
                padding: 8px 12px;
                background-color: var(--input-bg);
                border: 1px solid var(--input-border);
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s ease;
                font-weight: 500;
            }
            .body-type-selector button:hover {
                background-color: rgba(128,128,128,0.1);
            }
            .body-type-selector button.active {
                background-color: var(--button-bg);
                color: white;
            }
            textarea {
                width: 100%;
                min-height: 200px;
                max-height: 500px;
                resize: vertical;
                padding: 10px;
                border: 1px solid var(--input-border);
                background-color: var(--input-bg);
                color: var(--text-color);
                border-radius: 4px;
                font-family: monospace;
                line-height: 1.5;
                transition: border-color 0.2s ease;
            }
            textarea:focus {
                outline: none;
                border-color: var(--button-bg);
                box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
            }
            #authDetails {
                display: grid;
                gap: 10px;
                margin-top: 10px;
            }
            #authDetails input {
                width: 100%;
                padding: 8px;
                border: 1px solid var(--input-border);
                background-color: var(--input-bg);
                color: var(--text-color);
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class="request-container">
            <div class="request-header">
                <select id="method">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                    <option value="HEAD">HEAD</option>
                    <option value="OPTIONS">OPTIONS</option>
                </select>
                <input type="url" id="url" placeholder="Enter URL" required>
                <button id="sendRequest">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    Send
                </button>
            </div>

            <div class="tabs">
                <div class="tab active" data-tab="params">Params</div>
                <div class="tab" data-tab="headers">Headers</div>
                <div class="tab" data-tab="auth">Auth</div>
                <div class="tab" data-tab="body">Body</div>
                <div class="tab" data-tab="tests">Tests</div>
                <div class="tab" data-tab="pre-request">Pre-Request</div>
            </div>

            <div id="params" class="tab-content active">
                <div class="dynamic-section" id="paramsContainer">
                    <div class="dynamic-row">
                        <input type="text" placeholder="Key" class="param-key">
                        <input type="text" placeholder="Value" class="param-value">
                        <button type="button" class="remove-btn" style="display:none;">✕</button>
                    </div>
                </div>
            </div>

            <div id="headers" class="tab-content">
                <div class="dynamic-section" id="headersContainer">
                    <div class="dynamic-row">
                        <input type="text" placeholder="Key" class="header-key">
                        <input type="text" placeholder="Value" class="header-value">
                        <button type="button" class="remove-btn" style="display:none;">✕</button>
                    </div>
                </div>
            </div>

            <div id="auth" class="tab-content">
                <select id="authType">
                    <option value="none">No Authentication</option>
                    <option value="basic">Basic Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="oauth2">OAuth 2.0</option>
                </select>
                <div id="authDetails" style="display:none;">
                    <div id="basicAuthDetails" style="display:none;">
                        <input type="text" id="basicUsername" placeholder="Username">
                        <input type="password" id="basicPassword" placeholder="Password">
                    </div>
                    <div id="bearerAuthDetails" style="display:none;">
                        <input type="text" id="bearerToken" placeholder="Bearer Token">
                    </div>
                    <div id="oauth2Details" style="display:none;">
                        <input type="text" id="oauth2ClientId" placeholder="Client ID">
                        <input type="text" id="oauth2ClientSecret" placeholder="Client Secret">
                        <input type="text" id="oauth2TokenUrl" placeholder="Token URL">
                    </div>
                </div>
            </div>

            <div id="body" class="tab-content">
                <div class="body-type-selector">
                    <button class="active" data-type="none">None</button>
                    <button data-type="form-data">Form Data</button>
                    <button data-type="x-www-form-urlencoded">x-www-form-urlencoded</button>
                    <button data-type="json">JSON</button>
                    <button data-type="xml">XML</button>
                    <button data-type="text">Text</button>
                    <button data-type="binary">Binary</button>
                </div>
                <div id="bodyContent">
                    <textarea id="jsonBody" rows="5" placeholder="JSON Body" style="display:none;"></textarea>
                    <textarea id="xmlBody" rows="5" placeholder="XML Body" style="display:none;"></textarea>
                    <textarea id="textBody" rows="5" placeholder="Text Body" style="display:none;"></textarea>
                    <div id="formDataBody" style="display:none;">
                        <div class="dynamic-section" id="formDataContainer">
                            <div class="dynamic-row">
                                <input type="text" placeholder="Key" class="form-data-key">
                                <select class="form-data-type">
                                    <option value="text">Text</option>
                                    <option value="file">File</option>
                                </select>
                                <input type="text" placeholder="Value" class="form-data-value">
                                <button type="button" class="remove-btn" style="display:none;">✕</button>
                            </div>
                        </div>
                    </div>
                    <input type="file" id="binaryBody" style="display:none;">
                </div>
            </div>

            <div id="tests" class="tab-content">
                <textarea rows="5" placeholder="Write test scripts using JavaScript"></textarea>
            </div>

            <div id="pre-request" class="tab-content">
                <textarea rows="5" placeholder="Write pre-request scripts using JavaScript"></textarea>
            </div>

            <div id="response"></div>
        </div>

        <script>
            const vscode = acquireVsCodeApi();
            // Tab switching logic
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs and tab contents
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(tc => tc.classList.remove('active'));
                    
                    // Add active class to clicked tab and corresponding tab content
                    tab.classList.add('active');
                    document.getElementById(tab.dataset.tab).classList.add('active');
                });
            });

            // Dynamic row generation for params, headers, form data
            function setupDynamicRows(containerId, keyClass, valueClass, typeClass = null) {
                const container = document.getElementById(containerId);
                
                function addDynamicRow() {
                    const row = document.createElement('div');
                    row.classList.add('dynamic-row');
                    
                    // Key input
                    const keyInput = document.createElement('input');
                    keyInput.type = 'text';
                    keyInput.placeholder = 'Key';
                    keyInput.classList.add(keyClass);

                    // Value input
                    const valueInput = document.createElement('input');
                    valueInput.type = 'text';
                    valueInput.placeholder = 'Value';
                    valueInput.classList.add(valueClass);

                    // Optional type selector
                    let typeSelect = null;
                    if (typeClass) {
                        typeSelect = document.createElement('select');
                        typeSelect.classList.add(typeClass);
                        
                        const textOption = document.createElement('option');
                        textOption.value = 'text';
                        textOption.textContent = 'Text';
                        
                        const fileOption = document.createElement('option');
                        fileOption.value = 'file';
                        fileOption.textContent = 'File';
                        
                        typeSelect.appendChild(textOption);
                        typeSelect.appendChild(fileOption);
                        
                        // Add class to row when type is present
                        row.classList.add('with-type');
                    }

                    // Remove button
                    const removeButton = document.createElement('button');
                    removeButton.type = 'button';
                    removeButton.classList.add('remove-btn');
                    
                    // Create SVG for remove button
                    const removeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                    removeSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    removeSvg.setAttribute('width', '16');
                    removeSvg.setAttribute('height', '16');
                    removeSvg.setAttribute('viewBox', '0 0 24 24');
                    removeSvg.setAttribute('fill', 'none');
                    removeSvg.setAttribute('stroke', 'currentColor');
                    removeSvg.setAttribute('stroke-width', '2');
                    removeSvg.setAttribute('stroke-linecap', 'round');
                    removeSvg.setAttribute('stroke-linejoin', 'round');

                    const line1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line1.setAttribute('x1', '18');
                    line1.setAttribute('y1', '6');
                    line1.setAttribute('x2', '6');
                    line1.setAttribute('y2', '18');

                    const line2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line2.setAttribute('x1', '6');
                    line2.setAttribute('y1', '6');
                    line2.setAttribute('x2', '18');
                    line2.setAttribute('y2', '18');

                    removeSvg.appendChild(line1);
                    removeSvg.appendChild(line2);
                    removeButton.appendChild(removeSvg);

                    removeButton.addEventListener('click', () => row.remove());

                    // Append elements to row
                    row.appendChild(keyInput);
                    row.appendChild(valueInput);
                    
                    // Add type select if exists
                    if (typeSelect) {
                        row.appendChild(typeSelect);
                    }
                    
                    row.appendChild(removeButton);

                    container.appendChild(row);

                    // Dynamic row generation
                    keyInput.addEventListener('input', function() {
                        if (this.value && container.lastElementChild === row) {
                            addDynamicRow();
                        }
                    });

                    // Show/hide remove buttons
                    const rows = container.querySelectorAll('.dynamic-row');
                    rows.forEach((r, index) => {
                        const btn = r.querySelector('.remove-btn');
                        btn.style.display = rows.length > 1 && index > 0 ? 'flex' : 'none';
                    });
                }

                // Initial row
                addDynamicRow();
            }

            // Setup dynamic rows
            setupDynamicRows('paramsContainer', 'param-key', 'param-value');
            setupDynamicRows('headersContainer', 'header-key', 'header-value');
            setupDynamicRows('formDataContainer', 'form-data-key', 'form-data-value', 'form-data-type');

            // Body type selector
            const bodyTypeButtons = document.querySelectorAll('.body-type-selector button');
            const bodyContents = {
                'none': null,
                'json': document.getElementById('jsonBody'),
                'xml': document.getElementById('xmlBody'),
                'text': document.getElementById('textBody'),
                'form-data': document.getElementById('formDataBody'),
                'x-www-form-urlencoded': document.getElementById('formDataBody'),
                'binary': document.getElementById('binaryBody')
            };

            bodyTypeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    // Remove active from all buttons
                    bodyTypeButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    // Hide all body contents
                    Object.values(bodyContents).forEach(content => {
                        if (content) content.style.display = 'none';
                    });

                    // Show selected body content
                    const selectedType = button.dataset.type;
                    if (bodyContents[selectedType]) {
                        bodyContents[selectedType].style.display = 'block';
                    }
                });
            });

            // Authentication type handling
            const authType = document.getElementById('authType');
            const authDetails = document.getElementById('authDetails');
            const basicAuthDetails = document.getElementById('basicAuthDetails');
            const bearerAuthDetails = document.getElementById('bearerAuthDetails');
            const oauth2Details = document.getElementById('oauth2Details');

            authType.addEventListener('change', () => {
                authDetails.style.display = authType.value !== 'none' ? 'block' : 'none';
                basicAuthDetails.style.display = authType.value === 'basic' ? 'block' : 'none';
                bearerAuthDetails.style.display = authType.value === 'bearer' ? 'block' : 'none';
                oauth2Details.style.display = authType.value === 'oauth2' ? 'block' : 'none';
            });

            // Send request
            const sendButton = document.getElementById('sendRequest');

            // Function to send request
            function sendRequest() {
                // Collect request details
                const method = document.getElementById('method').value;
                const url = document.getElementById('url').value;

                // Collect params
                const paramRows = document.querySelectorAll('#paramsContainer .dynamic-row');
                const params = {};
                paramRows.forEach(row => {
                    const key = row.querySelector('.param-key').value.trim();
                    const value = row.querySelector('.param-value').value.trim();
                    if (key && value) {
                        params[key] = value;
                    }
                });

                // Collect headers
                const headerRows = document.querySelectorAll('#headersContainer .dynamic-row');
                const headers = {};
                headerRows.forEach(row => {
                    const key = row.querySelector('.header-key').value.trim();
                    const value = row.querySelector('.header-value').value.trim();
                    if (key && value) {
                        headers[key] = value;
                    }
                });

                // Collect body
                let body = null;
                const activeBodyType = document.querySelector('.body-type-selector button.active').dataset.type;
                switch (activeBodyType) {
                    case 'json':
                        body = document.getElementById('jsonBody').value;
                        break;
                    case 'xml':
                        body = document.getElementById('xmlBody').value;
                        break;
                    case 'text':
                        body = document.getElementById('textBody').value;
                        break;
                    case 'form-data':
                    case 'x-www-form-urlencoded':
                        const formDataRows = document.querySelectorAll('#formDataContainer .dynamic-row');
                        body = {};
                        formDataRows.forEach(row => {
                            const key = row.querySelector('.form-data-key').value.trim();
                            const type = row.querySelector('.form-data-type').value;
                            const value = row.querySelector('.form-data-value').value.trim();
                            if (key && value) {
                                body[key] = { type, value };
                            }
                        });
                        break;
                }

                // Collect authentication
                const authType = document.getElementById('authType').value;
                const auth = { type: authType };
                if (authType === 'basic') {
                    auth.username = document.getElementById('basicUsername').value;
                    auth.password = document.getElementById('basicPassword').value;
                } else if (authType === 'bearer') {
                    auth.token = document.getElementById('bearerToken').value;
                } else if (authType === 'oauth2') {
                    auth.clientId = document.getElementById('oauth2ClientId').value;
                    auth.clientSecret = document.getElementById('oauth2ClientSecret').value;
                    auth.tokenUrl = document.getElementById('oauth2TokenUrl').value;
                }

                // Send request to VS Code extension
                vscode.postMessage({
                    command: 'sendRequest',
                    method: method,
                    url: url,
                    params: Object.keys(params).length ? params : undefined,
                    headers: Object.keys(headers).length ? headers : undefined,
                    body: body ? JSON.stringify(body) : undefined,
                    auth: authType !== 'none' ? auth : undefined
                });
            }

            // Send button click event
            sendButton.addEventListener('click', sendRequest);

            // Enter key event listeners
            const urlInput = document.getElementById('url');
            urlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendRequest();
                }
            });

            // Add enter key listeners to body inputs
            const bodyInputs = [
                document.getElementById('jsonBody'),
                document.getElementById('xmlBody'),
                document.getElementById('textBody')
            ];

            bodyInputs.forEach(input => {
                if (input) {
                    input.addEventListener('keydown', (e) => {
                        // Check for Cmd/Ctrl + Enter
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault();
                            sendRequest();
                        }
                    });
                }
            });

            // Handle response from VS Code extension
            window.addEventListener('message', event => {
                const message = event.data;
                const responseDiv = document.getElementById('response');
                
                switch (message.command) {
                    case 'requestResponse':
                        responseDiv.textContent = JSON.stringify({
                            status: message.status,
                            headers: message.headers,
                            body: message.body
                        }, null, 2);
                        break;
                    case 'requestError':
                        responseDiv.textContent = 'Error: ' + message.error;
                        break;
                }
            });
        </script>
    </body>
    </html>
    `;
}

export function deactivate() {
    // Cleanup logic if needed
}
