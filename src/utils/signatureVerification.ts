import * as crypto from 'crypto';
import winston from 'winston';

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

export function verifyAlchemySignature(
  rawBody: string,
  signature: string,
  signingKey: string
): boolean {
  try {
    logger.debug('Starting signature verification', {
      bodyLength: rawBody.length,
      signatureLength: signature.length,
      signingKeyPresent: !!signingKey
    });

    const hmac = crypto.createHmac('sha256', signingKey);
    hmac.update(rawBody, 'utf8');
    const digest = hmac.digest('hex');
    
    const isValid = signature === digest;
    
    logger.debug('Signature verification completed', {
      isValid,
      computedDigestLength: digest.length,
      receivedSignatureLength: signature.length
    });

    return isValid;
  } catch (error) {
    logger.error('Error during signature verification', {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : 'Unknown error'
    });
    return false;
  }
} 