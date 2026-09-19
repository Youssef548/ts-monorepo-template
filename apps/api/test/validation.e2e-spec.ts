import { Body, Controller, INestApplication, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ErrorEnvelopeFilter } from '../src/filters/error-envelope.filter';

/**
 * The template ships no DTOs, so this file defines a throwaway one. The point is
 * to prove the validation seam end to end: a request body schema declared in
 * contracts is rejected by the *global* pipe, and that rejection emerges as the
 * standard envelope.
 *
 * When you add your first real DTO, this test stays valuable — it fails if the
 * pipe or filter ever stops being wired into the app.
 */
const ProbeSchema = z.object({ name: z.string().min(2) }).meta({ id: 'ProbeRequest' });
class ProbeDto extends createZodDto(ProbeSchema) {}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() body: ProbeDto) {
    return { name: body.name };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('validation and the error envelope (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [ProbeModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new ErrorEnvelopeFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'ok' })
      .expect(201);
    expect(res.body).toEqual({ name: 'ok' });
  });

  it('rejects an invalid body with VALIDATION_ERROR and the zod issues', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ name: 'x' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeInstanceOf(Array);
  });

  it('rejects a missing body the same way', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/probe').send({}).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
