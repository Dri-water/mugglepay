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
    this.connection = new Connection(
      `https://api.${config.solanaNetwork}.solana.com`,
      'confirmed'
    );
    this.transfers = new Map();
  }

  public async handleWebhook(payload: AlchemyWebhookPayload): Promise<void> {
    try {
      // Verify it's a USDC transfer
      if (payload.event.tokenAddress.toLowerCase() !== config.usdcTokenAddress.toBase58().toLowerCase()) {
        logger.info('Non-USDC transfer ignored');
        return;
      }

      // Verify the recipient is our monitored address
      if (payload.event.to.toLowerCase() !== config.solanaAddress.toLowerCase()) {
        logger.info('Transfer to different address ignored');
        return;
      }

      const transfer: TokenTransfer = {
        amount: parseFloat(payload.event.amount),
        tokenAddress: payload.event.tokenAddress,
        from: payload.event.from,
        to: payload.event.to,
        timestamp: new Date(payload.event.timestamp).getTime(),
        transactionHash: payload.event.hash
      };

      this.transfers.set(transfer.transactionHash, transfer);
      logger.info('Transfer recorded', { transfer });
    } catch (error) {
      logger.error('Error handling webhook', { error });
      throw error;
    }
  }

  public getTransferByHash(txHash: string): TokenTransfer | undefined {
    const transfer = this.transfers.get(txHash);
    if (transfer) {
      logger.info('Transfer found', { transfer });
    } else {
      logger.info('Transfer not found', { txHash });
    }
    return transfer;
  }
}

export const tokenService = new TokenService(); 