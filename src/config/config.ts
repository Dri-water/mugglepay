import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';

export const config = {
  port: process.env.PORT || 3000,
  solanaAddress: process.env.SOLANA_ADDR || '',
  alchemyWebhookSigningKey: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY,
  usdcTokenAddress: new PublicKey(process.env.USDC_TOKEN_ADDRESS || ''),
  solanaNetwork: process.env.SOLANA_NETWORK || 'mainnet-beta'
}; 