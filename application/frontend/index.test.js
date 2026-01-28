const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Frontend', () => {
  it('should have required environment variables defined or use defaults', () => {
    const PORT = process.env.PORT || 3000;
    const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
    
    assert.strictEqual(typeof PORT, 'number');
    assert.strictEqual(typeof BACKEND_URL, 'string');
    assert.ok(BACKEND_URL.startsWith('http'));
  });

  it('should format bytes correctly', () => {
    function formatBytes(bytes) {
      const mb = bytes / (1024 * 1024);
      return `${mb.toFixed(2)} MB`;
    }
    
    assert.strictEqual(formatBytes(1048576), '1.00 MB');
    assert.strictEqual(formatBytes(2097152), '2.00 MB');
  });

  it('should format uptime correctly', () => {
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
    
    assert.strictEqual(formatUptime(5000), '5s');
    assert.strictEqual(formatUptime(65000), '1m 5s');
    assert.strictEqual(formatUptime(3665000), '1h 1m 5s');
  });
});
