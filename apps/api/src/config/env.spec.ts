import { validateEnv } from './env';

/**
 * Passing an explicit source object keeps this a pure function test — no
 * mutation of process.env, no leakage between cases.
 */
const valid = {
  APP_NAME: 'app',
  DATABASE_URL: 'postgresql://app:app@localhost:5432/app',
  PORT: '3001',
  WEB_URL: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('accepts a valid environment', () => {
    const env = validateEnv(valid);
    expect(env.DATABASE_URL).toBe(valid.DATABASE_URL);
    expect(env.PORT).toBe(3001);
  });

  it('applies defaults for everything optional', () => {
    const env = validateEnv({ DATABASE_URL: valid.DATABASE_URL });
    expect(env.PORT).toBe(3001);
    expect(env.APP_NAME).toBe('app');
    expect(env.WEB_URL).toBe('http://localhost:3000');
  });

  it('fails fast and names every invalid field', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'not-a-url' })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ ...valid, PORT: '-1' })).toThrow(/PORT/);
  });

  it('coerces PORT from the string an environment variable always is', () => {
    expect(validateEnv({ ...valid, PORT: '4567' }).PORT).toBe(4567);
  });
});
