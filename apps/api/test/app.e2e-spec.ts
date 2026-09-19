import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppModule } from '../src/app.module';
import { ErrorEnvelopeFilter } from '../src/filters/error-envelope.filter';

/**
 * Boots the real composition root. This is what proves the global pipe and
 * filter are actually installed on the app the API serves, not merely defined.
 */
describe('app (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalFilters(new ErrorEnvelopeFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('an unknown route returns the error envelope, not a bare 404', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
    expect(typeof res.body.error.message).toBe('string');
  });
});
