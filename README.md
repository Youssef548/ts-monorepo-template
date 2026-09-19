# ts-monorepo-template

A starting point for a TypeScript full-stack project: one NestJS API, one Next.js
web app, and the shared packages that keep them honest. It carries the seams —
and only the seams.

**It contains no domain.** No models, no DTOs, no endpoints beyond a health
check, no screens beyond a placeholder. The architecture is the wiring and the
rules that enforce it; everything a real application puts *through* it is yours
to add.

## What is actually here

```
apps/
  api/                NestJS — REST under /api/v1, no feature modules yet
  web/                Next.js App Router — no routes yet
packages/
  contracts/          zod schemas: the source of truth for the wire format
  database/           Prisma wiring + migrations; prisma/schema/ is empty
  api-client/         typed fetch: auth headers, response parsing, ApiError
  ui/                 Tailwind 4 design tokens + primitives
  config/             shared tsconfig presets
  eslint-config/      the dependency-boundary enforcement
scripts/
  check-db-env.mjs    fails when the two DATABASE_URLs disagree
```

## The three invariants

Everything else in this template is disposable. These are not.

**1. Contracts are the source of truth.** Every DTO is a zod schema in
`packages/contracts`, with its type inferred from it. The API validates requests
with those schemas, the web app imports the *same* schemas for form validation,
and `api-client` re-parses responses with them. One repo, one version, no
duplication — and no code generation, because zod is simultaneously the
compile-time type and the runtime guard on both sides.

**2. Dependency boundaries are build errors, not conventions.**
`packages/eslint-config` encodes them and ESLint fails the build:

| From | May import | May not import |
| --- | --- | --- |
| `apps/*` | `packages/*` | another `apps/*` |
| `packages/*` | `packages/*` | an `apps/*`, `config`, `eslint-config` |

Every package exposes exactly one public entry, so deep imports do not resolve.
These rules are themselves tested — see below.

**3. Every failure has one shape.** The API returns nothing but:

```json
{ "error": { "code": "NOT_FOUND", "message": "...", "details": {} } }
```

`code` is stable and machine-readable; `message` is for humans. Clients branch on
`code`, never on `message`. The API's global exception filter is the only thing
that writes an error body, and `packages/api-client` turns that envelope into a
typed `ApiError`, so callers never parse a failure by hand.

## Getting started

```bash
docker compose up -d
corepack enable && pnpm install
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
pnpm dev                      # api on :3001, web on :3000
```

`db:deploy` is deliberately not in that list: with an empty schema there is
nothing to migrate.

Check it booted: <http://localhost:3001/api/v1/health> → `{"status":"ok"}`, and
interactive API docs at <http://localhost:3001/docs>.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | API and web in watch mode |
| `pnpm build` | Build everything, in dependency order |
| `pnpm lint` | ESLint, including the boundary rules |
| `pnpm typecheck` | `tsc --noEmit` per package |
| `pnpm test` | Unit + e2e across the workspace |

The API's `test` task needs Postgres up, because its e2e suite boots the real app.

## How the architecture is tested

A template with no domain has nothing else worth asserting, so the tests target
the rules. The interesting one is
`packages/eslint-config/test/boundaries.test.ts`: it runs the real ESLint config
against a miniature workspace under `test/fixtures/` and fails if any rule stops
firing. A boundary rule that silently breaks looks exactly like a codebase that
follows it, so it is worth a test.

**Two things make the rules real rather than decorative.** Both were bugs that
passed as green builds before they were caught, and both are easy to undo:

- **`boundaries/root-path` is set to an absolute monorepo root**
  (`packages/eslint-config/index.js`). The plugin resolves its `include` and
  `elements` patterns against `process.cwd()` by default — but turbo runs each
  package's lint with `cwd` set to that package, so `apps/**` matched nothing, no
  element was ever recognised, and every rule passed silently. An absolute root
  makes the rules independent of where ESLint was invoked.
- **`globalDependencies` in `turbo.json` lists `packages/config/**` and
  `packages/eslint-config/**`.** Without it, editing the shared ESLint config
  does not invalidate any package's cached `lint` task, so a changed rule keeps
  reporting the previous result until someone clears the cache by hand.

The fixture tests also deliberately run with the process cwd at the package
directory rather than the fixture root, so a regression in either of the above
fails a test instead of passing quietly.

If you want to check the rules against the real tree, drop a file that imports
across a boundary and run `pnpm lint` — it should fail the build.

## Adding your first resource

The order matters less than keeping each step in its own layer.

1. **Schema** — `packages/contracts/src/<name>.ts`, a zod schema with
   `.meta({ id: '<Name>' })`, exported from `src/index.ts`. This is the wire
   format; it is the only thing the API and the client agree on.
2. **Model** — `packages/database/prisma/schema/<Name>.prisma`, one file per
   model. Then:
   ```bash
   pnpm --filter @app/database db:migrate --name add_<name>
   ```
3. **Module** — `apps/api/src/modules/<name>/`, with a controller, a service and
   DTOs built from the contract schemas via `createZodDto`. Register it in
   `app.module.ts`. Validate at the boundary; keep the domain rules in the
   service.
4. **Client** — in the app that needs it, add `@app/api-client` and
   `@app/contracts`, then write resource methods over the generic helpers:
   ```ts
   const api = createApiClient({ baseUrl, getAccessToken });
   const thing = await api.get('/things/1', ThingSchema);
   ```
5. **Screen** — a route under `apps/web/src/app/`.

Because there is no code generation, a URL and the schema it returns both live in
your hands — the generic helper types the schema, and the API's e2e suite is what
catches a renamed path.

## Adding the things this template deliberately omits

Each of these was left out because it is product-shaped, not architectural. They
are additive, and none of them require changing the structure:

- **Auth.** A `User` model, an `auth` module, and an `AuthModule` registered in
  `app.module.ts`. If the browser needs the token, keep it in an httpOnly cookie
  written by a route handler in `apps/web/src/app/api/`, so the client never
  holds it.
- **Roles.** Extend `ErrorCodes` and add a guard; keep the role vocabulary in
  `contracts` so the client can branch on it.
- **Idempotent writes.** Dedupe on a client-generated `Idempotency-Key` header
  with a unique column, and return the original row when it is replayed.
- **Offline / retry.** Queue writes client-side and rely on the idempotency key
  to make replay safe.
- **Queues, PWA, i18n.** Nothing in the structure opposes them; each is a
  dependency and a directory, not a re-architecture.

## Renaming the project

Two values, no script:

- `package.json` → `name`
- `APP_NAME` in `.env` (web metadata and the API's Swagger title)

The workspace scope is deliberately fixed at `@app/*` and never derived from the
project name, so nothing else changes. The trade-off is that workspace packages
are not org-scoped and cannot be published to npm — fine for private apps, and a
mechanical rename if that ever changes.

## Conventions

- **Node 22**, pnpm via Corepack. Docker for local Postgres 16.
- **API surface.** REST under `/api/v1`. The prefix lives in `main.ts`, not in
  each controller.
- **`DATABASE_URL` in two places.** `scripts/check-db-env.mjs` runs before every
  migrate command and refuses when `packages/database/.env` and `apps/api/.env`
  disagree — otherwise you migrate one database and serve another, silently.
- **No `.env` in git.** `.env.example` only.
- **Route groups.** `(marketing)` for public pages and `(dash)` for anything
  behind a session is the convention this template assumes; the directories are
  not scaffolded empty.

## License

No license has been chosen. Add one before accepting contributions.
