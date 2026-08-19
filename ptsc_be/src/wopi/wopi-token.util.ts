import * as jwt from 'jsonwebtoken';
import { WopiTokenPayload } from './dto/wopi-token-payload.interface';

const DEFAULT_WOPI_SECRET = 'default-wopi-secret-change-me';

export function getWopiSecret(): string {
  return process.env.WOPI_SECRET || DEFAULT_WOPI_SECRET;
}

export function generateWopiToken(payload: WopiTokenPayload): string {
  return jwt.sign(payload, getWopiSecret());
}

export function verifyWopiToken(token: string): WopiTokenPayload {
  return jwt.verify(token, getWopiSecret()) as WopiTokenPayload;
}

export function buildWopiTokenPayload(
  fileId: string,
  userId: string,
  canEdit: boolean,
): WopiTokenPayload {
  return {
    fileId,
    userId,
    permissions: {
      canEdit,
      canView: true,
      canShare: false,
    },
    exp: Math.floor(Date.now() / 1000) + (60 * 60),
  };
}

export function maskToken(token?: string | null): string {
  if (!token) return '<empty>';
  if (token.length <= 16) return `${token.slice(0, 4)}...${token.slice(-4)}`;
  return `${token.slice(0, 8)}...${token.slice(-8)}`;
}
