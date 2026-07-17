# MCP Execution Ledger

A durable NitroStack MCP server that records execution sessions, checkpoints, and replay history in SQLite while keeping the existing tool APIs intact.

## Architecture Diagram

```text
Client / MCP Host
      │
      ▼
NitroStack MCP Server
      │
      ├── Ledger Tools
      │     ├── start_session
      │     ├── record_execution
      │     ├── create_checkpoint
      │     ├── resume_session
      │     ├── replay_session
      │     ├── get_session
      │     ├── list_sessions
      │     ├── export_session
      │     └── ledger_dashboard
      │
      ├── Ledger Resources
      │     ├── ledger://sessions
      │     ├── ledger://session/{sessionId}
      │     └── ledger://checkpoint/{checkpointId}
      │
      ├── Ledger Prompts
      │     ├── summarize_session
      │     ├── replay_analysis
      │     ├── failure_analysis
      │     └── checkpoint_summary
      │
      └── SQLite Repository
            ├── sessions
            ├── executions
            └── checkpoints
```

## Folder Structure

```text
src/
  app.module.ts
  index.ts
  health/
  modules/
    ledger/
      database/
        database.ts
        ledger.repository.ts
        schema.sql
      ledger.module.ts
      ledger.prompts.ts
      ledger.resources.ts
      ledger.tools.ts
  widgets/
```

## Installation

```bash
npm install
```

## Running

```bash
npm run build
npm start
```

## Available Tools

- start_session
- record_execution
- create_checkpoint
- resume_session
- replay_session
- get_session
- list_sessions
- export_session
- ledger_dashboard
- ledger_status

## Resources

- ledger://sessions
- ledger://session/{sessionId}
- ledger://checkpoint/{checkpointId}

## Prompts

- summarize_session
- replay_analysis
- failure_analysis
- checkpoint_summary

## SQLite Schema

The repository uses three tables:

```sql
CREATE TABLE sessions (
  sessionId TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  executionCount INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE executions (
  executionId TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  toolName TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(sessionId) REFERENCES sessions(sessionId)
);

CREATE TABLE checkpoints (
  checkpointId TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  executionCount INTEGER NOT NULL,
  executionIds TEXT NOT NULL,
  FOREIGN KEY(sessionId) REFERENCES sessions(sessionId)
);
```

## Example MCP Calls

```json
{
  "tool": "start_session",
  "arguments": {}
}
```

```json
{
  "tool": "record_execution",
  "arguments": {
    "sessionId": "sess_123",
    "toolName": "search_documents",
    "input": { "query": "ledger" },
    "output": { "results": 3 },
    "status": "success"
  }
}
```

```json
{
  "tool": "ledger_dashboard",
  "arguments": {}
}
```

## Demo Flow

1. Start a session with start_session.
2. Record one or more executions with record_execution.
3. Create a checkpoint with create_checkpoint.
4. Replay the flow with replay_session.
5. Inspect the stored data through the resources or prompts.
6. Review the dashboard with ledger_dashboard.
