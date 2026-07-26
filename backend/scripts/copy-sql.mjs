// tsc does not emit non-TS assets; the schema files must reach dist/db.
import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(backendRoot, 'src', 'db');
const target = join(backendRoot, 'dist', 'db');

await mkdir(target, { recursive: true });
for (const file of ['schema.sql', 'schema.postgres.sql']) {
  await cp(join(source, file), join(target, file));
}
console.log('Copied SQL schema files to dist/db');
