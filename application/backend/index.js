const express = require('express');
const { Pool } = require('pg');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3001;

// PostgreSQL configuration from environment variables
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'app',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  connectionTimeoutMillis: 5000,
});

const startTime = Date.now();

// Get status information
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

// Health check endpoint
app.get('/healthz', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    
    res.json({
      status: 'healthy',
      service: 'backend',
      database: 'connected',
      ...getStatusInfo(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'backend',
      database: 'disconnected',
      error: error.message,
      ...getStatusInfo(),
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'backend',
    message: 'Backend service is running',
    endpoints: ['/healthz'],
  });
});

// Verify PostgreSQL connection on startup
async function verifyDatabaseConnection() {
  console.log('Verifying PostgreSQL connection...');
  console.log(`  Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
  console.log(`  Port: ${process.env.POSTGRES_PORT || 5432}`);
  console.log(`  Database: ${process.env.POSTGRES_DB || 'app'}`);
  console.log(`  User: ${process.env.POSTGRES_USER || 'postgres'}`);

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log(`✓ PostgreSQL connected successfully at ${result.rows[0].now}`);
    client.release();
    return true;
  } catch (error) {
    console.error('✗ Failed to connect to PostgreSQL:', error.message);
    return false;
  }
}

// Start server only if database connection is successful
async function startServer() {
  const dbConnected = await verifyDatabaseConnection();
  
  if (!dbConnected) {
    console.error('Exiting: PostgreSQL connection required');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/healthz`);
  });
}

startServer();
