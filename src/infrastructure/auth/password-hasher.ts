import bcrypt from 'bcrypt';

const ROUNDS = 12;

/**
 * Thin wrapper around bcrypt.
 * Using a fixed cost factor of 12 rounds for a strong security/performance balance.
 */
export class PasswordHasher {
  /** Hashes a plain-text password. Always generates a fresh salt. */
  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS);
  }

  /**
   * Securely compares a plain-text password against a stored bcrypt hash.
   * Returns true only if they match.
   */
  async compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
