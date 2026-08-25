import * as crypto from 'crypto';

export function signHmacSha256(secret: string, data: string | Buffer): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

export function safeSignatureEqual(
  expectedHex: string,
  providedSignature: string,
): boolean {
  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedSignature, 'hex');
  if (expected.length !== provided.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
}