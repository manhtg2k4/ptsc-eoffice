import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WopiTokenPayload } from './dto/wopi-token-payload.interface';
import {
  buildWopiTokenPayload,
  generateWopiToken,
  getWopiSecret,
  maskToken,
  verifyWopiToken,
} from './wopi-token.util';

@Injectable()
export class WopiTokenService {
  private readonly secret: string;
  private readonly logger = new Logger(WopiTokenService.name);

  constructor() {
    this.secret = getWopiSecret();
    if (!process.env.WOPI_SECRET) {
      this.logger.warn('WOPI_SECRET not set. Using fallback secret for WOPI integration.');
    }
  }

  /**
   * Generate WOPI access token
   * @param fileId File ID
   * @param userId User ID
   * @param canEdit Whether user can edit the file
   * @returns JWT token string
   */
  generateToken(fileId: string, userId: string, canEdit: boolean): string {
    const payload = buildWopiTokenPayload(fileId, userId, canEdit);
    const token = generateWopiToken(payload);

    this.logger.debug(
      `[generateToken] fileId=${fileId} userId=${userId} canEdit=${canEdit} exp=${payload.exp} token=${maskToken(token)}`,
    );

    return token;
  }

  /**
   * Verify and decode WOPI token
   * @param token JWT token string
   * @returns Decoded token payload
   * @throws UnauthorizedException if token is invalid or expired
   */
  verifyToken(token: string): WopiTokenPayload {
    try {
      const decoded = verifyWopiToken(token);
      this.logger.debug(
        `[verifyToken] success fileId=${decoded.fileId} userId=${decoded.userId} canEdit=${decoded.permissions?.canEdit} exp=${decoded.exp} token=${maskToken(token)}`,
      );
      return decoded;
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `[verifyToken] failed message=${err?.message || 'unknown'} token=${maskToken(token)}`,
      );
      if (err?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('WOPI token expired');
      }
      throw new UnauthorizedException('Invalid WOPI token');
    }
  }

  /**
   * Extract token from query parameter or header
   * @param accessToken Token from query parameter
   * @param authHeader Authorization header
   * @returns Token string
   */
  extractToken(accessToken?: string, authHeader?: string): string {
    // WOPI typically uses access_token query parameter
    if (accessToken) {
      return accessToken;
    }

    // Fallback to Authorization header
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice('Bearer '.length).trim();
    }

    throw new UnauthorizedException('No WOPI access token provided');
  }
}
