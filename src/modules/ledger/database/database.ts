import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

export interface DatabaseConnection {
  db: sqlite3.Database;
  initialize: () => Promise<void>;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const databaseDir = path.join(os.tmpdir(), 'mcp-execution-ledger');
fs.mkdirSync(databaseDir, { recursive: true });

const databaseFilePath = path.join(databaseDir, 'ledger.db');

function resolveSchemaPath(): string {
  const candidates = [
    path.join(currentDir, 'schema.sql'),
    path.join(process.cwd(), 'src/modules/ledger/database/schema.sql'),
    path.join(process.cwd(), 'dist/modules/ledger/database/schema.sql'),
    path.join(currentDir, '../../../src/modules/ledger/database/schema.sql')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Could not locate schema.sql. Looked in: ${candidates.join(', ')}`);
}

const schemaPath = resolveSchemaPath();

const sqlite = sqlite3.verbose();

export const database = new sqlite.Database(databaseFilePath);

export async function initializeLedgerDatabase(): Promise<void> {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await new Promise<void>((resolve, reject) => {
    database.exec(schemaSql, (error: Error | null) => {
      if (error) {
        reject(new Error(`Failed to initialize SQLite schema: ${error.message}`));
        return;
      }

      resolve();
    });
  });
}

export const ledgerDatabase: DatabaseConnection = {
  db: database,
  initialize: initializeLedgerDatabase
};

void initializeLedgerDatabase().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
});
