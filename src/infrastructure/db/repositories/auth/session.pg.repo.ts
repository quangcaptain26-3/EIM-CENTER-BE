import { Pool } from 'pg';
import { ISessionRepo } from '../../../../domain/auth/repositories/session.repo.port';

export class SessionPgRepo implements ISessionRepo {
  constructor(private readonly pool: Pool) {}

  async createSession(data: {
    userId: string;
    tokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO user_sessions (
        user_id, token_hash, ip_address, user_agent, expires_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        data.userId,
        data.tokenHash,
        data.ipAddress ?? null,
        data.userAgent ?? null,
        data.expiresAt,
      ]
    );
  }

  async findActiveSession(tokenHash: string): Promise<{ userId: string } | null> {
    const res = await this.pool.query(
      `SELECT user_id 
       FROM user_sessions 
       WHERE token_hash = $1 
         AND revoked_at IS NULL 
         AND expires_at > now() 
       LIMIT 1`,
      [tokenHash]
    );

    if (res.rowCount === 0) return null;
    return { userId: res.rows[0]['user_id'] as string };
  }

  async revokeSession(tokenHash: string): Promise<void> {
    await this.pool.query(
      `UPDATE user_sessions 
       SET revoked_at = now() 
       WHERE token_hash = $1`,
      [tokenHash]
    );
  }
}
