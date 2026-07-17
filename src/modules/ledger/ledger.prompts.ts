import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';
import { LedgerRepository } from './database/ledger.repository.js';

export class LedgerPrompts {
  private readonly repository = new LedgerRepository();

  @Prompt({
    name: 'calculator_help',
    description: 'Get help with calculator operations',
    arguments: [
      {
        name: 'operation',
        description: 'The operation to get help with (optional)',
        required: false
      }
    ]
  })
  async getHelp(args: any, ctx: ExecutionContext) {
    ctx.logger.info('Generating calculator help prompt');

    const operation = args.operation;

    if (operation) {
      const helpText = this.getOperationHelp(operation);
      return [
        {
          role: 'user' as const,
          content: `How do I use the ${operation} operation in the calculator?`
        },
        {
          role: 'assistant' as const,
          content: helpText
        }
      ];
    }

    return [
      {
        role: 'user' as const,
        content: 'How do I use the calculator?'
      },
      {
        role: 'assistant' as const,
        content: `The calculator supports four basic operations:

1. **Addition** - Add two numbers together
   Example: calculate(operation="add", a=5, b=3) = 8

2. **Subtraction** - Subtract one number from another
   Example: calculate(operation="subtract", a=10, b=4) = 6

3. **Multiplication** - Multiply two numbers
   Example: calculate(operation="multiply", a=6, b=7) = 42

4. **Division** - Divide one number by another
   Example: calculate(operation="divide", a=20, b=5) = 4

Just call the 'calculate' tool with the operation and two numbers!`
      }
    ];
  }

  @Prompt({
    name: 'summarize_session',
    description: 'Summarize the execution history of a session into a concise timeline.',
    arguments: [
      {
        name: 'sessionId',
        description: 'The session identifier to inspect',
        required: true
      }
    ]
  })
  async summarizeSession(args: { sessionId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating session summary prompt', { sessionId: args.sessionId });

    const session = await this.repository.getSession(args.sessionId ?? '');
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const timeline = session.executions
      .slice()
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .map((execution, index) => `${index + 1}. ${new Date(execution.timestamp).toLocaleString()} - ${execution.toolName} (${execution.status})`)
      .join('\n');

    return [
      {
        role: 'user' as const,
        content: `Summarize the execution history for session ${session.sessionId}.`
      },
      {
        role: 'assistant' as const,
        content: `Session ${session.sessionId} started at ${session.startedAt}.\n\nTimeline:\n${timeline || 'No executions recorded yet.'}`
      }
    ];
  }

  @Prompt({
    name: 'replay_analysis',
    description: 'Explain the execution flow of a session step-by-step.',
    arguments: [
      {
        name: 'sessionId',
        description: 'The session identifier to inspect',
        required: true
      }
    ]
  })
  async replayAnalysis(args: { sessionId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating replay analysis prompt', { sessionId: args.sessionId });

    const session = await this.repository.getSession(args.sessionId ?? '');
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const steps = session.executions
      .slice()
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
      .map((execution, index) => `${index + 1}. ${execution.toolName} -> ${execution.status}`)
      .join('\n');

    return [
      {
        role: 'user' as const,
        content: `Explain the execution flow for session ${session.sessionId}.`
      },
      {
        role: 'assistant' as const,
        content: `The session began at ${session.startedAt} and progressed through the following steps:\n\n${steps || 'No executions recorded yet.'}`
      }
    ];
  }

  @Prompt({
    name: 'failure_analysis',
    description: 'Analyze failed executions and suggest likely causes.',
    arguments: [
      {
        name: 'sessionId',
        description: 'The session identifier to inspect',
        required: true
      }
    ]
  })
  async failureAnalysis(args: { sessionId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating failure analysis prompt', { sessionId: args.sessionId });

    const session = await this.repository.getSession(args.sessionId ?? '');
    if (!session) {
      throw new Error(`Session not found: ${args.sessionId}`);
    }

    const failures = session.executions.filter((execution) => execution.status === 'failed');
    const likelyCauses = failures.length > 0
      ? failures.map((execution) => `- ${execution.toolName}: verify tool input, dependencies, and recent schema changes`).join('\n')
      : '- No failed executions were recorded in this session.';

    return [
      {
        role: 'user' as const,
        content: `Analyze the failed executions in session ${session.sessionId}.`
      },
      {
        role: 'assistant' as const,
        content: `Session ${session.sessionId} contains ${failures.length} failed execution(s).\n\nLikely causes:\n${likelyCauses}`
      }
    ];
  }

  @Prompt({
    name: 'checkpoint_summary',
    description: 'Summarize the contents of a checkpoint.',
    arguments: [
      {
        name: 'checkpointId',
        description: 'The checkpoint identifier to inspect',
        required: true
      }
    ]
  })
  async checkpointSummary(args: { checkpointId?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Generating checkpoint summary prompt', { checkpointId: args.checkpointId });

    const checkpoint = await this.repository.getCheckpoint(args.checkpointId ?? '');
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${args.checkpointId}`);
    }

    return [
      {
        role: 'user' as const,
        content: `Summarize checkpoint ${checkpoint.checkpointId}.`
      },
      {
        role: 'assistant' as const,
        content: `Checkpoint ${checkpoint.checkpointId} was created at ${checkpoint.timestamp} and captures ${checkpoint.executionCount} execution(s). It includes ${checkpoint.executionIds.length} recorded execution identifier(s).`
      }
    ];
  }

  private getOperationHelp(operation: string): string {
    const helps: Record<string, string> = {
      add: 'Use addition to sum two numbers. Call calculate(operation="add", a=5, b=3) to get 8.',
      subtract: 'Use subtraction to find the difference. Call calculate(operation="subtract", a=10, b=4) to get 6.',
      multiply: 'Use multiplication to find the product. Call calculate(operation="multiply", a=6, b=7) to get 42.',
      divide: 'Use division to find the quotient. Call calculate(operation="divide", a=20, b=5) = 4. Note: Cannot divide by zero!'
    };

    return helps[operation] || 'Unknown operation. Available operations: add, subtract, multiply, divide.';
  }
}

