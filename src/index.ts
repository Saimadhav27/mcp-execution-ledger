/**
 * Calculator MCP Server
 * 
 * Main entry point for the MCP server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 * 
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application
 */
async function bootstrap() {
  try {
    const server = await McpApplicationFactory.create(AppModule);
    await server.start();
  } catch {
    // Bootstrap failed before the MCP logger is available. We must NOT write to
    // stdout/stderr here — any output corrupts the JSON-RPC STDIO stream. Remain
    // alive in degraded mode so a supervisor/recovery path can restart us.
  }
}

// Start the application
void bootstrap();
