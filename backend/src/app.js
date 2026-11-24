const express = require('express');
const todosRouter = require('./routes/todos');
const { cors, parseOrigins } = require('./middleware/cors');

/**
 * Builds the Express app around a repository. Keeping this separate from
 * server.js lets tests inject any repository without opening a port.
 */
function createApp(repo, { dataSource = 'unknown', corsOrigin = process.env.CORS_ORIGIN } = {}) {
  const app = express();
  // CORS goes first so every response, errors included, carries the headers.
  app.use(cors(parseOrigins(corsOrigin)));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok', dataSource }));
  app.use('/api/todos', todosRouter(repo));

  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: err.message, details: err.details });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
