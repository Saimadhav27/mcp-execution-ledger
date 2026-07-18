import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

export interface DatabaseConnection {
  db: sqlite3.Database;
  initialize: () => Promise<void>;
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(currentDir, '../../../..');
const sqlite = sqlite3.verbose();

let initializationPromise: Promise<void> | null = null;
let initializationError: Error | null = null;
let databasePath = ':memory:';
let databaseConnection!: sqlite3.Database;

function getConfiguredPathCandidates(): string[] {
  const configuredValues = [
    process.env.LEDGER_DB_PATH,
    process.env.NITROSTACK_DB_PATH,
    process.env.LEDGER_DATA_DIR,
    process.env.NITROSTACK_DATA_DIR
  ].filter((value): value is string => Boolean(value && value.trim()));

  return configuredValues.flatMap((value) => {
    const normalized = value.trim();
    if (normalized.toLowerCase().endsWith('.db')) {
      return [normalized];
    }

    return [path.join(normalized, 'ledger.db')];
  });
}

function createDirectoryIfPossible(directoryPath: string): string | null {
  try {
    fs.mkdirSync(directoryPath, { recursive: true });
    return directoryPath;
  } catch {
    return null;
  }
}

function pickWritableDirectory(candidates: string[]): string {
  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    const createdDirectory = createDirectoryIfPossible(resolved);
    if (!createdDirectory) {
      continue;
    }

    try {
      const probeFile = path.join(createdDirectory, '.write-test');
      fs.writeFileSync(probeFile, '');
      fs.unlinkSync(probeFile);
      return createdDirectory;
    } catch {
      // Try the next candidate.
    }
  }

  return path.join(os.tmpdir(), 'mcp-execution-ledger');
}

function getDatabaseFilePath(): string {
  const configuredCandidates = getConfiguredPathCandidates();
  const preferredCandidates = configuredCandidates.length > 0
    ? configuredCandidates
    : [path.join(packageRoot, 'data', 'ledger.db'), path.join(os.tmpdir(), 'mcp-execution-ledger', 'ledger.db')];

  const databaseDirectory = pickWritableDirectory(preferredCandidates.map((candidate) => candidate.endsWith('.db') ? path.dirname(candidate) : candidate));
  const resolvedPath = preferredCandidates[0]?.endsWith('.db')
    ? preferredCandidates[0]
    : path.join(databaseDirectory, 'ledger.db');

  return path.resolve(resolvedPath);
}

function resolveSchemaPath(): string | null {
  const candidates = [
    path.join(currentDir, 'schema.sql'),
    path.join(packageRoot, 'src', 'modules', 'ledger', 'database', 'schema.sql'),
    path.join(packageRoot, 'dist', 'modules', 'ledger', 'database', 'schema.sql')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function executeSchema(connection: sqlite3.Database, schemaSql: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    connection.exec(schemaSql, (error: Error | null) => {
      if (error) {
        reject(new Error(`Failed to initialize SQLite schema: ${error.message}`));
        return;
      }

      resolve();
    });
  });
}

export function getLedgerDataDirectory(): string {
  return path.dirname(getDatabaseFilePath());
}

export function getLedgerDatabasePath(): string {
  return getDatabaseFilePath();
}

/**
 * Returns the last recorded initialization error, if any. Consumers (e.g. the
 * repository) can surface this through normal error channels instead of
 * logging — this module MUST NOT write to stdout/stderr because it loads while
 * STDIO carries the MCP JSON-RPC stream.
 */
export function getLedgerInitializationError(): Error | null {
  return initializationError;
}

const schemaPath = resolveSchemaPath();

export let database = databaseConnection;

export async function initializeLedgerDatabase(): Promise<void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const targetPath = getDatabaseFilePath();
    databasePath = targetPath;

    try {
      if (targetPath !== ':memory:') {

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      }
      databaseConnection = new sqlite.Database(targetPath);
      database = databaseConnection;
      if (schemaPath) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        await executeSchema(databaseConnection, schemaSql);
      }
      // NOTE: never console.* here — STDIO carries the JSON-RPC stream and any
      // stdout/stderr write corrupts the MCP connection.

      initializationError = null;
    } catch (error) {
      const fallbackPath = ':memory:';
      try {
        databaseConnection = new sqlite.Database(fallbackPath);
        database = databaseConnection;
        databasePath = fallbackPath;

        if (schemaPath) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          await executeSchema(databaseConnection, schemaSql);
        }

        // Fell back to in-memory storage — no console output; STDIO is reserved
        // for the JSON-RPC protocol stream.
        initializationError = null;
      } catch (fallbackError) {
        // Record the failure on the module-level variable instead of logging.
        initializationError = new Error(`Ledger database initialization failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  })();

  return initializationPromise;
}

export const ledgerDatabase: DatabaseConnection = {
  get db() {
    return database;
  },
  initialize: initializeLedgerDatabase
};

void initializeLedgerDatabase().catch((error: unknown) => {
  // Swallow — the failure is already captured in `initializationError` and is
  // surfaced through repository errors. Logging here would corrupt STDIO.
  initializationError = error instanceof Error ? error : new Error(String(error));
});
