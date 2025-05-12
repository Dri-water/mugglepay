# Solana USDC Transaction Monitor

This service monitors USDC transactions on Solana using Alchemy webhooks. It provides endpoints to receive webhook notifications and query transaction details.

## Features

- Monitor USDC transfers to a specific Solana address
- Webhook endpoint for Alchemy notifications
- Query endpoint for transaction details
- Logging system for tracking transfers

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Alchemy API key and webhook setup
- Solana wallet address to monitor

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the following to `.env` and fill in your configuration:
   ```
   PORT=3000
   SOLANA_ADDR=your_solana_address_here
   ALCHEMY_WEBHOOK_AUTH_TOKEN=your_webhook_auth_token_here
   USDC_TOKEN_ADDRESS=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
   SOLANA_NETWORK=mainnet-beta
   ```

## Running the Service

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

### Webhook Endpoint
```
POST /webhook
```
Receives notifications from Alchemy when USDC transfers occur.

### Query Transaction
```
GET /transaction/:txHash
```
Retrieves details about a specific transaction.

### Health Check
```
GET /health
```
Checks if the service is running.

## Testing

To test the service:

1. Set up Alchemy webhook to point to your service's `/webhook` endpoint
2. Send a small amount of USDC (e.g., 0.01) to your monitored address
3. Check the logs for transfer confirmation
4. Query the transaction using the transaction hash

## Logging

Logs are stored in:
- `error.log`: Error-level logs
- `combined.log`: All logs
- Console output: All logs (development) 