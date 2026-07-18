# MCP Execution Ledger

> **A Black Box Recorder for AI Agents Built on the Model Context Protocol (MCP)**

![MCP](https://img.shields.io/badge/Model%20Context%20Protocol-MCP-blue)
![NitroStack](https://img.shields.io/badge/Built%20with-NitroStack-success)
![Status](https://img.shields.io/badge/Status-Live-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

---

## Overview

MCP Execution Ledger is a durable execution layer for AI agents built using the Model Context Protocol (MCP).

As AI agents interact with databases, APIs, file systems, and external tools, understanding what happened during execution becomes increasingly difficult. Existing systems provide logs, but they don't provide a complete execution history of MCP tool interactions.

MCP Execution Ledger solves this problem by recording every MCP execution in a centralized ledger, enabling developers to trace, replay, inspect, and audit AI workflows.

Think of it as a **black box recorder for AI agents**.

---

# Problem Statement

Modern AI agents perform complex workflows involving multiple MCP tools.

When an execution fails or produces unexpected results, developers often cannot answer questions such as:

- Which tool was called?
- What was the input?
- What output was returned?
- Which step failed?
- Can the execution be replayed?
- Has anything been modified?

Without complete execution visibility, debugging and auditing become difficult.

---

# Our Solution

MCP Execution Ledger records every MCP interaction including:

- Tool Invocations
- Inputs & Outputs
- Execution Status
- Timestamps
- Checkpoints
- Replay History
- Session Metadata

This enables complete execution traceability and operational transparency.

---

# Key Features

- Complete execution history
- Session management
- Execution checkpoints
- Workflow replay
- Immutable execution records
- SQLite-backed ledger
- MCP-native architecture
- NitroStack deployment
- Audit-ready execution logs
- Lightweight and extensible

---

# Architecture

```text
Client / MCP Host
        │
        ▼
NitroStack MCP Server
        │
        ├── Ledger Tools
        │
        ├── Ledger Resources
        │
        ├── Ledger Prompts
        │
        ▼
SQLite Execution Ledger
```

---

# Available MCP Tools

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

---

# Resources

- ledger://sessions
- ledger://session/{sessionId}
- ledger://checkpoint/{checkpointId}

---

# Prompts

- summarize_session
- replay_analysis
- failure_analysis
- checkpoint_summary

---

# Demo Workflow

1. Start an execution session.
2. Record every MCP tool execution.
3. Create execution checkpoints.
4. Replay previous executions.
5. Analyze execution history.
6. View analytics through the dashboard.

---

# Tech Stack

- TypeScript
- Node.js
- NitroStack
- MCP SDK
- SQLite
- GitHub

---

# Live Deployment

**NitroCloud Endpoint**

https://mcp-execution-l-code-reigns-amrita-university-amritapuri-campus.app.nitrocloud.ai

---

# Installation

```bash
git clone https://github.com/Saimadhav27/mcp-execution-ledger.git

cd mcp-execution-ledger

npm install

npm run build

npm start
```

---

# Repository Structure

```
src/
 ├── modules/
 │     └── ledger/
 ├── widgets/
 ├── health/
 ├── app.module.ts
 └── index.ts
```

---

# Future Scope

- Blockchain-backed immutable ledger
- Multi-agent execution tracking
- Enterprise audit reports
- Security compliance
- Distributed execution monitoring
- AI governance dashboard

---

# Team

**Code Reigns**

Agentic AI Hackathon 2026

Amrita Vishwa Vidyapeetham

---

# License

MIT License