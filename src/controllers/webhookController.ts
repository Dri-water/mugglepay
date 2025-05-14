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
    const requestId = Math.random().toString(36).substring(7);
    logger.info('Received webhook request', {
      requestId,
      path: req.path,
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'],
        'x-alchemy-signature': req.headers['x-alchemy-signature'] ? 'present' : 'missing'
      },
      bodyPresent: !!req.body,
      rawBodyPresent: !!req.rawBody
    });

    try {
      // Debug log the entire request
      logger.debug('Full request details', {
        requestId,
        headers: req.headers,
        body: req.body,
        rawBodyLength: req.rawBody?.length,
        query: req.query,
        params: req.params
      });

      // Get the signature from headers
      const signature = req.headers['x-alchemy-signature'];
      
      if (!signature || typeof signature !== 'string') {
        logger.error('Missing or invalid signature', {
          requestId,
          error: 'MISSING_SIGNATURE',
          headers: req.headers,
          signatureType: typeof signature
        });
        return res.status(401).json({ error: 'Missing signature' });
      }

      if (!req.rawBody) {
        logger.error('Raw body not available', {
          requestId,
          error: 'MISSING_RAW_BODY',
          bodyPresent: !!req.body,
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length']
        });
        return res.status(500).json({ error: 'Internal server error - Raw body missing' });
      }

      // Verify signing key presence
      if (!config.alchemyWebhookSigningKey) {
        logger.error('Webhook signing key not configured', {
          requestId,
          error: 'MISSING_SIGNING_KEY'
        });
        return res.status(500).json({ error: 'Internal server error - Configuration issue' });
      }

      // Log body size and preview for debugging
      logger.debug('Processing webhook body', {
        requestId,
        bodySizeBytes: req.rawBody.length,
        bodyPreview: req.rawBody.toString('utf8').substring(0, 100) + '...',
        bodyType: typeof req.body,
        isBodyObject: req.body !== null && typeof req.body === 'object'
      });

      try {
        // Verify the signature using raw body
        const isValid = verifyAlchemySignature(
          req.rawBody.toString('utf8'),
          signature,
          config.alchemyWebhookSigningKey as string
        );

        if (!isValid) {
          logger.error('Invalid webhook signature', {
            requestId,
            error: 'INVALID_SIGNATURE',
            signatureLength: signature.length,
            expectedSignatureFormat: /^[a-f0-9]{64}$/i.test(signature) ? 'valid' : 'invalid'
          });
          return res.status(401).json({ error: 'Invalid signature' });
        }
      } catch (verifyError) {
        logger.error('Error during signature verification', {
          requestId,
          error: verifyError instanceof Error ? {
            name: verifyError.name,
            message: verifyError.message,
            stack: verifyError.stack
          } : 'Unknown error'
        });
        return res.status(500).json({ error: 'Internal server error - Signature verification failed' });
      }

      logger.info('Signature verification successful', { requestId });

      try {
        await tokenService.handleWebhook(req.body);
      } catch (webhookError) {
        logger.error('Error in tokenService.handleWebhook', {
          requestId,
          error: webhookError instanceof Error ? {
            name: webhookError.name,
            message: webhookError.message,
            stack: webhookError.stack
          } : 'Unknown error',
          webhookBody: req.body
        });
        return res.status(500).json({ error: 'Internal server error - Webhook processing failed' });
      }
      
      logger.info('Webhook processed successfully', {
        requestId,
        webhookType: req.body.webhookId || 'unknown',
        eventType: req.body.event?.type || 'unknown'
      });

      res.status(200).json({ message: 'Webhook processed successfully' });
    } catch (error) {
      logger.error('Unexpected error in webhook handler', {
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        stage: 'top-level-handler'
      });
      res.status(500).json({ error: 'Internal server error - Unexpected error' });
    }
  },

  queryTransaction: (req: Request, res: Response) => {
    const requestId = Math.random().toString(36).substring(7);
    logger.info('Transaction query request received', {
      requestId,
      txHash: req.params.txHash
    });

    try {
      const { txHash } = req.params;
      const transfer = tokenService.getTransferByHash(txHash);

      if (!transfer) {
        logger.info('Transaction not found', {
          requestId,
          txHash
        });
        return res.status(404).json({ error: 'Transaction not found' });
      }

      logger.info('Transaction found', {
        requestId,
        txHash,
        transferDetails: {
          amount: transfer.amount,
          timestamp: transfer.timestamp,
          from: transfer.from,
          to: transfer.to
        }
      });

      res.status(200).json(transfer);
    } catch (error) {
      logger.error('Error querying transaction', {
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error',
        params: req.params
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}; 