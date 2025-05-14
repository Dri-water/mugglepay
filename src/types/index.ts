export interface TokenTransfer {
  amount: number;
  tokenAddress: string;
  from: string;
  to: string;
  timestamp: number;
  transactionHash: string;
}

interface TransactionInstruction {
  accounts: number[];
  data: string;
  program_id_index: number;
}

interface TransactionHeader {
  num_required_signatures: number;
  num_readonly_signed_accounts: number;
  num_readonly_unsigned_accounts: number;
}

interface TransactionMessage {
  header: TransactionHeader[];
  account_keys: string[];
  instructions: TransactionInstruction[];
  recent_blockhash: string;
  versioned: boolean;
}

interface TransactionMeta {
  fee: number;
  pre_balances: number[];
  post_balances: number[];
  inner_instructions_none: boolean;
  log_messages: string[];
  log_messages_none: boolean;
  return_data_none: boolean;
  compute_units_consumed: number;
}

interface TransactionDetail {
  message: TransactionMessage[];
  signatures: string[];
}

interface Transaction {
  signature: string;
  transaction: TransactionDetail[];
  meta: TransactionMeta[];
  index: number;
  is_vote: boolean;
}

export interface AlchemyWebhookPayload {
  webhookId: string;
  id: string;
  createdAt: string;
  type: string;
  event: {
    transaction: Transaction[];
    slot: number;
    network: string;
  };
} 