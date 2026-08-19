import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

type NonceEntry = { expiresAt: number };

@Injectable()
export class CallbackAuthGuard implements CanActivate {
  private static readonly CLOCK_SKEW_SECONDS = 300;
  private static readonly NONCE_TTL_SECONDS = 300;
  private static readonly nonceStore = new Map<string, NonceEntry>();

  canActivate(context: ExecutionContext): boolean {
    const req: any = context.switchToHttp().getRequest();
    const headers = req?.headers || {};

    const clientIdHeader = String(headers['x-client-id'] || '').trim();
    const timestampHeader = String(headers['x-timestamp'] || '').trim();
    const nonceHeader = String(headers['x-nonce'] || '').trim();
    const signatureHeaderRaw = String(headers['x-signature'] || '').trim();
    const signatureHeader = signatureHeaderRaw.startsWith('sha256=')
      ? signatureHeaderRaw.slice('sha256='.length)
      : signatureHeaderRaw;

    const secret = String(process.env.CALLBACK_HMAC_SECRET || '').trim();
    const expectedClientId = String(process.env.CALLBACK_HMAC_CLIENT_ID || '').trim();

    // Nếu chưa cấu hình secret → bỏ qua xác thực (allow-all)
    if (!secret) {
      return true;
    }

    const setError = (msg: string) => { req.__callbackAuthError = msg; };

    if (!timestampHeader || !nonceHeader || !signatureHeader) {
      setError('Missing callback authentication headers');
      return true; // để controller xử lý và trả về { success: false }
    }
    if (!/^[a-fA-F0-9]+$/.test(signatureHeader) || signatureHeader.length % 2 !== 0) {
      setError('Invalid callback signature format');
      return true;
    }

    if (expectedClientId && clientIdHeader !== expectedClientId) {
      setError('Invalid callback client');
      return true;
    }

    const timestamp = Number(timestampHeader);
    if (!Number.isFinite(timestamp)) {
      setError('Invalid callback timestamp');
      return true;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const reqSec = timestamp > 1_000_000_000_000 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
    if (Math.abs(nowSec - reqSec) > CallbackAuthGuard.CLOCK_SKEW_SECONDS) {
      setError('Expired callback timestamp');
      return true;
    }

    this.cleanupExpiredNonces(nowSec);
    const nonceKey = `${reqSec}:${nonceHeader}`;
    if (CallbackAuthGuard.nonceStore.has(nonceKey)) {
      setError('Replay callback detected');
      return true;
    }

    const rawBody =
      typeof req.rawBody === 'string'
        ? req.rawBody
        : JSON.stringify(req.body ?? {});

    const canonical = `${timestampHeader}.${nonceHeader}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(canonical, 'utf8')
      .digest('hex');

    const providedBuffer = Buffer.from(signatureHeader, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const valid =
      providedBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(providedBuffer, expectedBuffer);

    if (!valid) {
      setError('Invalid callback signature');
      return true;
    }

    CallbackAuthGuard.nonceStore.set(nonceKey, {
      expiresAt: nowSec + CallbackAuthGuard.NONCE_TTL_SECONDS,
    });

    return true;
  }

  private cleanupExpiredNonces(nowSec: number): void {
    for (const [key, value] of CallbackAuthGuard.nonceStore.entries()) {
      if (value.expiresAt <= nowSec) {
        CallbackAuthGuard.nonceStore.delete(key);
      }
    }
  }
}
