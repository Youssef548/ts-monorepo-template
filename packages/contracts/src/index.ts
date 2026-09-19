// The source of truth for the API wire format.
//
// Add your DTOs here as zod schemas with `export type X = z.infer<typeof XSchema>`.
// The API validates requests with them, the frontend imports the same schemas
// for form validation, and packages/api-client re-parses responses with them —
// one repo, one version, no duplication and no code generation.
//
// Give each schema a stable `.meta({ id: 'Name' })` so it gets a named component
// in the OpenAPI document that /docs renders.
export * from './error';
