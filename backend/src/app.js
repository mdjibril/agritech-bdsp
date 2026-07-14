const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { query } = require('./db');
const { HttpError } = require('./httpError');
const { optionalAuth } = require('./middleware/auth');
const { auditAuthenticatedWrites } = require('./middleware/audit');

// V1 enterprise routes
const v1AuthRoutes = require('./routes/v1/auth');
const v1TransactionRoutes = require('./routes/v1/transactions');
const v1ActorRoutes = require('./routes/v1/actors');
const v1EscrowRoutes = require('./routes/v1/escrow');
const v1DocumentRoutes = require('./routes/v1/documents');
const v1MockRoutes = require('./routes/v1/mocks');

// Backward-compatibility shim routes (legacy frontend expects these)
const shimAuthRoutes = require('./routes/shim/auth');
const shimPostRoutes = require('./routes/shim/posts');
const shimDealRoutes = require('./routes/shim/deals');
const shimBdspRoutes = require('./routes/shim/bdsp');

// Legacy routes (keep WhatsApp working)
const whatsappRoutes = require('./routes/whatsapp');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(optionalAuth);
app.use(auditAuthenticatedWrites);

// Health check
app.get('/health', async (_req, res, next) => {
  try {
    const result = await query('SELECT now() AS database_time');
    res.json({ status: 'ok', database_time: result.rows[0].database_time });
  } catch (error) {
    next(error);
  }
});

// V1 Enterprise API
app.use('/api/v1/auth', v1AuthRoutes);
app.use('/api/v1/transactions', v1TransactionRoutes);
app.use('/api/v1/actors', v1ActorRoutes);
app.use('/api/v1/escrow', v1EscrowRoutes);
app.use('/api/v1/documents', v1DocumentRoutes);
app.use('/api/v1/mocks', v1MockRoutes);

// Backward-compatibility shims (also under /api for production without Vite proxy)
app.use('/auth', shimAuthRoutes);
app.use('/api/auth', shimAuthRoutes);
app.use('/posts', shimPostRoutes);
app.use('/api/posts', shimPostRoutes);
app.use('/deals', shimDealRoutes);
app.use('/api/deals', shimDealRoutes);
app.use('/bdsp', shimBdspRoutes);
app.use('/api/bdsp', shimBdspRoutes);

// WhatsApp webhook (keep working)
app.use('/whatsapp', whatsappRoutes);

// 404 catch-all
app.use((_req, _res, next) => {
  next(new HttpError(404, 'Route not found'));
});

// Error handler
app.use((error, _req, res, _next) => {
  const status = error.status || (error.code && error.code.startsWith('23') ? 400 : 500);
  const response = {
    error: error.message || 'Internal server error',
  };
  if (error.details) response.details = error.details;
  if (process.env.NODE_ENV !== 'production' && status === 500) response.stack = error.stack;
  res.status(status).json(response);
});

module.exports = { app };
