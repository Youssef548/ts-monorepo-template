import { createZodDto } from 'nestjs-zod';
import { ErrorEnvelopeSchema } from '@app/contracts';

/**
 * Registers the error envelope as a known schema so it appears in the OpenAPI
 * document at /docs and every response's error shape is discoverable.
 */
export class ErrorEnvelopeDto extends createZodDto(ErrorEnvelopeSchema) {}
