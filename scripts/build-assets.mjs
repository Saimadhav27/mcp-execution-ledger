import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const runtimeDistDir = path.join(distDir, 'modules', 'ledger', 'database');

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  const targetStats = fs.statSync(targetPath);
  if (targetStats.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
}

function copyRecursive(source, destination) {
  if (!fs.existsSync(source)) {
    return;
  }

  const sourceStats = fs.statSync(source);
  if (sourceStats.isFile()) {
    removeIfExists(destination);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    return;
  }

  removeIfExists(destination);
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

const assetsToCopy = [
  ['modules/ledger/database/schema.sql', path.join(runtimeDistDir, 'schema.sql')],
  ['widgets/widget-manifest.json', path.join(distDir, 'widgets', 'widget-manifest.json')],
  ['widgets/out', path.join(distDir, 'widgets', 'out')]
];

for (const [sourceRelative, destinationPath] of assetsToCopy) {
  const sourcePath = path.join(srcDir, sourceRelative);
  copyRecursive(sourcePath, destinationPath);
}

console.log('Copied deployment assets to dist');
