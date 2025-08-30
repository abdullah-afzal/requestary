export function getResponseView(): string {
    return /* html */ `
      <div id="response-container" style="display:none; margin-top: 20px;">
  
        <!-- Summary badges -->
        <div id="response-summary" class="summary">
          <span class="badge status">Status: -</span>
          <span class="badge time">Time: -</span>
          <span class="badge size">Size: -</span>
        </div>
  
        <!-- Tabs -->
        <div class="tabs">
          <button data-tab="body" class="active">Response</button>
          <button data-tab="headers">Headers</button>
          <button data-tab="cookies">Cookies</button>
          <button data-tab="raw">Raw</button>
        </div>
  
        <!-- Tab Contents -->
        <div class="tab-content active" id="tab-body">
          <pre id="response-body" class="response-block"></pre>
        </div>
        <div class="tab-content" id="tab-headers">
          <pre id="response-headers" class="response-block"></pre>
        </div>
        <div class="tab-content" id="tab-cookies">
          <pre id="response-cookies" class="response-block"></pre>
        </div>
        <div class="tab-content" id="tab-raw">
          <pre id="response-raw" class="response-block"></pre>
        </div>
  
      </div>
    `;
  }
  