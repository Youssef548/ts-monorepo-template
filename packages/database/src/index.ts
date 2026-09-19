// The database layer is framework-agnostic: it re-exports the generated Prisma
// client and knows nothing about Nest, HTTP or the request lifecycle. Only
// apps/api imports it, and it never imports back.
//
// Your models arrive through prisma/schema/*.prisma; this file does not change
// when you add one.
export * from '@prisma/client';
