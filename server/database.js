const { Pool } = require('pg');
const config = require('./config');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.sslVerify ? { rejectUnauthorized: true } : { rejectUnauthorized: false }
});

// Test connection
pool.on('connect', () => {
  console.log('✅ PostgreSQL connecté');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err);
});

// Initialize schema
async function initializeSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip VARCHAR(45) NOT NULL,
        user_agent TEXT,
        referer TEXT,
        method VARCHAR(10) NOT NULL,
        path TEXT NOT NULL,
        protocol VARCHAR(10),
        host TEXT
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_timestamp ON visitors(timestamp DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_ip ON visitors(ip)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_visitors_path ON visitors(path)
    `);

    console.log('✅ Schema PostgreSQL initialisé');
  } catch (error) {
    console.error('❌ Erreur initialisation schema:', error);
  }
}

// Log visitor to database
async function logVisitor(visitorData) {
  try {
    const query = `
      INSERT INTO visitors (ip, user_agent, referer, method, path, protocol, host)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    
    const values = [
      visitorData.ip,
      visitorData.userAgent,
      visitorData.referer,
      visitorData.method,
      visitorData.path,
      visitorData.protocol,
      visitorData.host
    ];

    await pool.query(query, values);
  } catch (error) {
    console.error('❌ Erreur logging visiteur:', error);
  }
}

// Get visitor statistics
async function getVisitorStats() {
  try {
    const totalResult = await pool.query('SELECT COUNT(*) as count FROM visitors');
    const total = parseInt(totalResult.rows[0].count);

    const uniqueIpsResult = await pool.query('SELECT COUNT(DISTINCT ip) as count FROM visitors');
    const uniqueIps = parseInt(uniqueIpsResult.rows[0].count);

    const recentResult = await pool.query(`
      SELECT * FROM visitors 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    const recent = recentResult.rows;

    return {
      total,
      uniqueIps,
      recent
    };
  } catch (error) {
    console.error('❌ Erreur récupération stats:', error);
    return { total: 0, uniqueIps: 0, recent: [] };
  }
}

// Clear old logs
async function clearOldLogs(daysToKeep = 30) {
  try {
    const result = await pool.query(`
      DELETE FROM visitors 
      WHERE timestamp < NOW() - INTERVAL '${daysToKeep} days'
    `);
    
    return { deleted: result.rowCount };
  } catch (error) {
    console.error('❌ Erreur nettoyage logs:', error);
    return { deleted: 0 };
  }
}

// Close pool (for graceful shutdown)
async function closePool() {
  await pool.end();
  console.log('✅ Pool PostgreSQL fermé');
}

module.exports = {
  pool,
  initializeSchema,
  logVisitor,
  getVisitorStats,
  clearOldLogs,
  closePool
};
