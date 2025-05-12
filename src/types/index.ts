export interface TokenTransfer {
  amount: number;
  tokenAddress: string;
  from: string;
  to: string;
  timestamp: number;
  transactionHash: string;
}

export interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  event: {
    from: string;
    to: string;
    tokenAddress: string;
    amount: string;
    blockchain: string;
    hash: string;
    timestamp: string;
  };
} 