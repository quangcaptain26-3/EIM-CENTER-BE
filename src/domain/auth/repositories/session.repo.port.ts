export interface ISessionRepo {
  createSession(data: {
    userId: string;
    tokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<void>;

  findActiveSession(tokenHash: string): Promise<{ userId: string } | null>;

  revokeSession(tokenHash: string): Promise<void>;
}
