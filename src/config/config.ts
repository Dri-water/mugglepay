import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  solanaAddress: process.env.SOLANA_ADDR || '',
  alchemyApiKey: process.env.ALCHEMY_API_KEY || '',
  alchemyWebhookAuthToken: process.env.ALCHEMY_WEBHOOK_AUTH_TOKEN || '',
  usdcTokenAddress: new PublicKey(process.env.USDC_TOKEN_ADDRESS || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  solanaNetwork: process.env.SOLANA_NETWORK || 'mainnet-beta'
}; 