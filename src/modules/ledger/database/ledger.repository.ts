import { ledgerDatabase } from './database.js';

export interface ExecutionRecord {
  executionId: string;
  timestamp: string;
  toolName: string;
  input: unknown;
  output: unknown;
  status: 'success' | 'failed';
}

export interface Checkpoint {
  checkpointId: string;
  timestamp: string;
  executionCount: number;
  executionIds: string[];
}

export interface ExecutionSession {
  sessionId: string;
  status: 'active';
  startedAt: string;
  executionCount: number;
  checkpoints: Checkpoint[];
  executions: ExecutionRecord[];
}

export interface LedgerStatistics {
  totalSessions: number;
  totalExecutions: number;
  totalCheckpoints: number;
  successRate: number;
  failureRate: number;
  latestSession: { sessionId: string; startedAt: string; executionCount: number } | null;
}

interface SessionRow {
  sessionId: string;
  status: string;
  startedAt: string;
  executionCount: number;
}

interface ExecutionRow {
  executionId: string;
  sessionId: string;
  timestamp: string;
  toolName: string;
  input: string;
  output: string;
  status: 'success' | 'failed';
}

interface CheckpointRow {
  checkpointId: string;
  sessionId: string;
  timestamp: string;
  executionCount: number;
  executionIds: string;
}

export interface CreateSessionInput {
  sessionId: string;
  startedAt: string;
}

export interface RecordExecutionInput {
  sessionId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: 'success' | 'failed';
}

export class LedgerRepository {
  private static readonly database = ledgerDatabase.db;
  private static initializationPromise: Promise<void> | null = null;

  private static async ensureReady(): Promise<void> {
    if (!LedgerRepository.initializationPromise) {
      LedgerRepository.initializationPromise = ledgerDatabase.initialize();
    }

    await LedgerRepository.initializationPromise;
  }

  private static async run(statement: string, params: Array<string | number | null>): Promise<void> {
    await LedgerRepository.ensureReady();

    return new Promise<void>((resolve, reject) => {
      LedgerRepository.database.run(statement, params, (error: Error | null) => {
        if (error) {
          reject(new Error(`Database operation failed: ${error.message}`));
          return;
        }

        resolve();
      });
    });
  }

  private static async get<T>(statement: string, params: Array<string | number | null>): Promise<T | undefined> {
    await LedgerRepository.ensureReady();

    return new Promise<T | undefined>((resolve, reject) => {
      LedgerRepository.database.get(statement, params, (error: Error | null, row: T | undefined) => {
        if (error) {
          reject(new Error(`Database query failed: ${error.message}`));
          return;
        }

        resolve(row);
      });
    });
  }

  private static async all<T>(statement: string, params: Array<string | number | null>): Promise<T[]> {
    await LedgerRepository.ensureReady();

    return new Promise<T[]>((resolve, reject) => {
      LedgerRepository.database.all(statement, params, (error: Error | null, rows: T[]) => {
        if (error) {
          reject(new Error(`Database query failed: ${error.message}`));
          return;
        }

        resolve(rows);
      });
    });
  }

  private static parseJson<T>(value: string, context: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      throw new Error(`Failed to parse ${context}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static validateId(value: string, kind: string): string {
    const normalized = value?.trim();
    if (!normalized) {
      throw new Error(`${kind} must be a non-empty string`);
    }

    return normalized;
  }

  async createSession(input: CreateSessionInput): Promise<ExecutionSession> {
    const session: ExecutionSession = {
      sessionId: LedgerRepository.validateId(input.sessionId, 'Session ID'),
      status: 'active',
      startedAt: input.startedAt || new Date().toISOString(),
      executionCount: 0,
      checkpoints: [],
      executions: []
    };

    try {
      await LedgerRepository.run(
        'INSERT INTO sessions (sessionId, status, startedAt, executionCount) VALUES (?, ?, ?, ?)',
        [session.sessionId, session.status, session.startedAt, session.executionCount]
      );
      return session;
    } catch (error) {
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSession(sessionId: string): Promise<ExecutionSession | undefined> {
    const normalizedSessionId = LedgerRepository.validateId(sessionId, 'Session ID');

    try {
      const sessionRow = await LedgerRepository.get<SessionRow>(
        'SELECT sessionId, status, startedAt, executionCount FROM sessions WHERE sessionId = ?',
        [normalizedSessionId]
      );

      if (!sessionRow) {
        return undefined;
      }

      const executions = await LedgerRepository.all<ExecutionRow>(
        'SELECT executionId, sessionId, timestamp, toolName, input, output, status FROM executions WHERE sessionId = ? ORDER BY timestamp ASC',
        [normalizedSessionId]
      );
      const checkpoints = await LedgerRepository.all<CheckpointRow>(
        'SELECT checkpointId, sessionId, timestamp, executionCount, executionIds FROM checkpoints WHERE sessionId = ? ORDER BY timestamp ASC',
        [normalizedSessionId]
      );

      return {
        sessionId: sessionRow.sessionId,
        status: sessionRow.status as 'active',
        startedAt: sessionRow.startedAt,
        executionCount: sessionRow.executionCount,
        checkpoints: checkpoints.map((checkpoint) => ({
          checkpointId: checkpoint.checkpointId,
          timestamp: checkpoint.timestamp,
          executionCount: checkpoint.executionCount,
          executionIds: LedgerRepository.parseJson<string[]>(checkpoint.executionIds, 'checkpoint executionIds')
        })),
        executions: executions.map((execution) => ({
          executionId: execution.executionId,
          timestamp: execution.timestamp,
          toolName: execution.toolName,
          input: LedgerRepository.parseJson<unknown>(execution.input, 'execution input'),
          output: LedgerRepository.parseJson<unknown>(execution.output, 'execution output'),
          status: execution.status
        }))
      };
    } catch (error) {
      throw new Error(`Failed to read session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async listSessions(): Promise<ExecutionSession[]> {
    try {
      const sessionRows = await LedgerRepository.all<SessionRow>(
        'SELECT sessionId, status, startedAt, executionCount FROM sessions ORDER BY startedAt DESC',
        []
      );

      const sessions = await Promise.all(sessionRows.map(async (sessionRow) => this.getSession(sessionRow.sessionId)));
      return sessions.filter((session): session is ExecutionSession => session !== undefined);
    } catch (error) {
      throw new Error(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getRecentSessions(limit = 10): Promise<ExecutionSession[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 50));

    try {
      const sessionRows = await LedgerRepository.all<SessionRow>(
        'SELECT sessionId, status, startedAt, executionCount FROM sessions ORDER BY startedAt DESC LIMIT ?',
        [normalizedLimit]
      );

      const sessions = await Promise.all(sessionRows.map(async (sessionRow) => this.getSession(sessionRow.sessionId)));
      return sessions.filter((session): session is ExecutionSession => session !== undefined);
    } catch (error) {
      throw new Error(`Failed to load recent sessions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getRecentExecutions(limit = 20): Promise<ExecutionRecord[]> {
    const normalizedLimit = Math.max(1, Math.min(limit, 100));

    try {
      const executionRows = await LedgerRepository.all<ExecutionRow>(
        'SELECT executionId, sessionId, timestamp, toolName, input, output, status FROM executions ORDER BY timestamp DESC LIMIT ?',
        [normalizedLimit]
      );

      return executionRows.map((execution) => ({
        executionId: execution.executionId,
        timestamp: execution.timestamp,
        toolName: execution.toolName,
        input: LedgerRepository.parseJson<unknown>(execution.input, 'execution input'),
        output: LedgerRepository.parseJson<unknown>(execution.output, 'execution output'),
        status: execution.status
      }));
    } catch (error) {
      throw new Error(`Failed to load recent executions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async recordExecution(input: RecordExecutionInput): Promise<ExecutionRecord> {
    const normalizedSessionId = LedgerRepository.validateId(input.sessionId, 'Session ID');
    const existingSession = await this.getSession(normalizedSessionId);
    if (!existingSession) {
      throw new Error(`Session not found: ${normalizedSessionId}`);
    }

    const executionId = `exec_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = new Date().toISOString();
    const execution: ExecutionRecord = {
      executionId,
      timestamp,
      toolName: LedgerRepository.validateId(input.toolName, 'Tool name'),
      input: input.input,
      output: input.output,
      status: input.status
    };

    try {
      await LedgerRepository.run(
        'INSERT INTO executions (executionId, sessionId, timestamp, toolName, input, output, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          execution.executionId,
          normalizedSessionId,
          execution.timestamp,
          execution.toolName,
          JSON.stringify(execution.input),
          JSON.stringify(execution.output),
          execution.status
        ]
      );

      await LedgerRepository.run(
        'UPDATE sessions SET executionCount = executionCount + 1 WHERE sessionId = ?',
        [normalizedSessionId]
      );

      return execution;
    } catch (error) {
      throw new Error(`Failed to record execution: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createCheckpoint(sessionId: string): Promise<Checkpoint> {
    const normalizedSessionId = LedgerRepository.validateId(sessionId, 'Session ID');
    const session = await this.getSession(normalizedSessionId);
    if (!session) {
      throw new Error(`Session not found: ${normalizedSessionId}`);
    }

    const checkpoint: Checkpoint = {
      checkpointId: `cp_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
      executionCount: session.executionCount,
      executionIds: session.executions.map((execution) => execution.executionId)
    };

    try {
      await LedgerRepository.run(
        'INSERT INTO checkpoints (checkpointId, sessionId, timestamp, executionCount, executionIds) VALUES (?, ?, ?, ?, ?)',
        [checkpoint.checkpointId, normalizedSessionId, checkpoint.timestamp, checkpoint.executionCount, JSON.stringify(checkpoint.executionIds)]
      );
      return checkpoint;
    } catch (error) {
      throw new Error(`Failed to create checkpoint: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getCheckpoint(checkpointId: string): Promise<Checkpoint | undefined> {
    const normalizedCheckpointId = LedgerRepository.validateId(checkpointId, 'Checkpoint ID');

    try {
      const checkpointRow = await LedgerRepository.get<CheckpointRow>(
        'SELECT checkpointId, sessionId, timestamp, executionCount, executionIds FROM checkpoints WHERE checkpointId = ?',
        [normalizedCheckpointId]
      );

      if (!checkpointRow) {
        return undefined;
      }

      return {
        checkpointId: checkpointRow.checkpointId,
        timestamp: checkpointRow.timestamp,
        executionCount: checkpointRow.executionCount,
        executionIds: LedgerRepository.parseJson<string[]>(checkpointRow.executionIds, 'checkpoint executionIds')
      };
    } catch (error) {
      throw new Error(`Failed to read checkpoint: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async resumeSession(sessionId: string, checkpointId: string): Promise<{ sessionId: string; checkpointId: string; resumedExecutionCount: number; status: 'resumed' }> {
    const normalizedSessionId = LedgerRepository.validateId(sessionId, 'Session ID');
    const normalizedCheckpointId = LedgerRepository.validateId(checkpointId, 'Checkpoint ID');

    const session = await this.getSession(normalizedSessionId);
    if (!session) {
      throw new Error(`Session not found: ${normalizedSessionId}`);
    }

    const checkpoint = await LedgerRepository.get<CheckpointRow>(
      'SELECT checkpointId, sessionId, timestamp, executionCount, executionIds FROM checkpoints WHERE sessionId = ? AND checkpointId = ?',
      [normalizedSessionId, normalizedCheckpointId]
    );

    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${normalizedCheckpointId}`);
    }

    return {
      sessionId: normalizedSessionId,
      checkpointId: normalizedCheckpointId,
      resumedExecutionCount: checkpoint.executionCount,
      status: 'resumed'
    };
  }

  async replaySession(sessionId: string): Promise<{ sessionId: string; executionCount: number; executions: Array<{ executionId: string; timestamp: string; toolName: string; status: 'success' | 'failed' }> }> {
    const normalizedSessionId = LedgerRepository.validateId(sessionId, 'Session ID');
    const session = await this.getSession(normalizedSessionId);
    if (!session) {
      throw new Error(`Session not found: ${normalizedSessionId}`);
    }

    return {
      sessionId: normalizedSessionId,
      executionCount: session.executions.length,
      executions: session.executions
        .slice()
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
        .map((execution) => ({
          executionId: execution.executionId,
          timestamp: execution.timestamp,
          toolName: execution.toolName,
          status: execution.status
        }))
    };
  }

  async exportSession(sessionId: string): Promise<{ session: ExecutionSession }> {
    const normalizedSessionId = LedgerRepository.validateId(sessionId, 'Session ID');
    const session = await this.getSession(normalizedSessionId);
    if (!session) {
      throw new Error(`Session not found: ${normalizedSessionId}`);
    }

    return {
      session
    };
  }

  async getStatistics(): Promise<LedgerStatistics> {
    try {
      const [sessionCountRow, executionCountRow, checkpointCountRow, successCountRow, failureCountRow, latestSessionRow] = await Promise.all([
        LedgerRepository.get<{ count: number }>('SELECT COUNT(*) AS count FROM sessions', []),
        LedgerRepository.get<{ count: number }>('SELECT COUNT(*) AS count FROM executions', []),
        LedgerRepository.get<{ count: number }>('SELECT COUNT(*) AS count FROM checkpoints', []),
        LedgerRepository.get<{ count: number }>('SELECT COUNT(*) AS count FROM executions WHERE status = ?', ['success']),
        LedgerRepository.get<{ count: number }>('SELECT COUNT(*) AS count FROM executions WHERE status = ?', ['failed']),
        LedgerRepository.get<SessionRow>('SELECT sessionId, startedAt, executionCount FROM sessions ORDER BY startedAt DESC LIMIT 1', [])
      ]);

      const totalExecutions = executionCountRow?.count ?? 0;
      const successCount = successCountRow?.count ?? 0;
      const failureCount = failureCountRow?.count ?? 0;
      const successRate = totalExecutions === 0 ? 0 : Number(((successCount / totalExecutions) * 100).toFixed(2));
      const failureRate = totalExecutions === 0 ? 0 : Number(((failureCount / totalExecutions) * 100).toFixed(2));

      return {
        totalSessions: sessionCountRow?.count ?? 0,
        totalExecutions,
        totalCheckpoints: checkpointCountRow?.count ?? 0,
        successRate,
        failureRate,
        latestSession: latestSessionRow
          ? {
              sessionId: latestSessionRow.sessionId,
              startedAt: latestSessionRow.startedAt,
              executionCount: latestSessionRow.executionCount
            }
          : null
      };
    } catch (error) {
      throw new Error(`Failed to read ledger statistics: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
