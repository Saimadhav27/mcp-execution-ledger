import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { LedgerRepository } from './database/ledger.repository.js';

export class LedgerResources {
  private readonly repository = new LedgerRepository();

  @Resource({
    uri: 'calculator://operations',
    name: 'Calculator Operations',
    description: 'List of available calculator operations',
    mimeType: 'application/json',
    examples: {
      response: {
        operations: [
          { name: 'add', symbol: '+', description: 'Addition' },
          { name: 'subtract', symbol: '-', description: 'Subtraction' },
          { name: 'multiply', symbol: '×', description: 'Multiplication' },
          { name: 'divide', symbol: '÷', description: 'Division' }
        ]
      }
    }
  })
  async getOperations(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching calculator operations');

    const operations = [
      {
        name: 'add',
        symbol: '+',
        description: 'Addition',
        example: '5 + 3 = 8'
      },
      {
        name: 'subtract',
        symbol: '-',
        description: 'Subtraction',
        example: '10 - 4 = 6'
      },
      {
        name: 'multiply',
        symbol: '×',
        description: 'Multiplication',
        example: '6 × 7 = 42'
      },
      {
        name: 'divide',
        symbol: '÷',
        description: 'Division',
        example: '20 ÷ 5 = 4'
      }
    ];

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify({ operations }, null, 2)
      }]
    };
  }

  @Resource({
    uri: 'ledger://sessions',
    name: 'All Ledger Sessions',
    description: 'Returns every session stored in the SQLite ledger',
    mimeType: 'application/json'
  })
  async getAllSessions(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching all ledger sessions');

    try {
      const sessions = await this.repository.listSessions();
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ sessions }, null, 2)
        }]
      };
    } catch (error) {
      ctx.logger.error('Failed to load ledger sessions resource', { error: error instanceof Error ? error.message : String(error) });
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }]
      };
    }
  }

  @Resource({
    uri: 'ledger://session/{sessionId}',
    name: 'Ledger Session',
    description: 'Returns the complete session payload for a specific session',
    mimeType: 'application/json'
  })
  async getSessionResource(uri: string, ctx: ExecutionContext) {
    const sessionId = this.extractPathValue(uri, 'ledger://session/');
    ctx.logger.info('Fetching ledger session resource', { sessionId });

    try {
      const session = await this.repository.getSession(sessionId);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ session }, null, 2)
        }]
      };
    } catch (error) {
      ctx.logger.error('Failed to load ledger session resource', { error: error instanceof Error ? error.message : String(error) });
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }]
      };
    }
  }

  @Resource({
    uri: 'ledger://checkpoint/{checkpointId}',
    name: 'Ledger Checkpoint',
    description: 'Returns checkpoint details for a specific checkpoint',
    mimeType: 'application/json'
  })
  async getCheckpointResource(uri: string, ctx: ExecutionContext) {
    const checkpointId = this.extractPathValue(uri, 'ledger://checkpoint/');
    ctx.logger.info('Fetching ledger checkpoint resource', { checkpointId });

    try {
      const checkpoint = await this.repository.getCheckpoint(checkpointId);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ checkpoint }, null, 2)
        }]
      };
    } catch (error) {
      ctx.logger.error('Failed to load ledger checkpoint resource', { error: error instanceof Error ? error.message : String(error) });
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)
        }]
      };
    }
  }

  private extractPathValue(uri: string, prefix: string): string {
    if (!uri.startsWith(prefix)) {
      throw new Error(`Unsupported ledger resource URI: ${uri}`);
    }

    return decodeURIComponent(uri.slice(prefix.length));
  }
}

