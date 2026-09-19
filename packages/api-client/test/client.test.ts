import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiError, createApiClient, type ApiClient } from '../src/index';

const base = 'http://api.test/api/v1';
const ThingSchema = z.object({ id: z.string(), name: z.string() });

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('api-client', () => {
  let client: ApiClient;

  beforeAll(() => {
    client = createApiClient({ baseUrl: base, getAccessToken: () => 'token-123' });
  });

  it('returns the value parsed by the caller schema', async () => {
    server.use(
      http.get(`${base}/things/1`, () => HttpResponse.json({ id: '1', name: 'one', extra: true })),
    );
    const thing = await client.get('/things/1', ThingSchema);
    expect(thing.name).toBe('one');
    // zod strips unknown keys rather than passing them through.
    expect(thing).toEqual({ id: '1', name: 'one' });
  });

  it('forwards the bearer token and a JSON body', async () => {
    let auth = '';
    let body: unknown = null;
    server.use(
      http.post(`${base}/things`, async ({ request }) => {
        auth = request.headers.get('authorization') ?? '';
        body = await request.json();
        return HttpResponse.json({ id: '2', name: 'two' }, { status: 201 });
      }),
    );
    await client.post('/things', ThingSchema, { body: { name: 'two' } });
    expect(auth).toBe('Bearer token-123');
    expect(body).toEqual({ name: 'two' });
  });

  it('maps an error envelope to ApiError with its status, code and details', async () => {
    server.use(
      http.get(`${base}/things/1`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'No such thing', details: { id: '1' } } },
          { status: 404 },
        ),
      ),
    );
    const error = await client.get('/things/1', ThingSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', details: { id: '1' } });
  });

  it('falls back to INTERNAL when the failure body is not an envelope', async () => {
    server.use(
      http.get(`${base}/things/1`, () =>
        HttpResponse.text('<html>502 Bad Gateway</html>', { status: 502 }),
      ),
    );
    const error = await client.get('/things/1', ThingSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, code: 'INTERNAL' });
  });

  it('raises when the server drifts from the contract', async () => {
    server.use(http.get(`${base}/things/1`, () => HttpResponse.json({ id: '1' })));
    await expect(client.get('/things/1', ThingSchema)).rejects.toThrow();
  });

  it('parses an empty body as null so a 204 delete works', async () => {
    server.use(http.delete(`${base}/things/1`, () => new HttpResponse(null, { status: 204 })));
    await expect(client.delete('/things/1', z.null())).resolves.toBeNull();
  });

  it('does not set a Content-Type on a bodyless GET', async () => {
    let contentType: string | null = 'unset';
    server.use(
      http.get(`${base}/things/1`, ({ request }) => {
        contentType = request.headers.get('content-type');
        return HttpResponse.json({ id: '1', name: 'one' });
      }),
    );
    await client.get('/things/1', ThingSchema);
    expect(contentType).toBeNull();
  });
});
