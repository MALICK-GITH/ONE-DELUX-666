const { logVisitor: dbLogVisitor, getVisitorStats: dbGetVisitorStats, clearOldLogs: dbClearOldLogs } = require('./database');

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

async function logVisitor(req, res, next) {
  const ip = getIpAddress(req);
  const userAgent = getUserAgent(req);
  const referer = getReferer(req);
  const timestamp = new Date().toISOString();
  
  const visitorData = {
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
  
  // Log to PostgreSQL database
  try {
    await dbLogVisitor(visitorData);
  } catch (error) {
    console.error('Error logging visitor to database:', error);
  }
  
  next();
}

// Export function to get visitor statistics (now async)
async function getVisitorStats() {
  try {
    return await dbGetVisitorStats();
  } catch (error) {
    console.error('Error reading visitor stats:', error);
    return { total: 0, uniqueIps: 0, recent: [] };
  }
}

// Export function to clear old logs (now async)
async function clearOldLogs(daysToKeep = 30) {
  try {
    return await dbClearOldLogs(daysToKeep);
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
