# ts-monorepo-template — Implementation Plan

**Goal:** A reusable GitHub template repo carrying the hifz-tracker architecture's seams — and
nothing else. No models, no DTOs, no endpoints beyond health, no screens beyond a placeholder.
Green CI on `main` so a fresh clone works with no edits.

**Spec:** `docs/superpowers/specs/2026-09-19-monorepo-boilerplate-design.md`

**Stack:** pnpm workspaces + Turborepo; NestJS 11 + Prisma 6 + PostgreSQL 16; Next.js 15 App
Router + Tailwind 4; zod 4; Node 22. One stack, no options.

## Global Constraints

- The workspace scope is the fixed `@app/*` and is never derived from the project name. The
  project name lives in exactly two places: root `package.json#name` and `APP_NAME`.
- No code generation. OpenAPI is documentation only; nothing reads it at build time.
- Three invariants, non-negotiable: contracts are the source of truth; dependency boundaries are
  build errors; every failure has one envelope mapped to a typed error.
- Zero domain. If a file would encode a product decision, it does not ship.
- Verification is architecture tests plus a green CI, not an example resource.

---

### Task 1: Root tooling

**Files:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.node-version`, `.editorconfig`,
`.gitignore`, `docker-compose.yml`, `.env.example`

**Produces:** workspace globs `apps/*` + `packages/*`; turbo tasks `build`, `dev`, `lint`, `test`,
`typecheck`; a Postgres 16 compose service whose credentials come from the root `.env`
(`${DB_NAME:-app}`, never hardcoded, so renaming the project never means editing compose).

**Verified:** `pnpm install` resolves.

---

### Task 2: `packages/config` + `packages/eslint-config` with boundary fixtures

**Files:** four tsconfig presets (`base`/`nest`/`next`/`react-lib`), `eslint-config/index.js`,
`eslint-config/test/boundaries.test.ts`, and a fixture workspace under `test/fixtures/`
(`apps/one`, `apps/two`, `packages/pkg`, `packages/contracts`, `packages/config`).

**Produces:** `defineConfig({ type, importRules, rootPath })` returning ESLint flat config that
makes `apps/* → apps/*`, `packages/* → apps/*` and `packages/* → tooling` errors, with
`default: 'disallow'`.

**The rule set, and why tooling is its own element type.** The first instinct was a capture pattern
(`packageName: '!(config|eslint-config)'`). That is unverifiable at a glance and depends on how the
plugin interprets captures. Declaring `packages/config` and `packages/eslint-config` as a separate
`tooling` element type *before* the generic `packages/*` descriptor states the same rule using only
ordering, and the fixture test proves it fires.

**Two details carried over from hifz-tracker because they were expensive to find:**
1. `import/resolver: { node: { extensions: ['.js', '.ts', '.tsx'] } }`. Without it, extensionless
   relative TS imports resolve as unresolved and boundaries skips them silently.
2. `importRules: false` for the Next app, because `eslint-config-next` already registers a plugin
   under the key `import` and redefining it throws.

**Verified:** 6 fixture tests pass, including the two "allows" cases (which must not fire) and a
guard that the fixture run is not accidentally passing for the wrong reason.

---

### Task 3: `packages/contracts`

**Files:** `src/error.ts` (`ErrorEnvelopeSchema`, `ErrorCodes`, `ErrorCode`), `src/index.ts`,
`test/error.test.ts`.

**Produces:** the wire format. `src/index.ts` is a one-line export plus a comment marking where
domain schemas go — the package ships the envelope and nothing else.

**Verified:** 3 tests. One asserts the code set is exactly the six known codes, as a deliberate
speed bump: the API's exception filter is typed against that union, so widening it is an API change.

---

### Task 4: `packages/database`

**Files:** `prisma/schema/main.prisma` (generator + datasource only), `prisma/migrations/migration_lock.toml`,
`prisma.config.ts`, `src/index.ts`, `.env.example`, `eslint.config.mjs`.

**Produces:** the data seam — Prisma wiring, scripts (`db:generate`, `db:migrate`, `db:deploy`) and
a framework-agnostic client re-export. `prisma/schema/` ships empty; models are domain.

**The `migration_lock.toml` is load-bearing.** `prisma migrate deploy` fails with "Could not find a
migrations directory" when the directory is absent, which would break CI on a template that
correctly has no migrations. Shipping the lockfile alone makes it report "No pending migrations to
apply" and exit 0.

**Verified:** `db:generate` and `db:deploy` both succeed against a real Postgres with zero models.

---

### Task 5: `packages/api-client`

**Files:** `src/client.ts`, `src/index.ts`, `test/client.test.ts` (MSW).

**Produces:** `ApiError` plus generic `get`/`post`/`patch`/`put`/`delete` helpers taking
`(path, schema, options)`. No resource methods — those are the first thing a project adds, and
shipping none is honest.

**Design points:** the response is read as text before parsing so a 204 empty body does not throw
inside `.json()`; a non-JSON failure body (an HTML error page from a proxy) becomes
`ApiError(status, 'INTERNAL')` rather than a `SyntaxError`; and the caller's schema is the runtime
guard, so server drift raises at the boundary instead of leaking a malformed object upward.

**Verified:** 7 tests, including the 204 case, the non-envelope failure case, and a
"server drifts from the contract" case.

---

### Task 6: `packages/ui`

**Files:** `src/tokens.css` (Tailwind 4 `@theme`), `src/button.tsx`, `src/index.ts`.

**Produces:** design tokens as a package rather than files copied between apps, and one primitive.
`Button` is here because the web placeholder renders it, which is what proves the cross-package
React + Tailwind `transpilePackages` seam actually works — not as decoration.

---

### Task 7: `apps/api`

**Files:** `src/main.ts`, `src/app.module.ts`, `src/config/env.ts` + `env.spec.ts`,
`src/filters/` (filter + Swagger DTO), `src/prisma/` (global module + service),
`src/modules/health/`, `test/app.e2e-spec.ts`, `test/validation.e2e-spec.ts`, `test/jest-e2e.json`,
plus tsconfigs, `nest-cli.json`, `eslint.config.mjs`, `.env.example`.

**Produces:** the API shell — env validation before bootstrap, global `ZodValidationPipe`, global
`ErrorEnvelopeFilter`, `PrismaModule`, `GET /api/v1/health`, Swagger at `/docs`. `app.module.ts` is
a thin composition root with a comment where modules go.

**Proving the validation seam without a DTO.** The template has no DTOs, so
`test/validation.e2e-spec.ts` defines a throwaway one and a throwaway controller *inside the test
file*, then asserts the global pipe rejects a bad body and the filter turns that into the envelope.
The test stays valuable after the first real DTO lands, because it fails if the pipe or filter ever
stops being wired in.

**Verified:** 4 unit + 5 e2e tests pass. Runtime: `/api/v1/health` → `{"status":"ok"}`,
`/api/v1/nope` → the envelope, `/docs` → 200, and `/docs-json` reports title `app API` from `APP_NAME`.

---

### Task 8: `apps/web`

**Files:** `src/app/layout.tsx`, `globals.css`, `page.tsx` + `page.test.tsx`, `next.config.ts`,
`tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.env.example`.

**Produces:** the Next shell — one placeholder route, Tailwind wired to `@app/ui/tokens.css`, and
`transpilePackages: ['@app/ui']`. No middleware and no route groups: both are documented conventions
that arrive with the first route that needs them.

`apps/web` declares **only** `@app/ui`. It does not declare `@app/contracts` or `@app/api-client`,
because it has no endpoint to call yet and an unused dependency is dead weight. Adding them is a
one-line command once there is something to call.

**Verified:** the render test passes (server component + cross-package import), and `next build`
succeeds. Note: `next build` rewrites `apps/web/tsconfig.json` to add `resolveJsonModule` and
`isolatedModules`; that rewritten form is committed so builds stop producing a diff.

---

### Task 9: CI, README, docs

**Files:** `.github/workflows/ci.yml`, `README.md`, `docs/superpowers/`.

**Produces:** one CI job on a Postgres 16 service: install → `db:generate` → `db:deploy` →
`turbo run lint typecheck test build`, with `--affected` only on PRs (a change touching no package
runs no tasks and still exits 0 — a green check that tested nothing).

`README.md` documents the three invariants, the two subtle things that make the boundary rules
real, the add-a-resource order, and an add-on recipe for each thing deliberately omitted (auth,
roles, idempotency, offline, queues, PWA, i18n).

---

### Task 10: Verify, then publish

**Verified end to end:**
1. `pnpm install` from clean.
2. `db:generate` + `db:deploy` against real Postgres.
3. `pnpm turbo run lint typecheck test build` → 22/22 tasks, 26 tests.
4. Boundary enforcement proved against the **real tree**, not just fixtures: a file in `apps/api`
   importing `apps/web`, and a file in `packages/contracts` importing an app. Both failed `pnpm
   lint`; both were reverted.
5. Runtime smoke: health, envelope, `/docs`.
6. Every package with TypeScript source lints itself.

**Then:** `git init`, `gh repo create Youssef548/ts-monorepo-template --public`, push, mark as a
template repository.

---

## Completion checklist

- [ ] Fresh clone installs, generates and builds with no edits
- [ ] Three invariants hold and are tested
- [ ] Boundary violations fail the build in the real tree
- [ ] No domain: no models, no DTOs, no endpoints beyond health, no screens beyond a placeholder
- [ ] CI green on `main`
- [ ] README documents the rules and the omissions
