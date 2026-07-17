import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredPaths = [
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'dist', 'index.js'),
  path.join(rootDir, 'src', 'modules', 'ledger', 'database', 'schema.sql'),
  path.join(rootDir, 'dist', 'modules', 'ledger', 'database', 'schema.sql'),
  path.join(rootDir, 'src', 'widgets', 'widget-manifest.json'),
  path.join(rootDir, 'src', 'widgets', 'out')
];

for (const requiredPath of requiredPaths) {
  if (fs.existsSync(requiredPath)) {
    console.log(`OK ${requiredPath}`);
  } else {
    console.log(`MISSING ${requiredPath}`);
  }
}
