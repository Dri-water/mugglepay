import express from 'express';
import { config } from './config/config';
import { webhookController } from './controllers/webhookController';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

const app = express();

// Middleware to parse JSON while preserving raw body
app.use(express.json({
  verify: (req: any, res, buf) => {
    // Store raw body for signature verification
    req.rawBody = buf;
  }
}));

// Routes
app.post('/webhook', webhookController.handleWebhook);
app.get('/transaction/:txHash', webhookController.queryTransaction);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start server
app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port}`);
  logger.info(`Monitoring USDC transfers to address: ${config.solanaAddress}`);
}); 