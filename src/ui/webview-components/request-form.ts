export function getRequestFormHTML(): string {
    return `
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
    `;
}