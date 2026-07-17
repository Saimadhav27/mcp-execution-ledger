CREATE TABLE IF NOT EXISTS sessions (
  sessionId TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  startedAt TEXT NOT NULL,
  executionCount INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS executions (
  executionId TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  toolName TEXT NOT NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(sessionId) REFERENCES sessions(sessionId)
);

CREATE TABLE IF NOT EXISTS checkpoints (
  checkpointId TEXT PRIMARY KEY,
  sessionId TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  executionCount INTEGER NOT NULL,
  executionIds TEXT NOT NULL,
  FOREIGN KEY(sessionId) REFERENCES sessions(sessionId)
);
