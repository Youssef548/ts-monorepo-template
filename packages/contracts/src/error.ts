import { z } from 'zod';

/**
 * Every failure the API returns has this shape — nothing else is a valid error
 * response. Clients branch on `code` (stable, machine-readable), never on
 * `message` (human-facing, free to change).
 */
export const ErrorEnvelopeSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .meta({ id: 'ErrorEnvelope' });
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/**
 * The closed set of codes the API emits. `ErrorCode` is derived from it, so
 * adding a code here is the only way to make it type-safe — the exception
 * filter is typed against this union and will not compile with a stray string.
 */
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;
export type ErrorCode = keyof typeof ErrorCodes;
