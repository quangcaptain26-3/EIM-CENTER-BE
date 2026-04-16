import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

interface AccessPayload {
  userId: string;
  role: string;
}

interface RefreshPayload {
  userId: string;
}

/** Payload sau khi verify refresh token (có exp để ghi session). */
export interface VerifiedRefreshPayload extends RefreshPayload {
  /** Unix timestamp (giây), từ claim JWT `exp` */
  exp: number;
}

/**
 * Thin wrapper around jsonwebtoken.
 * All secret/TTL configuration is read from env at construction time.
 */
export class JwtProvider {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor() {
    this.accessSecret = env.JWT_ACCESS_SECRET;
    this.refreshSecret = env.JWT_REFRESH_SECRET;
    this.accessTtl = env.JWT_ACCESS_TTL;
    this.refreshTtl = env.JWT_REFRESH_TTL;
  }

  /** Signs a short-lived access token containing userId and role. */
  signAccess(payload: AccessPayload): string {
    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessTtl as jwt.SignOptions['expiresIn'],
    });
  }

  /** Signs a long-lived refresh token containing only userId. */
  signRefresh(payload: RefreshPayload): string {
    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshTtl as jwt.SignOptions['expiresIn'],
    });
  }

  /**
   * Verifies an access token.
   * Returns the decoded payload on success, or null if the token is
   * expired, malformed, or has an invalid signature.
   */
  verifyAccess(token: string): AccessPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as AccessPayload & {
        iat?: number;
        exp?: number;
      };
      return { userId: decoded.userId, role: decoded.role };
    } catch {
      return null;
    }
  }

  /**
   * Verifies a refresh token.
   * Returns userId và exp (hết hạn) — cần exp để INSERT user_sessions.expires_at.
   */
  verifyRefresh(token: string): VerifiedRefreshPayload | null {
    try {
      const decoded = jwt.verify(
        token,
        this.refreshSecret,
      ) as RefreshPayload & { iat?: number; exp?: number };
      if (decoded.exp === undefined) {
        return null;
      }
      return { userId: decoded.userId, exp: decoded.exp };
    } catch {
      return null;
    }
  }
}
