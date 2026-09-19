import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // One file per model, not one giant schema. See prisma/schema/README.md.
  schema: 'prisma/schema',
  migrations: { path: 'prisma/migrations' },
});
