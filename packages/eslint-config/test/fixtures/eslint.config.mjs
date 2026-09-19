import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';
import { defineConfig } from '../../index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// The fixture workspace's config. rootPath points at the fixture root because
// the fixtures are not under the real repo root; production consumers take the
// default, which is anchored to the monorepo root from the config's own location.
// `type: 'app-fixture'` also enables `boundaries/no-unknown` for apps/*/src,
// which is part of what is under test.
export default tseslint.config(
  ...defineConfig({ type: 'app-fixture', rootPath: HERE }),
);
