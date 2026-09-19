import { describe, expect, it } from 'vitest';
import { ErrorCodes, ErrorEnvelopeSchema } from '../src/index';

describe('error envelope', () => {
  it('accepts a well-formed envelope', () => {
    const parsed = ErrorEnvelopeSchema.parse({
      error: { code: 'NOT_FOUND', message: 'No such thing' },
    });
    expect(parsed.error.code).toBe('NOT_FOUND');
  });

  it('accepts optional details and rejects a malformed envelope', () => {
    expect(
      ErrorEnvelopeSchema.safeParse({ error: { code: 'X', message: 'm', details: { field: 'a' } } })
        .success,
    ).toBe(true);
    expect(ErrorEnvelopeSchema.safeParse({ code: 'X', message: 'm' }).success).toBe(false);
    expect(ErrorEnvelopeSchema.safeParse({ error: { code: 'X' } }).success).toBe(false);
  });

  it('keeps the code set closed and stable', () => {
    // The exception filter is typed against this union; changing it is an API
    // change, so this test is a deliberate speed bump rather than a redundancy.
    expect(Object.keys(ErrorCodes).sort()).toEqual([
      'CONFLICT',
      'FORBIDDEN',
      'INTERNAL',
      'NOT_FOUND',
      'UNAUTHORIZED',
      'VALIDATION_ERROR',
    ]);
  });
});
