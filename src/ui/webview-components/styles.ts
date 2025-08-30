export function getWebviewStyles(): string {
  return `
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
            .sample-collection-btn {
                background-color: var(--button-bg);
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: background-color 0.2s ease;
            }
            .sample-collection-btn:hover {
                background-color: var(--button-hover-bg);
            }
            .collection-actions {
                display: flex;
                gap: 10px;
                margin-top: 15px;
            }
            .collection-dropdown {
                flex-grow: 1;
                padding: 10px;
                border: 1px solid var(--input-border);
                background-color: var(--input-bg);
                color: var(--text-color);
                border-radius: 4px;
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M1 4l5 5 5-5' fill='none' stroke='%23888' stroke-width='1.5'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 8px center;
                cursor: pointer;
            }
            .collection-btn {
                background-color: var(--button-bg);
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: background-color 0.2s ease;
            }
            .collection-btn:hover {
                background-color: var(--button-hover-bg);
            }
            .summary {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  background: #eee;
}
.badge.status { background: #d4edda; color: #155724; }
.badge.time   { background: #cce5ff; color: #004085; }
.badge.size   { background: #fff3cd; color: #856404; }

.tabs {
  display: flex;
  gap: 5px;
  border-bottom: 1px solid #ccc;
  margin-bottom: 10px;
}
.tabs button {
  padding: 6px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
}
.tabs button.active {
  border-bottom: 2px solid #007acc;
  font-weight: bold;
}
.tab-content { display: none; }
.tab-content.active { display: block; }

.response-block {
  background: #1e1e1e;
  color: #dcdcdc;
  padding: 10px;
  border-radius: 6px;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
}
    `;
}
