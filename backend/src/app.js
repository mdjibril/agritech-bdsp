const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { query } = require('./db');
const { HttpError } = require('./httpError');
const { optionalAuth } = require('./middleware/auth');
const { auditAuthenticatedWrites } = require('./middleware/audit');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const hubRoutes = require('./routes/hubs');
const dealRoutes = require('./routes/deals');
const bdspRoutes = require('./routes/bdsp');
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(optionalAuth);
app.use(auditAuthenticatedWrites);

app.get('/health', async (_req, res, next) => {
  try {
    const result = await query('SELECT now() AS database_time');
    res.json({ status: 'ok', database_time: result.rows[0].database_time });
  } catch (error) {
    next(error);
  }
});

app.use('/auth', authRoutes);
app.use('/posts', postRoutes);
app.use('/hubs', hubRoutes);
app.use('/deals', dealRoutes);
app.use('/bdsp', bdspRoutes);
app.use('/whatsapp', whatsappRoutes);

app.use((_req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

app.use((error, _req, res, _next) => {
  const status = error.status || (error.code && error.code.startsWith('23') ? 400 : 500);
  const response = {
    error: error.message || 'Internal server error',
  };
  if (error.details) {
    response.details = error.details;
  }
  if (process.env.NODE_ENV !== 'production' && status === 500) {
    response.stack = error.stack;
  }
  res.status(status).json(response);
});

module.exports = { app };
