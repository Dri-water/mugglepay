import * as crypto from 'crypto';

export function verifyAlchemySignature(
  rawBody: string,
  signature: string,
  signingKey: string
): boolean {
  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('hex');
  return signature === digest;
} 