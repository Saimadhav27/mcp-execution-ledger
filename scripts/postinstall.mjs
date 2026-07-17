import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const directory of ['data', 'uploads', 'logs', 'tmp']) {
  fs.mkdirSync(path.join(rootDir, directory), { recursive: true });
}
console.log('Created deployment runtime directories');
