export function getWebviewScripts(): string {
    return `
        <script>
            const vscode = acquireVsCodeApi();

            // ---------------- TAB SWITCHING ----------------
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab')) {
                    const tab = e.target;
                    const targetId = tab.dataset.tab;

                    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                    tab.classList.add('active');
                    document.getElementById(targetId).classList.add('active');
                }
            });

            // ---------------- RESPONSE RENDERER ----------------
            function renderResponse(data) {
                const container = document.getElementById("response-container");
                if (container) container.style.display = "block";

                // Summary badges
                document.querySelector("#response-summary .status").textContent = \`Status: \${data.status}\`;
                document.querySelector("#response-summary .time").textContent = \`Time: \${data.time} ms\`;
                document.querySelector("#response-summary .size").textContent = \`Size: \${(data.size / 1024).toFixed(2)} KB\`;

                // Body
                document.getElementById("response-body").textContent =
                    typeof data.body === "object" ? JSON.stringify(data.body, null, 2) : data.body;

                // Headers
                document.getElementById("response-headers").textContent = JSON.stringify(data.headers, null, 2);

                // Cookies
                document.getElementById("response-cookies").textContent = data.headers["set-cookie"] || "No cookies";

                // Raw
                document.getElementById("response-raw").textContent = JSON.stringify(data, null, 2);
            }

            // ---------------- DYNAMIC ROWS ----------------
            function setupDynamicRows(containerId, keyClass, valueClass, typeClass = null) {
                const container = document.getElementById(containerId);
                function addDynamicRow() {
                    const row = document.createElement('div');
                    row.classList.add('dynamic-row');
                    
                    const keyInput = document.createElement('input');
                    keyInput.type = 'text';
                    keyInput.placeholder = 'Key';
                    keyInput.classList.add(keyClass);

                    const valueInput = document.createElement('input');
                    valueInput.type = 'text';
                    valueInput.placeholder = 'Value';
                    valueInput.classList.add(valueClass);

                    let typeSelect = null;
                    if (typeClass) {
                        typeSelect = document.createElement('select');
                        typeSelect.classList.add(typeClass);
                        ['text','file'].forEach(opt => {
                            const o = document.createElement('option');
                            o.value = opt;
                            o.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                            typeSelect.appendChild(o);
                        });
                        row.classList.add('with-type');
                    }

                    const removeButton = document.createElement('button');
                    removeButton.type = 'button';
                    removeButton.classList.add('remove-btn');
                    removeButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
                    removeButton.addEventListener('click', () => row.remove());

                    row.appendChild(keyInput);
                    row.appendChild(valueInput);
                    if (typeSelect) row.appendChild(typeSelect);
                    row.appendChild(removeButton);
                    container.appendChild(row);

                    keyInput.addEventListener('input', function() {
                        if (this.value && container.lastElementChild === row) {
                            addDynamicRow();
                        }
                    });

                    const rows = container.querySelectorAll('.dynamic-row');
                    rows.forEach((r, index) => {
                        const btn = r.querySelector('.remove-btn');
                        btn.style.display = rows.length > 1 && index > 0 ? 'flex' : 'none';
                    });
                }
                addDynamicRow();
            }

            setupDynamicRows('paramsContainer', 'param-key', 'param-value');
            setupDynamicRows('headersContainer', 'header-key', 'header-value');
            setupDynamicRows('formDataContainer', 'form-data-key', 'form-data-value', 'form-data-type');

            // ---------------- BODY TYPE HANDLING ----------------
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
                    bodyTypeButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');
                    Object.values(bodyContents).forEach(c => { if (c) c.style.display = 'none'; });
                    const selectedType = button.dataset.type;
                    if (bodyContents[selectedType]) bodyContents[selectedType].style.display = 'block';
                });
            });

            // ---------------- AUTH HANDLING ----------------
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

            // ---------------- SEND REQUEST ----------------
            function sendRequest() {
                const method = document.getElementById('method').value;
                const url = document.getElementById('url').value;

                const params = {};
                document.querySelectorAll('#paramsContainer .dynamic-row').forEach(row => {
                    const key = row.querySelector('.param-key').value.trim();
                    const value = row.querySelector('.param-value').value.trim();
                    if (key && value) params[key] = value;
                });

                const headers = {};
                document.querySelectorAll('#headersContainer .dynamic-row').forEach(row => {
                    const key = row.querySelector('.header-key').value.trim();
                    const value = row.querySelector('.header-value').value.trim();
                    if (key && value) headers[key] = value;
                });

                let body = null;
                const activeBodyType = document.querySelector('.body-type-selector button.active').dataset.type;
                switch (activeBodyType) {
                    case 'json': body = document.getElementById('jsonBody').value; break;
                    case 'xml': body = document.getElementById('xmlBody').value; break;
                    case 'text': body = document.getElementById('textBody').value; break;
                    case 'form-data':
                    case 'x-www-form-urlencoded':
                        body = {};
                        document.querySelectorAll('#formDataContainer .dynamic-row').forEach(row => {
                            const key = row.querySelector('.form-data-key').value.trim();
                            const type = row.querySelector('.form-data-type').value;
                            const value = row.querySelector('.form-data-value').value.trim();
                            if (key && value) body[key] = { type, value };
                        });
                        break;
                }

                const authTypeVal = document.getElementById('authType').value;
                const auth = { type: authTypeVal };
                if (authTypeVal === 'basic') {
                    auth.username = document.getElementById('basicUsername').value;
                    auth.password = document.getElementById('basicPassword').value;
                } else if (authTypeVal === 'bearer') {
                    auth.token = document.getElementById('bearerToken').value;
                } else if (authTypeVal === 'oauth2') {
                    auth.clientId = document.getElementById('oauth2ClientId').value;
                    auth.clientSecret = document.getElementById('oauth2ClientSecret').value;
                    auth.tokenUrl = document.getElementById('oauth2TokenUrl').value;
                }

                vscode.postMessage({
                    command: 'sendRequest',
                    method,
                    url,
                    params: Object.keys(params).length ? params : undefined,
                    headers: Object.keys(headers).length ? headers : undefined,
                    body: body ? JSON.stringify(body) : undefined,
                    auth: authTypeVal !== 'none' ? auth : undefined
                });
            }

            document.getElementById('sendRequest').addEventListener('click', sendRequest);
            document.getElementById('url').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); sendRequest(); }
            });
            ['jsonBody','xmlBody','textBody'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('keydown', (e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); sendRequest(); }
                });
            });

            // ---------------- HANDLE RESPONSES ----------------
            window.addEventListener('message', event => {
                const message = event.data;
                switch (message.command) {
                    case 'requestResponse':
                        renderResponse(message);
                        break;
                    case 'requestError':
                        alert('Error: ' + message.error);
                        break;
                }
            });

            // ---------------- COLLECTION ACTIONS ----------------
            const collectionActionDropdown = document.getElementById('collectionAction');
            const executeCollectionActionBtn = document.getElementById('executeCollectionAction');
            executeCollectionActionBtn.addEventListener('click', () => {
                const selectedAction = collectionActionDropdown.value;
                switch (selectedAction) {
                    case 'download':
                        vscode.postMessage({ command: 'downloadSampleCollection' });
                        break;
                    case 'import':
                        vscode.postMessage({ command: 'importCollection' });
                        break;
                    default:
                        console.log('Please select an action');
                }
                collectionActionDropdown.selectedIndex = 0;
            });
        </script>
    `;
}
