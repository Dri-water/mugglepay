import { Connection, PublicKey } from '@solana/web3.js';
import { TokenTransfer, AlchemyWebhookPayload } from '../types';
import { config } from '../config/config';
import winston from 'winston';

// Configure logger
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

class TokenService {
  private connection: Connection;
  private transfers: Map<string, TokenTransfer>;

  constructor() {
    try {
      this.connection = new Connection(
        `https://api.${config.solanaNetwork}.solana.com`,
        'confirmed'
      );
      this.transfers = new Map();
    } catch (error) {
      logger.error('Failed to initialize TokenService', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        config: {
          network: config.solanaNetwork,
          address: config.solanaAddress
        }
      });
      throw error;
    }
  }

  private validatePayload(payload: unknown): asserts payload is AlchemyWebhookPayload {
    try {
      if (!payload || typeof payload !== 'object') {
        throw new Error('Payload must be an object');
      }

      const { event } = payload as Partial<AlchemyWebhookPayload>;
      
      if (!event || typeof event !== 'object') {
        throw new Error('Missing or invalid event object');
      }

      const requiredFields = ['tokenAddress', 'to', 'from', 'amount', 'hash', 'timestamp'];
      const missingFields = requiredFields.filter(field => !(field in event));

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Validate field types
      if (typeof event.tokenAddress !== 'string') throw new Error('tokenAddress must be a string');
      if (typeof event.to !== 'string') throw new Error('to address must be a string');
      if (typeof event.from !== 'string') throw new Error('from address must be a string');
      if (typeof event.amount !== 'string') throw new Error('amount must be a string');
      if (typeof event.hash !== 'string') throw new Error('hash must be a string');
      if (typeof event.timestamp !== 'string') throw new Error('timestamp must be a string');

      // Validate address formats
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(event.tokenAddress)) {
        throw new Error('Invalid token address format');
      }
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(event.to)) {
        throw new Error('Invalid recipient address format');
      }
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(event.from)) {
        throw new Error('Invalid sender address format');
      }

      // Validate amount format
      if (!/^\d*\.?\d*$/.test(event.amount)) {
        throw new Error('Invalid amount format');
      }

      // Validate timestamp
      const timestamp = new Date(event.timestamp).getTime();
      if (isNaN(timestamp)) {
        throw new Error('Invalid timestamp format');
      }
    } catch (error) {
      logger.error('Payload validation failed', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        payload: JSON.stringify(payload, null, 2)
      });
      throw error;
    }
  }

  public async handleWebhook(payload: unknown): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      logger.debug('Received webhook payload', {
        requestId,
        payload,
        payloadType: typeof payload
      });

      // Validate and type-check the payload
      this.validatePayload(payload);

      // Verify it's a USDC transfer
      const eventTokenAddress = payload.event.tokenAddress.toLowerCase();
      const configTokenAddress = config.usdcTokenAddress.toBase58().toLowerCase();

      logger.debug('Comparing token addresses', {
        requestId,
        eventTokenAddress,
        configTokenAddress,
        matches: eventTokenAddress === configTokenAddress
      });

      if (eventTokenAddress !== configTokenAddress) {
        logger.info('Non-USDC transfer ignored', {
          requestId,
          receivedToken: eventTokenAddress,
          expectedToken: configTokenAddress
        });
        return;
      }

      // Verify the recipient is our monitored address
      const eventRecipient = payload.event.to.toLowerCase();
      const monitoredAddress = config.solanaAddress.toLowerCase();

      logger.debug('Comparing recipient addresses', {
        requestId,
        eventRecipient,
        monitoredAddress,
        matches: eventRecipient === monitoredAddress
      });

      if (eventRecipient !== monitoredAddress) {
        logger.info('Transfer to different address ignored', {
          requestId,
          receivedAddress: eventRecipient,
          expectedAddress: monitoredAddress
        });
        return;
      }

      try {
        const transfer: TokenTransfer = {
          amount: parseFloat(payload.event.amount),
          tokenAddress: payload.event.tokenAddress,
          from: payload.event.from,
          to: payload.event.to,
          timestamp: new Date(payload.event.timestamp).getTime(),
          transactionHash: payload.event.hash
        };

        if (isNaN(transfer.amount)) {
          throw new Error('Failed to parse amount');
        }

        if (isNaN(transfer.timestamp)) {
          throw new Error('Failed to parse timestamp');
        }

        this.transfers.set(transfer.transactionHash, transfer);
        logger.info('Transfer recorded', { requestId, transfer });
      } catch (error) {
        logger.error('Failed to process transfer', {
          requestId,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : error,
          event: payload.event
        });
        throw error;
      }
    } catch (error) {
      logger.error('Error handling webhook', {
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        payload: JSON.stringify(payload, null, 2)
      });
      throw error;
    }
  }

  public getTransferByHash(txHash: string): TokenTransfer | undefined {
    try {
      if (typeof txHash !== 'string') {
        throw new Error('Transaction hash must be a string');
      }

      const transfer = this.transfers.get(txHash);
      if (transfer) {
        logger.info('Transfer found', { txHash, transfer });
      } else {
        logger.info('Transfer not found', { txHash });
      }
      return transfer;
    } catch (error) {
      logger.error('Error retrieving transfer', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        txHash
      });
      throw error;
    }
  }
}

export const tokenService = new TokenService(); 