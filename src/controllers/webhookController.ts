import { Request, Response } from 'express';
import { tokenService } from '../services/tokenService';
import { config } from '../config/config';
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

export const webhookController = {
  handleWebhook: async (req: Request, res: Response) => {
    try {
      // Verify webhook authentication
      const authToken = req.headers['x-webhook-auth'];
      if (authToken !== config.alchemyWebhookAuthToken) {
        logger.error('Invalid webhook authentication');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await tokenService.handleWebhook(req.body);
      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Error processing webhook', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  queryTransaction: (req: Request, res: Response) => {
    try {
      const { txHash } = req.params;
      const transfer = tokenService.getTransferByHash(txHash);

      if (!transfer) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.status(200).json(transfer);
    } catch (error) {
      logger.error('Error querying transaction', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}; 