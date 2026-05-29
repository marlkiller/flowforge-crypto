export function renderErrorPage(error?: Error): string {
  const errorMsg = error?.message || "Unknown error";
  const errorStack = error?.stack || "No stack trace available";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Application Error</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        font-family: system-ui, -apple-system, sans-serif;
        background: #1a1a1a;
        color: #e5e5e5;
        margin: 0;
        padding: 2rem;
        line-height: 1.6;
      }
      .container { max-width: 900px; margin: 0 auto; }
      h1 {
        color: #ef4444;
        font-size: 1.75rem;
        margin: 0 0 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .error-box {
        background: #2a2a2a;
        border: 1px solid #3f3f3f;
        border-left: 4px solid #ef4444;
        padding: 1.5rem;
        margin: 1.5rem 0;
        border-radius: 0.5rem;
      }
      .error-message {
        color: #ef4444;
        font-weight: 600;
        font-size: 1.1rem;
        word-break: break-all;
      }
      .stack-box {
        background: #0a0a0a;
        border: 1px solid #3f3f3f;
        padding: 1.5rem;
        margin: 1.5rem 0;
        border-radius: 0.5rem;
        max-height: 400px;
        overflow: auto;
      }
      .stack-title {
        color: #a1a1aa;
        font-size: 0.875rem;
        font-weight: 600;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      pre {
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 0.75rem;
        color: #d4d4d4;
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .actions {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 2rem;
      }
      button, a {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font: inherit;
        cursor: pointer;
        text-decoration: none;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-error {
        background: #ef4444;
        color: white;
      }
      .btn-error:hover { background: #dc2626; }
      .btn-secondary {
        background: #2a2a2a;
        color: #e5e5e5;
        border: 1px solid #3f3f3f;
      }
      .btn-secondary:hover { background: #3f3f3f; }
      .env-info {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #3f3f3f;
        color: #717171;
        font-size: 0.75rem;
      }
      .icon { width: 24px; height: 24px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Application Error
      </h1>

      <div class="error-box">
        <div class="error-message">${errorMsg}</div>
      </div>

      ${
        errorStack && errorStack !== "No stack trace available"
          ? `
      <div class="stack-box">
        <div class="stack-title">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-4m0 0l4 4m-4-4v12" />
          </svg>
          Stack Trace
        </div>
        <pre>${errorStack}</pre>
      </div>
      `
          : ""
      }

      <div class="actions">
        <button class="btn-error" onclick="location.reload()">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reload Page
        </button>
        <a class="btn-secondary" href="/">
          <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3m-6 0l2 2" />
          </svg>
          Go Home
        </a>
      </div>

      <div class="env-info">
        <div>Timestamp: ${new Date().toISOString()}</div>
        <div>Environment: ${import.meta.env.MODE || "development"}</div>
        <div style="margin-top: 0.5rem; color: #525252;">If this error persists, please report it with the stack trace above.</div>
      </div>
    </div>
  </body>
</html>`;
}
