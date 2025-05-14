import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
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

      const typedPayload = payload as Partial<AlchemyWebhookPayload>;
      
      if (!typedPayload.type) {
        throw new Error('Missing webhook type');
      }

      if (typedPayload.type !== 'ADDRESS_ACTIVITY') {
        throw new Error(`Unsupported webhook type: ${typedPayload.type}`);
      }

      if (!typedPayload.event?.transaction?.[0]) {
        throw new Error('Missing transaction data');
      }

      const transaction = typedPayload.event.transaction[0];
      
      if (!transaction.transaction?.[0]?.message?.[0]) {
        throw new Error('Invalid transaction structure');
      }

      const message = transaction.transaction[0].message[0];
      
      if (!message.account_keys || !Array.isArray(message.account_keys)) {
        throw new Error('Missing or invalid account_keys');
      }

      if (!message.instructions || !Array.isArray(message.instructions)) {
        throw new Error('Missing or invalid instructions');
      }

      if (!transaction.meta?.[0]) {
        throw new Error('Missing transaction metadata');
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

  private isMonitoredAddress(address: string): boolean {
    return address.toLowerCase() === config.solanaAddress.toLowerCase();
  }

  private processTransaction(transaction: any, requestId: string): void {
    try {
      const message = transaction.transaction[0].message[0];
      const meta = transaction.meta[0];
      const accounts = message.account_keys;
      const instructions = message.instructions;

      // Log transaction details for debugging
      logger.debug('Processing transaction', {
        requestId,
        signature: transaction.signature,
        accounts,
        instructions,
        balanceChanges: {
          pre: meta.pre_balances,
          post: meta.post_balances
        }
      });

      // Find the index of our monitored address
      const monitoredAddressIndex = accounts.findIndex(this.isMonitoredAddress);
      if (monitoredAddressIndex === -1) {
        logger.debug('Monitored address not found in transaction', {
          requestId,
          accounts,
          monitoredAddress: config.solanaAddress
        });
        return;
      }

      // Calculate the balance change for our address
      const preBalance = meta.pre_balances[monitoredAddressIndex];
      const postBalance = meta.post_balances[monitoredAddressIndex];
      const balanceChange = (postBalance - preBalance) / LAMPORTS_PER_SOL;

      // Only process if there's a positive balance change (receiving SOL)
      if (balanceChange > 0) {
        const transfer: TokenTransfer = {
          amount: balanceChange,
          tokenAddress: 'SOL', // Native SOL transfer
          from: accounts[instructions[0].accounts[0]], // Sender is the first account in instruction
          to: accounts[monitoredAddressIndex],
          timestamp: Date.now(), // Current timestamp as transaction timestamp isn't provided
          transactionHash: transaction.signature
        };

        this.transfers.set(transfer.transactionHash, transfer);
        logger.info('SOL transfer recorded', {
          requestId,
          transfer,
          fee: meta.fee / LAMPORTS_PER_SOL
        });
      } else {
        logger.debug('No positive balance change for monitored address', {
          requestId,
          balanceChange,
          fee: meta.fee / LAMPORTS_PER_SOL
        });
      }
    } catch (error) {
      logger.error('Error processing transaction', {
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        transaction: transaction.signature
      });
      throw error;
    }
  }

  public async handleWebhook(payload: unknown): Promise<void> {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      logger.debug('Received webhook payload', {
        requestId,
        payloadType: typeof payload,
        type: (payload as any)?.type
      });

      // Validate and type-check the payload
      this.validatePayload(payload);

      // Process each transaction in the webhook
      for (const transaction of payload.event.transaction) {
        try {
          this.processTransaction(transaction, requestId);
        } catch (error) {
          logger.error('Error processing transaction in webhook', {
            requestId,
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack
            } : error,
            transactionSignature: transaction.signature
          });
          // Continue processing other transactions even if one fails
        }
      }

      logger.info('Webhook processing completed', {
        requestId,
        transactionCount: payload.event.transaction.length
      });
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