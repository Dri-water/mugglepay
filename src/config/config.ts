import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';

export const config = {
  port: process.env.PORT || 3000,
  solanaAddress: process.env.SOLANA_ADDR || '',
  alchemyWebhookAuthToken: process.env.ALCHEMY_WEBHOOK_AUTH_TOKEN || '',
  usdcTokenAddress: new PublicKey(process.env.USDC_TOKEN_ADDRESS || ''),
  solanaNetwork: process.env.SOLANA_NETWORK || 'mainnet-beta'
}; 