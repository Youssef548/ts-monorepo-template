#!/usr/bin/env node
// DATABASE_URL lives in two places: packages/database/.env (migrations) and
// apps/api/.env (runtime). If they disagree you migrate against one database and
// run against another, which fails silently. This runs before the migrate
// commands and refuses on mismatch.
//
// Absent .env files are not an error: CI has none and passes DATABASE_URL as a
// real environment variable instead.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  { name: 'packages/database/.env', path: resolve(root, 'packages/database/.env') },
  { name: 'apps/api/.env', path: resolve(root, 'apps/api/.env') },
];

function readDatabaseUrl(path) {
  let contents;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^DATABASE_URL\s*=\s*(.*)$/);
    if (match) return match[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

const found = targets
  .map((target) => ({ ...target, url: readDatabaseUrl(target.path) }))
  .filter((target) => target.url !== null);

// Fewer than two files means there is nothing to compare.
if (found.length < targets.length) process.exit(0);

const [first, ...rest] = found;
if (rest.some((target) => target.url !== first.url)) {
  console.error(
    'DATABASE_URL mismatch — migrating here would touch a different database than the API uses:\n',
  );
  for (const target of found) console.error(`  ${target.name}\n    ${target.url}`);
  console.error('\nAlign them, or override DATABASE_URL in the environment for this command.');
  process.exit(1);
}
