# Monorepo Boilerplate — Design

- **Date:** 2026-09-19
- **Status:** Draft — awaiting design review
- **Path:** Tooling / new project (greenfield, informed by the hifz-tracker build)

> This spec describes a **separate repository**, not a change to hifz-tracker. It lives here
> because this is where the working tree is; it moves to the boilerplate repo when that is created.

## 1. Context

hifz-tracker proved out a monorepo architecture worth reusing: pnpm workspaces driven by
Turborepo, zod contracts shared directly between a NestJS API and a Next.js frontend, and
dependency rules enforced by tooling rather than convention. Building it was expensive, and most
of the cost was in the seams — module resolution across the workspace, making boundary violations
fail the build, giving every failure one shape. The goal is a starting point for the next
TypeScript full-stack project that carries those seams already solved.

**The template is architecture level. It contains no domain.** No models, no DTOs, no endpoints,
no screens, no example resource. The architecture is the seams and the tooling that enforces
them; everything a real application would put *through* those seams is out.

**How this spec was written.** The first attempt was a copy-and-rename of hifz-tracker. It was
rejected, and the reasons shaped every decision below:

- **A copy inherits decisions the domain justified, not the architecture.** Idempotency-Keys on
  every write exist because of a mobile offline outbox. `STUDENT | TEACHER` exists because of a
  student/teacher model. Postgres+Prisma because that domain is relational. Presenting those as
  "generic" is over-fitting.
- **A copy inherits the cruft.** hifz-tracker carries a dead `apps/api/prisma/schema.prisma` that
  duplicates the real schema package, a `tsconfig/next.json` preset nothing extends, `vitest` and
  `prettier` in `apps/api` wired to nothing, and a Redis service in compose no code touches.
- **A mass rename is a find-replace over a tree.** It produces repositories that compile but are
  semantically wrong, and it needs judgement per file — so it was never mechanical.

Design forward from the proven seams; carry over only what the architecture justifies.

## 2. Decisions

| # | Decision | Choice | Alternatives considered | Rationale |
|---|----------|--------|------------------------|-----------|
| D1 | Consumption model | **GitHub template repo** — "Use this template", then edit two values | npm CLI scaffolder; both | The template *is* a working repo, so it is always verified. A CLI is a second artifact to build, version and publish for no gain at this size. |
| D2 | Stack | **One opinionated stack, no options**: pnpm workspaces + Turborepo; NestJS 11 + Prisma 6 + PostgreSQL 16; Next.js 15 App Router + Tailwind 4; zod 4; Node 22 | Swappable edges behind seams; composable module picker | The point is to remove decisions, not relocate them. Revisit only if a real second project needs a different ORM or framework. |
| D3 | Core invariants | **Three, non-negotiable:** (1) contracts are the source of truth, (2) dependency boundaries are build errors, (3) every failure has one envelope mapped to a typed error | — | These are the seams that cost the most to get right and are the most expensive to retrofit. Everything else here is disposable. |
| D4 | Codegen | **None. OpenAPI is documentation only, never a build input.** | Emit OpenAPI → generate route types → CI drift gate | ⚠️ *Confirm — see Q1.* Generation in hifz-tracker existed to cross a **language** boundary. A TypeScript-only surface has none, and contracts already provide compile-time + runtime safety. Cost: a renamed route no longer fails `tsc` (mitigated by D10). |
| D5 | Project naming | **Fixed workspace scope `@app/*`, never derived from the project name.** The project name appears in exactly two places: root `package.json#name` and an `APP_NAME` env var | Placeholder name + `init.mjs` find-replace | Deletes the whole class of rename bugs rather than making the script cleverer. Turborepo's own starter fixes `@repo/*` for the same reason. Trade-off: packages are not org-scoped, so they cannot be published — irrelevant for private apps, and a rename stays mechanical if that changes. |
| D6 | Domain content | **Zero.** No models, no DTOs, no endpoints, no pages, no example resource | One thin example resource (`tasks`) proving the wiring | A shipped example is domain fiction that every project must delete or, worse, adapts to. The seams are proven by tests instead (D10), so nothing domain-shaped ever enters the tree. |
| D7 | Data layer | **Keep the Prisma wiring, ship an empty `prisma/schema/`.** No models, no migration. `db:deploy` is a no-op until a model exists | Drop Prisma/database entirely; ship a commented copy-me model | See §7 — this is *wired* infrastructure, and deliberately different from hifz-tracker's unused Redis service. |
| D8 | Contracts surface | **`packages/contracts` exports `ErrorEnvelopeSchema`, `ErrorCodes`, `ErrorCode` and nothing else**, with `index.ts` marking where domain schemas go | Add one neutral placeholder DTO (`PingRequest`) | The envelope is the architecture; DTOs are domain. A placeholder DTO is a model by another name. |
| D9 | Client surface | **`packages/api-client` exports `ApiError` plus generic `get`/`post`/`patch`/`delete` helpers** that take `(path, schema, body?)`, inject auth headers, parse responses with the passed schema and map the envelope to `ApiError`. No resource methods | Generated route types (+D4); raw `fetch` in components | The path string is the only untyped surface; the schema argument keeps every response typed and runtime-guarded. Resource methods are the first thing a project adds, so shipping none is honest. |
| D10 | Verification | **Architecture tests** — the template tests its own rules, not a domain. Plus a green CI on `main` (D11) | Documented copy-me recipe; an `example` side branch; build-green only | With no domain, the only thing worth testing *is* the architecture. A template that does not build is worse than no template. |
| D11 | Verification bar | **The template's own CI is green on `main`.** A fresh clone installs, generates, lints, typechecks, tests and builds with no edits | Documented manual setup | Keeps D2 honest. |
| D12 | Not in scope | Auth, roles, sessions, idempotent writes, offline/outbox, PWA/service worker, Redis/queues, i18n, payments, deployment | — | Every one was justified by hifz-tracker's product, none by its architecture. Each becomes an add-on recipe in the README. |

## 3. Topology

```
<project>/
├── apps/
│   ├── api/                    # NestJS 11 — REST under /api/v1
│   │   └── src/
│   │       ├── main.ts              # env validation, global prefix, pipe, filter
│   │       ├── app.module.ts        # composition root — "add your modules here"
│   │       ├── config/env.ts        # zod env schema + validateEnv()
│   │       ├── filters/             # the error envelope (filter + Swagger DTO)
│   │       ├── prisma/              # @Global PrismaModule + PrismaService
│   │       └── modules/health/      # GET /health — boot/CI readiness
│   └── web/                    # Next.js 15 App Router
│       └── src/
│           ├── app/                 # layout.tsx, globals.css, one placeholder page.tsx
│           └── middleware.ts        # (present, no matcher rules yet)
├── packages/
│   ├── contracts/              # error.ts only: ErrorEnvelopeSchema + ErrorCodes. Depends on zod alone.
│   ├── database/               # Prisma wiring; prisma/schema/ is EMPTY
│   │   └── prisma/schema/main.prisma   # generator + datasource only
│   ├── api-client/             # ApiError + generic request helpers. Depends on contracts alone.
│   ├── ui/                     # tokens.css (@theme) + Button primitive
│   ├── config/                 # tsconfig presets: base / nest / next / react-lib
│   └── eslint-config/          # boundary factory + test/fixtures/ (see §6)
├── scripts/
│   └── check-db-env.mjs        # fails when the two DATABASE_URLs disagree
├── .github/workflows/ci.yml
├── docker-compose.yml          # Postgres 16 only
├── turbo.json · pnpm-workspace.yaml · .node-version · .editorconfig
└── README.md                   # the rules, plus add-on recipes
```

Absent versus hifz-tracker: `dart-packages/`, `apps/mobile/`, `melos.yaml`, `pubspec.yaml`,
`openapitools.json`, `packages/quran`, `generated/`, `apps/api/src/spec.ts`, the `dart` and
`drift` CI jobs, and every domain module, DTO, model and screen.

The web app ships **one** route, not the `(marketing)` / `(dash)` route groups — the convention is
documented in the README rather than scaffolded empty. `packages/ui` keeps tokens and a `Button`
because the placeholder page renders it, which is what proves the cross-package React + Tailwind
`transpilePackages` seam actually works.

## 4. The contract seam (D3.1)

`packages/contracts` is the source of truth. It ships the envelope and the code set; a project
adds its DTOs there and both sides consume them directly:

- The API validates with those schemas (`nestjs-zod`'s `createZodDto` + a global
  `ZodValidationPipe`), so an invalid payload is rejected before a handler runs.
- The web app imports the *same* schemas for form validation (`react-hook-form` + `zodResolver`)
  and the same inferred types for props.
- `api-client` re-parses every response with the caller's schema, so drift between client and
  server surfaces as a thrown error at the boundary rather than as `undefined` three components
  deep.

One repo, one version, direct imports. This is why D4 can be "no codegen" without losing safety:
zod is simultaneously the compile-time type and the runtime guard, on both sides.

## 5. Dependency rules (D3.2)

Enforced by `packages/eslint-config` via `eslint-plugin-boundaries`, `default: 'disallow'` so an
unlisted edge fails rather than passes:

- `apps/*` may import `packages/*` and **never** another `apps/*`. Cross-app traffic is HTTP.
- `packages/*` may import `packages/*` and **never** `apps/*`. Dependencies point inward.
- `packages/config` and `packages/eslint-config` are build/lint-time only; no other package may
  import them.
- Every package exposes exactly one public entry (`exports` map); deep imports are not resolvable.
- `contracts` depends on zod alone. `api-client` depends on `contracts` alone.

Two implementation details are load-bearing, were expensive to find, and carry over verbatim:

1. `import/resolver: { node: { extensions: ['.js', '.ts', '.tsx'] } }`. Without it,
   extensionless relative TS imports resolve as unresolved, and boundaries silently skips
   `element-types` on them.
2. The Next.js app must pass `importRules: false` to the factory: `eslint-config-next` already
   registers a plugin under the key `import`, and redefining it throws.

## 6. Verifying the architecture (D10)

With no domain, the tests target the rules themselves.

**Boundary test** — `packages/eslint-config/test/boundaries.test.ts`. A miniature workspace under
`test/fixtures/` (`apps/one`, `apps/two`, `packages/pkg`) with its own ESLint config, driven
through the ESLint Node API with `cwd` set to the fixture root. Real files, because the resolver
needs a resolvable target — an unresolved import is exactly the case where boundaries stays silent.
Asserts:

| Fixture | Expected |
|---|---|
| `apps/one` importing `apps/two` | `boundaries/element-types` error |
| `packages/pkg` importing `apps/one` | `boundaries/element-types` error |
| `packages/pkg` importing `@app/config` | `boundaries/element-types` error |
| `packages/pkg` importing `contracts` | clean |
| `apps/one` importing a package | clean |
| a deep import past a package's `exports` | unresolved / error |

The fixture tree is excluded from the repo's own lint run so it never lints itself.

**Other architecture tests**

- `contracts` — `ErrorEnvelopeSchema` accepts a valid envelope, rejects a malformed one, and
  `ErrorCodes` stays the closed set the filter emits.
- `api-client` — MSW: a success body is parsed by the caller's schema; an error envelope becomes
  `ApiError` with the right `status`/`code`; an unrecognised error body becomes
  `ApiError(status, 'INTERNAL', …)` rather than a raw parse error.
- `apps/api` — e2e: `GET /api/v1/health` → `{ status: 'ok' }`; an unknown route returns the
  envelope with `code: 'NOT_FOUND'` (this is the test that proves the global filter is actually
  installed); a request with an invalid body is rejected by the global pipe with
  `VALIDATION_ERROR`.
- `apps/api` — `validateEnv()` fails on a missing/short secret and reports every bad field.
- `apps/web` — the placeholder page renders, proving the App Router, Tailwind and `@app/ui` seam.

## 7. Why the database wiring is not "unused infrastructure"

The same standard that ruled out hifz-tracker's unused Redis service applies here, so it is worth
being explicit about the difference.

Redis in hifz-tracker was **declared and unwired**: a compose service with no client dependency,
no module, no connection, no test, and no script touching it. Removing it changes nothing about
how the app runs.

The database package is **wired and exercised**: `PrismaModule` is imported by `AppModule` and
`PrismaService` opens a real connection on boot; `db:generate` runs as part of the package's
`build`, so CI exercises it on every run; `db:migrate` / `db:deploy` are real scripts behind a
real guard. Only the *domain model* is missing, and that is domain by definition.

Two consequences the plan has to handle:

- `prisma migrate deploy` errors when no migrations directory exists. Ship
  `prisma/migrations/migration_lock.toml` so the directory exists and deploy reports "no pending
  migrations" instead of failing CI. **Verify this in the plan** — if Prisma still refuses with
  zero migrations, the CI step becomes conditional on the migrations directory being non-empty.
- `apps/api/.env` and `packages/database/.env` both carry `DATABASE_URL`, and
  `scripts/check-db-env.mjs` fails fast when they disagree. That guard is architecture: without it
  you migrate one database and serve another, silently.

## 8. Error envelope (D3.3)

One shape, defined once in `contracts`:

```ts
{ error: { code: string, message: string, details?: unknown } }
```

- **API** — a global `@Catch()` filter maps `ZodValidationException` → `VALIDATION_ERROR` +
  issues, `HttpException` → status-derived code, anything else → `INTERNAL` (logged; the message
  is never leaked to the caller). `ErrorCodes` is the closed set, and the `nestjs-zod` DTO base
  keeps the envelope in the Swagger document.
- **Client** — `api-client` parses failures with `ErrorEnvelopeSchema` and throws
  `ApiError { status, code, message, details }`. An unrecognised body becomes
  `ApiError(status, 'INTERNAL', …)`.
- **UI** — components branch on `error.code`, never on `error.message`, so messages stay safe to
  reword and to translate later.

## 9. What we deliberately do not copy from hifz-tracker

| Not carried over | Why |
|---|---|
| Dart / Flutter / Melos workspace | Different product surface; doubles the toolchain and the CI matrix |
| `openapi-generator-cli`, `openapitools.json`, Java 17 prereq | Only existed to cross a language boundary (D4) |
| `apps/api/src/spec.ts`, `gen-api-types.sh`, `generated/`, the `drift` CI job | Codegen pipeline (D4) |
| `packages/quran` | Pure domain data |
| The `reviews` module, `ReviewLog` model, `reviews.ts` contracts | Domain |
| Auth module, JWT, refresh rotation, `RolesGuard`, cookie-session BFF, login UI | Product-shaped, not architecture (D6) |
| `Idempotency-Key` on writes, the drift outbox, `SyncWorker` | Existed to make a mobile retry queue safe (D6) |
| Serwist PWA, service worker, web manifest | Product requirement, not architecture |
| Redis + BullMQ in compose | Present and unwired — see §7 |
| `apps/api/prisma/schema.prisma` | Dead duplicate of the real schema |
| `packages/config/tsconfig/next.json` (as dead config) | Nothing extended it. **Fix:** the web app actually extends it, or the preset is deleted. |
| `vitest` and `prettier` in `apps/api` | Declared but not wired into any script or shared config |
| `@nestjs/config` | Env is validated with plain zod in `validateEnv()`; the module added nothing |
| The rename script | Replaced by D5 — there is nothing to rename |

## 10. Using the template

```bash
# GitHub → "Use this template"; or:
git clone <template> my-project && cd my-project && rm -rf .git && git init

docker compose up -d
corepack enable && pnpm install
cp .env.example .env                       # compose: DB_NAME / DB_USER / DB_PASSWORD
cp apps/api/.env.example apps/api/.env
cp packages/database/.env.example packages/database/.env
pnpm dev                                   # api :3001, web :3000
```

`db:deploy` is intentionally absent from that list — with an empty schema there is nothing to
migrate. The README documents the first-model path: add `prisma/schema/<Model>.prisma`, run
`pnpm --filter @app/database db:migrate --name init`.

Renaming to the project is optional and touches two values: root `package.json#name`, and
`APP_NAME` in `.env` (used by the web app's `metadata.title`, `manifest.ts`, and the API's Swagger
title). Database name, user and password are env values with neutral defaults (`app`, `app_test`
in CI) — never literals in source.

## 11. Non-goals

- No publishing workflow, changelog automation, or release tooling.
- No deployment story — no Dockerfiles, no IaC. Guessing a target would bake in a hosting decision.
- No component library beyond tokens and a `Button`.
- No auth (D6) — but the README sketches the add-on path so it is a known cost, not a surprise.
- No second example of anything. There is no first example.

## 12. Resolved questions

**Q1 — codegen: confirmed out (D4).** Generation in hifz-tracker existed to cross a *language*
boundary. A TypeScript-only surface has none, and zod already provides the compile-time type and
the runtime guard on both sides. The cost is real and accepted: a renamed route no longer fails
`tsc`, so the API's e2e suite is what catches it. Additive later (emit the spec, generate route
types, add a CI diff job); removing it later would not have been.

**Q2 — Swagger: kept, as documentation only.** `createZodDto` is needed for validation regardless,
and one `DocumentBuilder` call puts interactive docs at `/docs`. Nothing reads the document at
build time.

**Q3 — the empty `middleware.ts`: deleted.** An empty middleware is dead weight by the §7
standard. It arrives with the first route that needs protecting.

**Q4 — destination.** `github.com/Youssef548/ts-monorepo-template`, public, marked as a template
repository.

## 13. What implementation changed

Two decisions in this spec survived contact with the code; two did not, and the corrections are
worth recording because both were bugs that *passed* as green builds.

**Corrected: the boundary rules were not actually enforcing anything.** They are configured
correctly, and the fixture tests in this repo proved the rule *definitions* work — but in a real
run they never fired. `eslint-plugin-boundaries` resolves its `include` and `elements` patterns
against `process.cwd()`, and turbo runs each package's lint script with `cwd` set to that package.
So `apps/**` matched nothing, no element was ever recognised, and every rule passed silently.
Fixing it needs an absolute `boundaries/root-path` — the plugin documents this exact failure mode.
The same bug was present in hifz-tracker, where these rules were believed to be enforced.

**Corrected: turbo never invalidated the cached lint task when the rules changed.** `lint` has no
`dependsOn`, so `packages/eslint-config/**` was not in any package's cache inputs. Editing a rule
kept reporting the previous result until the cache was cleared by hand. `globalDependencies` now
covers both tooling packages, which also fixes the same staleness for `typecheck` and `build` when
a tsconfig preset changes.

**Confirmed: the empty-schema Prisma path works.** `prisma migrate deploy` with only
`migration_lock.toml` and no migrations reports "No pending migrations to apply" and exits 0, so
CI can run it unconditionally. Shipping the lockfile rather than gating the CI step was the right
call.

**Confirmed and strengthened: the database wiring is exercised, not decorative.** `@app/database`'s
`build` runs `prisma generate`, `PrismaModule` connects on boot, and the API's e2e suite boots the
real composition root — so §7's argument holds in practice, not just on paper.

**One gap the spec did not anticipate:** no `packages/*` had a `lint` script, so the
"packages never import an app" rule was encoded but never run in package code. Every package with
TypeScript source now lints itself. `packages/eslint-config` deliberately does not — its fixtures
intentionally violate the very rules it defines.

