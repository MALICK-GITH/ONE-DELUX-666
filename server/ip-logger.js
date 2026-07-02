const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../logs', 'visitors.json');
const LOG_DIR = path.join(__dirname, '../logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function getIpAddress(req) {
  // Check various headers for IP (behind proxy, load balancer, etc.)
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress;
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Remove IPv6 prefix if present
  if (remoteAddr && remoteAddr.startsWith('::ffff:')) {
    return remoteAddr.substring(7);
  }
  
  return remoteAddr || 'unknown';
}

function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

function getReferer(req) {
  return req.headers['referer'] || req.headers['referrer'] || 'direct';
}

function logVisitor(req, res, next) {
  const ip = getIpAddress(req);
  const userAgent = getUserAgent(req);
  const referer = getReferer(req);
  const timestamp = new Date().toISOString();
  
  const visitorLog = {
    timestamp,
    ip,
    userAgent,
    referer,
    method: req.method,
    path: req.url,
    protocol: req.protocol,
    host: req.headers.host
  };
  
  // Log to console
  console.log(`[${timestamp}] ${ip} - ${req.method} ${req.url} - ${referer}`);
  
  // Log to file
  try {
    let logs = [];
    if (fs.existsSync(LOG_FILE)) {
      const data = fs.readFileSync(LOG_FILE, 'utf8');
      logs = JSON.parse(data);
    }
    
    logs.push(visitorLog);
    
    // Keep only last 10000 entries to prevent file from growing too large
    if (logs.length > 10000) {
      logs = logs.slice(-10000);
    }
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing visitor log:', error);
  }
  
  next();
}

// Export function to get visitor statistics
function getVisitorStats() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return { total: 0, uniqueIps: 0, recent: [] };
    }
    
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const logs = JSON.parse(data);
    
    const uniqueIps = new Set(logs.map(log => log.ip)).size;
    const recent = logs.slice(-10).reverse();
    
    return {
      total: logs.length,
      uniqueIps,
      recent
    };
  } catch (error) {
    console.error('Error reading visitor stats:', error);
    return { total: 0, uniqueIps: 0, recent: [] };
  }
}

// Export function to clear old logs
function clearOldLogs(daysToKeep = 30) {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return { deleted: 0 };
    }
    
    const data = fs.readFileSync(LOG_FILE, 'utf8');
    const logs = JSON.parse(data);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const filteredLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate > cutoffDate;
    });
    
    const deleted = logs.length - filteredLogs.length;
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(filteredLogs, null, 2));
    
    return { deleted };
  } catch (error) {
    console.error('Error clearing old logs:', error);
    return { deleted: 0 };
  }
}

module.exports = {
  logVisitor,
  getVisitorStats,
  clearOldLogs,
  getIpAddress
};
