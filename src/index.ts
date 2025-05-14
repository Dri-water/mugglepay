import express from 'express';
import { config } from './config/config';
import { webhookController } from './controllers/webhookController';
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

const app = express();

// Log all requests
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});

// Middleware to parse JSON while preserving raw body
app.use(express.json({
  verify: (req: any, res, buf) => {
    // Store raw body for signature verification
    req.rawBody = buf;
  }
}));

// Log any JSON parsing errors
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    logger.error('JSON parsing error', {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      path: req.path,
      method: req.method
    });
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  next();
});

// Routes
app.post('/webhook', webhookController.handleWebhook);
app.get('/transaction/:txHash', webhookController.queryTransaction);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    }
  });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    error: reason instanceof Error ? {
      name: reason.name,
      message: reason.message,
      stack: reason.stack
    } : reason
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Starting graceful shutdown...');
  // Add any cleanup logic here
  process.exit(0);
});

// Start server
const server = app.listen(config.port, () => {
  logger.info('Server started', {
    port: config.port,
    nodeEnv: process.env.NODE_ENV || 'development',
    solanaNetwork: config.solanaNetwork,
    monitoredAddress: config.solanaAddress
  });
}); 