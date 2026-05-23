require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./logger');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Setup Middlewares
app.use(helmet());

// CORS configuration - production vs dev
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : '*', // Default to allow all, useful for ALB / CloudFront testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Morgan Request Logging integrated with Winston
const morganFormat = process.env.NODE_ENV === 'production' 
  ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
  : 'dev';

app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// API Routes

// ALB Healthcheck endpoint
app.get('/health', async (req, res) => {
  const dbHealthy = await db.isHealthy();
  const uptime = process.uptime();
  const status = dbHealthy ? 'healthy' : 'degraded';
  
  const healthInfo = {
    status,
    database: dbHealthy ? 'connected' : 'disconnected',
    databaseEngine: db.getDbType(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    timestamp: new Date().toISOString(),
    memoryUsage: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    }
  };

  if (dbHealthy) {
    res.status(200).json(healthInfo);
  } else {
    logger.warn('Health check reported degraded state: %j', healthInfo);
    res.status(503).json(healthInfo); // Return 503 Service Unavailable so ALB pulls instance from rotation
  }
});

// GET all notes
app.get('/api/notes', async (req, res) => {
  try {
    const sql = 'SELECT * FROM notes ORDER BY created_at DESC';
    const notes = await db.query(sql);
    res.json(notes);
  } catch (err) {
    logger.error('Error fetching notes: %s', err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// GET specific note
app.get('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'SELECT * FROM notes WHERE id = $1';
    const rows = await db.query(sql, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Note with ID ${id} not found.` });
    }
    
    res.json(rows[0]);
  } catch (err) {
    logger.error('Error fetching note %s: %s', req.params.id, err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// POST create note
app.post('/api/notes', async (req, res) => {
  try {
    const { title, content, category, tags, color } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title and Content are required.' });
    }

    const note = await db.createNote({
      title,
      content,
      category: category || 'General',
      tags: tags || '',
      color: color || '#4f46e5'
    });

    logger.info('Created new note: ID %s, Title "%s"', note.id, note.title);
    res.status(201).json(note);
  } catch (err) {
    logger.error('Error creating note: %s', err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// PUT update note
app.put('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, category, tags, color } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Validation Error', message: 'Title and Content are required.' });
    }

    // Verify note exists
    const checkSql = 'SELECT id FROM notes WHERE id = $1';
    const checkRows = await db.query(checkSql, [id]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Note with ID ${id} not found.` });
    }

    const updatedNote = await db.updateNote(id, {
      title,
      content,
      category: category || 'General',
      tags: tags || '',
      color: color || '#4f46e5'
    });

    logger.info('Updated note: ID %s, Title "%s"', id, updatedNote.title);
    res.json(updatedNote);
  } catch (err) {
    logger.error('Error updating note %s: %s', req.params.id, err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// DELETE note
app.delete('/api/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify note exists
    const checkSql = 'SELECT id FROM notes WHERE id = $1';
    const checkRows = await db.query(checkSql, [id]);
    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Not Found', message: `Note with ID ${id} not found.` });
    }

    const sql = 'DELETE FROM notes WHERE id = $1';
    await db.query(sql, [id]);

    logger.info('Deleted note: ID %s', id);
    res.json({ message: 'Note deleted successfully', id });
  } catch (err) {
    logger.error('Error deleting note %s: %s', req.params.id, err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

// Catch-all route handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.url} does not exist.` });
});

// Start Server & Init DB
let server;
async function start() {
  try {
    // Wait for DB initialization
    await db.initialize();
    
    server = app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start backend server: %s', err.stack);
    process.exit(1);
  }
}

// Graceful Shutdown Handler (AWS Auto Scaling / ECS friendly)
async function shutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown procedure...`);
  
  if (server) {
    server.close(() => {
      logger.info('HTTP server stopped receiving new requests.');
    });
  }

  try {
    await db.close();
    logger.info('Graceful shutdown completed successfully. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during database close: %s', err.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
