import * as path from 'path';
import * as vscode from 'vscode';
import { getWebviewStyles } from './webview-components/styles';
import { getRequestFormHTML } from './webview-components/request-form';
import { getWebviewScripts } from './webview-components/scripts';
import { getResponseView } from './webview-components/response-view';

export function getWebviewContent(context: vscode.ExtensionContext) {
    // Paths for icons and resources
    const iconPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'requestary-tab-icon.svg'));
    const addDarkIcon = vscode.Uri.file(path.join(context.extensionPath, 'media', 'add-dark.svg'));
    const addLightIcon = vscode.Uri.file(path.join(context.extensionPath, 'media', 'add-light.svg'));

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Requestary</title>
        <link rel="icon" type="image/svg+xml" href="${iconPath.toString()}">
        <style>${getWebviewStyles()}</style>
    </head>
    <body>
        ${getRequestFormHTML()}
        ${getResponseView()}    
        ${getWebviewScripts()}    
    </body>
    </html>
    `;
}
