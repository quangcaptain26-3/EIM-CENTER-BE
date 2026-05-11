import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(
      `[EIM] Missing required environment variable: "${key}". ` +
      `Please define it in your .env file or system environment.`
    );
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function optionalEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value || value.trim() === '') return defaultValue;
  const parsed = parseInt(value.trim(), 10);
  if (isNaN(parsed)) {
    throw new Error(
      `[EIM] Environment variable "${key}" must be a valid integer, got: "${value}"`
    );
  }
  return parsed;
}

type NodeEnv = 'development' | 'production' | 'test';

function parseNodeEnv(value: string): NodeEnv {
  const allowed: NodeEnv[] = ['development', 'production', 'test'];
  if (allowed.includes(value as NodeEnv)) return value as NodeEnv;
  throw new Error(
    `[EIM] NODE_ENV must be one of: ${allowed.join(', ')}. Got: "${value}"`
  );
}

export const env = Object.freeze({
  PORT:               optionalEnvNumber('PORT', 3000),
  DATABASE_URL:       requireEnv('DATABASE_URL'),
  JWT_ACCESS_SECRET:  requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_TTL:     optionalEnv('JWT_ACCESS_TTL', '15m'),
  JWT_REFRESH_TTL:    optionalEnv('JWT_REFRESH_TTL', '7d'),
  NODE_ENV:           parseNodeEnv(optionalEnv('NODE_ENV', 'development')),
  LOG_LEVEL:          optionalEnv('LOG_LEVEL', 'info'),
} as const);

export type Env = typeof env;
