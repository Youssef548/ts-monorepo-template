import { z } from 'zod';

/**
 * Validated once, at boot, so a misconfigured deploy fails immediately with a
 * list of what is wrong instead of throwing somewhere deep in a request.
 */
const EnvSchema = z.object({
  APP_NAME: z.string().min(1).default('app'),
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_URL: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment:\n${parsed.error.issues
        .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}`,
    );
  }
  return parsed.data;
}
