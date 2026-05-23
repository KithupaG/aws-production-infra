const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

let dbType = 'sqlite';
let pgPool = null;
let sqliteDb = null;

// Determine connection strategy
const usePostgres = process.env.DATABASE_URL || 
                    (process.env.PGHOST && process.env.PGUSER && process.env.PGDATABASE);

async function initialize() {
  if (usePostgres) {
    dbType = 'postgres';
    logger.info('Database configuration: PostgreSQL detected. Connecting...');
    
    const config = process.env.DATABASE_URL 
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.PGHOST,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE,
          port: parseInt(process.env.PGPORT || '5432', 10),
          // Production TLS/SSL settings for AWS RDS
          ssl: process.env.PGSSL === 'true' || process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false } // Set rejectUnauthorized: true if CA cert is provided
            : false
        };

    pgPool = new Pool({
      ...config,
      max: 10, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test Postgres connection
    try {
      await pgPool.query('SELECT 1');
      logger.info('Database connection established: PostgreSQL (RDS) connected successfully.');
    } catch (err) {
      logger.error('Failed to connect to PostgreSQL database: %s', err.message);
      throw err;
    }
  } else {
    dbType = 'sqlite';
    logger.info('Database configuration: No PostgreSQL config found. Falling back to local SQLite...');
    
    const dbPath = path.resolve(__dirname, process.env.SQLITE_DB_PATH || 'notes.db');
    
    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    await new Promise((resolve, reject) => {
      sqliteDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Failed to connect to local SQLite database: %s', err.message);
          reject(err);
        } else {
          logger.info(`Database connection established: SQLite connected at ${dbPath}`);
          resolve();
        }
      });
    });
  }

  // Setup schema
  await initSchema();
}

async function initSchema() {
  logger.info('Initializing database schema...');
  
  const pgSchema = `
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'General',
      tags VARCHAR(255) DEFAULT '',
      color VARCHAR(20) DEFAULT '#4f46e5',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const sqliteSchema = `
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      tags TEXT DEFAULT '',
      color TEXT DEFAULT '#4f46e5',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const schema = dbType === 'postgres' ? pgSchema : sqliteSchema;

  try {
    await query(schema);
    logger.info('Database schema checked/initialized successfully.');
  } catch (err) {
    logger.error('Schema initialization failed: %s', err.message);
    throw err;
  }
}

/**
 * Unified query method. Automatically translates PostgreSQL positional parameters ($1, $2)
 * into SQLite parameters (?) when SQLite engine is active.
 */
function query(sql, params = []) {
  if (dbType === 'postgres') {
    return pgPool.query(sql, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      // Map PostgreSQL $1, $2 positional variables to SQLite ? positional variables
      const sqliteSql = sql.replace(/\$\d+/g, '?');
      
      // Determine if it is a SELECT or modifying statement
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');

      if (isSelect) {
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) {
            logger.error(`SQLite query error: ${err.message} | SQL: ${sqliteSql}`);
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        // Run INSERT/UPDATE/DELETE
        sqliteDb.run(sqliteSql, params, function (err) {
          if (err) {
            logger.error(`SQLite exec error: ${err.message} | SQL: ${sqliteSql}`);
            reject(err);
          } else {
            // Return rows structure or metadata matching PostgreSQL patterns where possible
            // Specifically, for INSERT we return the lastID as 'id' or return an empty array/object
            resolve({ insertId: this.lastID, affectedRows: this.changes });
          }
        });
      }
    });
  }
}

/**
 * Helper specifically for INSERT query with RETURNING * clause
 * SQLite does not support RETURNING * natively in older versions.
 * So we abstract the INSERT query inside this helper.
 */
async function createNote({ title, content, category, tags, color }) {
  if (dbType === 'postgres') {
    const sql = `
      INSERT INTO notes (title, content, category, tags, color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const rows = await query(sql, [title, content, category, tags, color]);
    return rows[0];
  } else {
    const sql = `
      INSERT INTO notes (title, content, category, tags, color)
      VALUES ($1, $2, $3, $4, $5)
    `;
    const result = await query(sql, [title, content, category, tags, color]);
    const insertedRows = await query('SELECT * FROM notes WHERE id = $1', [result.insertId]);
    return insertedRows[0];
  }
}

/**
 * Helper specifically for UPDATE query with RETURNING * clause
 */
async function updateNote(id, { title, content, category, tags, color }) {
  if (dbType === 'postgres') {
    const sql = `
      UPDATE notes 
      SET title = $1, content = $2, category = $3, tags = $4, color = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const rows = await query(sql, [title, content, category, tags, color, id]);
    return rows[0];
  } else {
    const sql = `
      UPDATE notes 
      SET title = $1, content = $2, category = $3, tags = $4, color = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `;
    await query(sql, [title, content, category, tags, color, id]);
    const updatedRows = await query('SELECT * FROM notes WHERE id = $1', [id]);
    return updatedRows[0];
  }
}

async function isHealthy() {
  try {
    if (dbType === 'postgres') {
      await pgPool.query('SELECT 1');
    } else {
      await new Promise((resolve, reject) => {
        sqliteDb.get('SELECT 1', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    return true;
  } catch (err) {
    logger.error('Database health check failed: %s', err.message);
    return false;
  }
}

async function close() {
  logger.info('Closing database connections...');
  if (pgPool) {
    await pgPool.end();
    logger.info('PostgreSQL connection pool closed.');
  }
  if (sqliteDb) {
    await new Promise((resolve) => {
      sqliteDb.close(() => {
        logger.info('SQLite database closed.');
        resolve();
      });
    });
  }
}

module.exports = {
  initialize,
  query,
  createNote,
  updateNote,
  isHealthy,
  close,
  getDbType: () => dbType
};
