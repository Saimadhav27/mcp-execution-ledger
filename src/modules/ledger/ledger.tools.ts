import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import * as fs from 'fs';
import * as path from 'path';
import { LedgerRepository, type RecordExecutionInput } from './database/ledger.repository.js';

export class LedgerTools {
  private static readonly repository = new LedgerRepository();

  private static createSessionId(): string {
    const timestamp = Date.now().toString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    return `sess_${timestamp}_${randomSuffix}`;
  }

  @Tool({
    name: 'calculate',
    description: 'Perform basic arithmetic calculations',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The operation to perform'),
      a: z.number().describe('First number'),
      b: z.number().describe('Second number')
    }),
    examples: {
      request: {
        operation: 'add',
        a: 5,
        b: 3
      },
      response: {
        operation: 'add',
        a: 5,
        b: 3,
        result: 8,
        expression: '5 + 3 = 8'
      }
    }
  })
  @Widget('calculator-result')
  async calculate(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Performing calculation', {
      operation: input.operation,
      a: input.a,
      b: input.b
    });

    let result: number;
    let symbol: string;

    switch (input.operation) {
      case 'add':
        result = input.a + input.b;
        symbol = '+';
        break;
      case 'subtract':
        result = input.a - input.b;
        symbol = '-';
        break;
      case 'multiply':
        result = input.a * input.b;
        symbol = '×';
        break;
      case 'divide':
        if (input.b === 0) {
          throw new Error('Cannot divide by zero');
        }
        result = input.a / input.b;
        symbol = '÷';
        break;
      default:
        throw new Error('Invalid operation');
    }

    return {
      operation: input.operation,
      a: input.a,
      b: input.b,
      result,
      expression: `${input.a} ${symbol} ${input.b} = ${result}`
    };
  }

  @Tool({
    name: 'convert_temperature',
    description: 'Convert temperature units based on file content or direct input. Supports Celsius (C) and Fahrenheit (F).',
    inputSchema: z.object({
      file_name: z.string().describe('Name of the uploaded file'),
      file_type: z.string().describe('MIME type of the uploaded file'),
      file_content: z.string().describe('Base64 encoded file content. Will be injected by system.'),
      value: z.number().optional().describe('Temperature value to convert'),
      from_unit: z.enum(['C', 'F']).optional().describe('Unit to convert from (C or F)'),
      to_unit: z.enum(['C', 'F']).optional().describe('Unit to convert to (C or F)')
    })
  })
  async convertTemperature(input: any, ctx: ExecutionContext) {
    ctx.logger.info('Processing temperature file', {
      name: input.file_name,
      type: input.file_type,
      value: input.value,
      from: input.from_unit,
      to: input.to_unit
    });

    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, input.file_name);

    if (input.file_content) {
      try {
        const matches = input.file_content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let buffer: Buffer;

        if (matches && matches.length === 3) {
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(input.file_content, 'base64');
        }

        fs.writeFileSync(filePath, buffer);
        ctx.logger.info(`Saved file to ${filePath}`);
      } catch (error) {
        ctx.logger.error('Failed to save file', { error: error instanceof Error ? error.message : String(error) });
      }
    }

    const fileStats = {
      name: input.file_name,
      type: input.file_type,
      saved_path: filePath,
      status: 'saved'
    };

    let result: number | null = null;
    let message = `Successfully processed and saved file ${input.file_name}`;

    if (input.value !== undefined && input.from_unit && input.to_unit) {
      try {
        message += `. Converting ${input.value}°${input.from_unit} to ${input.to_unit}`;

        if (input.from_unit === input.to_unit) {
          result = input.value;
        } else if (input.from_unit === 'C' && input.to_unit === 'F') {
          result = (input.value * 9 / 5) + 32;
        } else if (input.from_unit === 'F' && input.to_unit === 'C') {
          result = (input.value - 32) * 5 / 9;
        } else {
          throw new Error('Unsupported unit conversion');
        }

        if (result !== null) {
          result = Math.round(result * 100) / 100;
          message += `. Result: ${result}°${input.to_unit}`;
        }
      } catch (error: any) {
        message += `. Conversion failed: ${error.message}`;
      }
    } else {
      message += '. No valid conversion parameters detected from manual input or file extraction.';
    }

    return {
      status: 'success',
      message,
      file_info: fileStats,
      conversion_result: result !== null ? { value: result, unit: input.to_unit } : null,
      original_value: input.value !== undefined ? { value: input.value, unit: input.from_unit } : null
    };
  }

  @Tool({
    name: 'start_session',
    description: 'Creates a new execution session and returns its metadata.',
    inputSchema: z.object({})
  })
  async startSession(input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Starting new execution session');

    try {
      const sessionId = LedgerTools.createSessionId();
      const startedAt = new Date().toISOString();
      const session = await LedgerTools.repository.createSession({ sessionId, startedAt });

      return {
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        executionCount: session.executionCount
      };
    } catch (error) {
      ctx.logger.error('Failed to start execution session', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'record_execution',
    description: 'Records a tool execution inside an existing execution session.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session to record into'),
      toolName: z.string().describe('The name of the tool that executed'),
      input: z.record(z.unknown()).describe('The input payload used for the execution'),
      output: z.record(z.unknown()).describe('The output payload generated by the execution'),
      status: z.enum(['success', 'failed']).describe('Whether the execution succeeded or failed')
    })
  })
  async recordExecution(input: RecordExecutionInput, ctx: ExecutionContext) {
    ctx.logger.info('Recording execution in session', { sessionId: input.sessionId, toolName: input.toolName });

    try {
      const execution = await LedgerTools.repository.recordExecution(input);

      return {
        executionId: execution.executionId,
        sessionId: input.sessionId,
        timestamp: execution.timestamp,
        toolName: input.toolName,
        status: input.status
      };
    } catch (error) {
      ctx.logger.error('Failed to record execution', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'create_checkpoint',
    description: 'Creates a checkpoint for an existing execution session.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session to checkpoint')
    })
  })
  async createCheckpoint(input: { sessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Creating checkpoint for session', { sessionId: input.sessionId });

    try {
      const checkpoint = await LedgerTools.repository.createCheckpoint(input.sessionId);

      return {
        checkpointId: checkpoint.checkpointId,
        sessionId: input.sessionId,
        executionCount: checkpoint.executionCount,
        timestamp: checkpoint.timestamp
      };
    } catch (error) {
      ctx.logger.error('Failed to create checkpoint', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'resume_session',
    description: 'Validates a session checkpoint and resumes from it.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session to resume'),
      checkpointId: z.string().describe('The checkpoint to resume from')
    })
  })
  async resumeSession(input: { sessionId: string; checkpointId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Resuming session from checkpoint', { sessionId: input.sessionId, checkpointId: input.checkpointId });

    try {
      return await LedgerTools.repository.resumeSession(input.sessionId, input.checkpointId);
    } catch (error) {
      ctx.logger.error('Failed to resume session', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'replay_session',
    description: 'Replays all executions for a session in chronological order.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session to replay')
    })
  })
  async replaySession(input: { sessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Replaying session executions', { sessionId: input.sessionId });

    try {
      return await LedgerTools.repository.replaySession(input.sessionId);
    } catch (error) {
      ctx.logger.error('Failed to replay session', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'get_session',
    description: 'Returns a summary of an existing execution session.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session to retrieve')
    })
  })
  async getSession(input: { sessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Retrieving session summary', { sessionId: input.sessionId });

    try {
      const session = await LedgerTools.repository.getSession(input.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${input.sessionId}`);
      }

      return {
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        executionCount: session.executionCount,
        checkpointCount: session.checkpoints.length,
        executionIds: session.executions.map((execution) => execution.executionId),
        checkpointIds: session.checkpoints.map((checkpoint) => checkpoint.checkpointId)
      };
    } catch (error) {
      ctx.logger.error('Failed to retrieve session', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'list_sessions',
    description: 'Lists all active sessions sorted by creation time.',
    inputSchema: z.object({})
  })
  async listSessions(input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Listing active sessions');

    try {
      const sessions = await LedgerTools.repository.listSessions();
      return sessions.map((session) => ({
        sessionId: session.sessionId,
        status: session.status,
        startedAt: session.startedAt,
        executionCount: session.executionCount,
        checkpointCount: session.checkpoints.length
      }));
    } catch (error) {
      ctx.logger.error('Failed to list sessions', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'export_session',
    description: 'Exports the full session payload as structured JSON for persistence.',
    inputSchema: z.object({
      sessionId: z.string().describe('The session to export')
    })
  })
  async exportSession(input: { sessionId: string }, ctx: ExecutionContext) {
    ctx.logger.info('Exporting session payload', { sessionId: input.sessionId });

    try {
      return await LedgerTools.repository.exportSession(input.sessionId);
    } catch (error) {
      ctx.logger.error('Failed to export session', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'ledger_dashboard',
    description: 'Returns system statistics along with the latest sessions and executions.',
    inputSchema: z.object({})
  })
  async ledgerDashboard(input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Generating ledger dashboard snapshot');

    try {
      const [statistics, recentSessions, recentExecutions] = await Promise.all([
        LedgerTools.repository.getStatistics(),
        LedgerTools.repository.getRecentSessions(10),
        LedgerTools.repository.getRecentExecutions(20)
      ]);

      return {
        statistics,
        recentSessions: recentSessions.map((session) => ({
          sessionId: session.sessionId,
          startedAt: session.startedAt,
          executionCount: session.executionCount,
          checkpointCount: session.checkpoints.length
        })),
        recentExecutions: recentExecutions.map((execution) => ({
          executionId: execution.executionId,
          timestamp: execution.timestamp,
          toolName: execution.toolName,
          status: execution.status
        }))
      };
    } catch (error) {
      ctx.logger.error('Failed to generate ledger dashboard', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  @Tool({
    name: 'ledger_status',
    description: 'Check whether the MCP Execution Ledger is running.',
    inputSchema: z.object({})
  })
  async ledgerStatus(input: Record<string, never>, ctx: ExecutionContext) {
    ctx.logger.info('Ledger status requested');

    return {
      project: 'MCP Execution Ledger',
      status: 'running',
      version: '0.1.0',
      timestamp: new Date().toISOString()
    };
  }
}
