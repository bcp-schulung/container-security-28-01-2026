const express = require('express');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const startTime = Date.now();

// Get status information for frontend
function getStatusInfo() {
  const memoryUsage = process.memoryUsage();
  return {
    hostname: os.hostname(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    uptimeFormatted: formatUptime(Date.now() - startTime),
    memoryUsage: {
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      rss: formatBytes(memoryUsage.rss),
    },
    version: process.env.npm_package_version || '1.0.0',
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    arch: os.arch(),
  };
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatBytes(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

// Fetch backend health
async function fetchBackendHealth() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BACKEND_URL}/healthz`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const data = await response.json();
      return { healthy: false, data, error: 'Backend returned unhealthy status' };
    }

    const data = await response.json();
    return { healthy: true, data };
  } catch (error) {
    return { 
      healthy: false, 
      data: null, 
      error: error.name === 'AbortError' ? 'Backend request timeout' : error.message 
    };
  }
}

// Generate HTML page
function generateHTML(frontendStatus, backendResult) {
  const isHealthy = backendResult.healthy;
  const statusColor = isHealthy ? '#10b981' : '#ef4444';
  const statusText = isHealthy ? 'HEALTHY' : 'UNHEALTHY';
  const statusEmoji = isHealthy ? '✓' : '✗';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="10">
  <title>Service Status Dashboard</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      padding: 2rem;
      color: #e0e0e0;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      color: #fff;
      margin-bottom: 0.5rem;
    }
    .overall-status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border-radius: 50px;
      font-size: 1.25rem;
      font-weight: 600;
      background: ${statusColor}22;
      border: 2px solid ${statusColor};
      color: ${statusColor};
    }
    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${statusColor};
      animation: ${isHealthy ? 'pulse' : 'none'} 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1.5rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card-status {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .card-status.healthy {
      background: #10b98122;
      color: #10b981;
    }
    .card-status.unhealthy {
      background: #ef444422;
      color: #ef4444;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }
    .info-item {
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
    }
    .info-label {
      font-size: 0.75rem;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }
    .info-value {
      font-size: 0.95rem;
      color: #fff;
      font-family: 'Monaco', 'Menlo', monospace;
    }
    .error-box {
      background: #ef444422;
      border: 1px solid #ef4444;
      border-radius: 8px;
      padding: 1rem;
      color: #fca5a5;
    }
    .error-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #ef4444;
    }
    footer {
      text-align: center;
      margin-top: 2rem;
      color: #666;
      font-size: 0.875rem;
    }
    .refresh-note {
      margin-top: 0.5rem;
      font-size: 0.75rem;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🖥️ Service Status Dashboard</h1>
      <div class="overall-status">
        <div class="status-indicator"></div>
        ${statusEmoji} System ${statusText}
      </div>
    </header>

    <div class="grid">
      <!-- Frontend Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            🌐 Frontend Service
          </div>
          <span class="card-status healthy">● Online</span>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Hostname</div>
            <div class="info-value">${frontendStatus.hostname}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Uptime</div>
            <div class="info-value">${frontendStatus.uptimeFormatted}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Memory (Heap)</div>
            <div class="info-value">${frontendStatus.memoryUsage.heapUsed}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Memory (RSS)</div>
            <div class="info-value">${frontendStatus.memoryUsage.rss}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Version</div>
            <div class="info-value">${frontendStatus.version}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Node.js</div>
            <div class="info-value">${frontendStatus.nodeVersion}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Platform</div>
            <div class="info-value">${frontendStatus.platform}/${frontendStatus.arch}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Timestamp</div>
            <div class="info-value">${new Date(frontendStatus.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      <!-- Backend Card -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            ⚙️ Backend Service
          </div>
          <span class="card-status ${backendResult.healthy ? 'healthy' : 'unhealthy'}">
            ● ${backendResult.healthy ? 'Online' : 'Offline'}
          </span>
        </div>
        ${backendResult.healthy && backendResult.data ? `
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Hostname</div>
            <div class="info-value">${backendResult.data.hostname}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Uptime</div>
            <div class="info-value">${backendResult.data.uptimeFormatted}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Memory (Heap)</div>
            <div class="info-value">${backendResult.data.memoryUsage.heapUsed}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Memory (RSS)</div>
            <div class="info-value">${backendResult.data.memoryUsage.rss}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Database</div>
            <div class="info-value">${backendResult.data.database}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Node.js</div>
            <div class="info-value">${backendResult.data.nodeVersion}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Platform</div>
            <div class="info-value">${backendResult.data.platform}/${backendResult.data.arch}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Timestamp</div>
            <div class="info-value">${new Date(backendResult.data.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
        ` : `
        <div class="error-box">
          <div class="error-title">Connection Failed</div>
          <div>${backendResult.error || 'Unable to connect to backend service'}</div>
          <div style="margin-top: 0.5rem; font-size: 0.875rem;">
            Backend URL: ${BACKEND_URL}
          </div>
        </div>
        `}
      </div>
    </div>

    <footer>
      <div>Backend URL: ${BACKEND_URL}</div>
      <div class="refresh-note">Page auto-refreshes every 10 seconds</div>
    </footer>
  </div>
</body>
</html>
  `;
}

// Health check endpoint (JSON)
app.get('/healthz', async (req, res) => {
  const frontendStatus = getStatusInfo();
  const backendResult = await fetchBackendHealth();

  const isHealthy = backendResult.healthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    service: 'frontend',
    frontend: frontendStatus,
    backend: backendResult.healthy ? backendResult.data : {
      status: 'unreachable',
      error: backendResult.error,
    },
  });
});

// Main page (HTML Dashboard)
app.get('/', async (req, res) => {
  const frontendStatus = getStatusInfo();
  const backendResult = await fetchBackendHealth();

  res.send(generateHTML(frontendStatus, backendResult));
});

// Start server
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
  console.log(`Backend URL configured: ${BACKEND_URL}`);
  console.log(`Dashboard available at http://localhost:${PORT}`);
  console.log(`Health check available at http://localhost:${PORT}/healthz`);
});
