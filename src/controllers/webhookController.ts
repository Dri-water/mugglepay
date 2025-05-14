import { Request, Response } from 'express';
import { tokenService } from '../services/tokenService';
import { config } from '../config/config';
import winston from 'winston';
import { verifyAlchemySignature } from '../utils/signatureVerification';

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

interface ExtendedRequest extends Request {
  rawBody?: Buffer;
}

export const webhookController = {
  handleWebhook: async (req: ExtendedRequest, res: Response) => {
    try {
      // Get the signature from headers
      const signature = req.headers['x-alchemy-signature'];
      
      if (!signature || typeof signature !== 'string') {
        logger.error('Missing or invalid signature');
        return res.status(401).json({ error: 'Missing signature' });
      }

      if (!req.rawBody) {
        logger.error('Raw body not available');
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Verify the signature using raw body
      const isValid = verifyAlchemySignature(
        req.rawBody.toString('utf8'),
        signature,
        config.alchemyWebhookSigningKey as string
      );

      if (!isValid) {
        logger.error('Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
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