#!/usr/bin/env node
/**
 * Pinterest MCP Server: local stdio entrypoint (unchanged behavior). Kept so the
 * server still runs under a Claude Desktop `command: node dist/index.js` config.
 * The remote HTTP entrypoint is src/http.ts.
 *
 * Setup: Run 'npm run auth' once to authorize, then use with Claude Desktop.
 *
 * Required env vars:
 *   PINTEREST_APP_ID     Pinterest app ID (1517658)
 *   PINTEREST_APP_SECRET Pinterest app secret
 *   PINTEREST_TOKEN_PATH Path to tokens.json (default: ~/pinterest_mcp/auth/tokens.json)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getValidTokens } from "./auth/token-manager.js";
import { buildServer, requirePinterestConfig } from "./server.js";

// ── Validate required env vars ───────────────────────────────────

requirePinterestConfig();

// ── Startup token check ──────────────────────────────────────────

async function startup(): Promise<void> {
  try {
    // This will check token validity and warn if refresh token is expiring soon
    await getValidTokens();
    console.error("[pinterest-mcp] Tokens loaded and valid.");
  } catch (err) {
    console.error(
      `[pinterest-mcp] Warning: Could not load tokens on startup: ${err instanceof Error ? err.message : String(err)}`
    );
    console.error("[pinterest-mcp] Run 'npm run auth' to authorize if you haven't already.");
    // Don't exit; allow the server to start so Claude can report the error gracefully
  }

  // ── Start stdio transport ────────────────────────────────────────
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[pinterest-mcp] Server running on stdio. Ready for connections.");
}

startup().catch((err) => {
  console.error("[pinterest-mcp] Fatal startup error:", err);
  process.exit(1);
});
