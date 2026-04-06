#!/usr/bin/env node
/**
 * Pinterest MCP Server
 * Connects to the Pinterest API v5 using OAuth 2.0 with continuous refresh tokens.
 * Provides 42 tools covering user analytics, pins, boards, search, and media uploads.
 *
 * Setup: Run 'npm run auth' once to authorize, then use with Claude Desktop.
 *
 * Required env vars:
 *   PINTEREST_APP_ID     — Pinterest app ID (1517658)
 *   PINTEREST_APP_SECRET — Pinterest app secret
 *   PINTEREST_TOKEN_PATH — Path to tokens.json (default: ~/pinterest_mcp/auth/tokens.json)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getValidTokens } from "./auth/token-manager.js";
import { registerUserTools } from "./tools/user.js";
import { registerPinsTools } from "./tools/pins.js";
import { registerBoardsTools } from "./tools/boards.js";
import { registerSearchTools } from "./tools/search.js";
import { registerMediaTools } from "./tools/media.js";

// ── Validate required env vars ───────────────────────────────────

const appId = process.env.PINTEREST_APP_ID;
const appSecret = process.env.PINTEREST_APP_SECRET;

if (!appId) {
  console.error("[pinterest-mcp] Error: PINTEREST_APP_ID env var is required.");
  process.exit(1);
}

if (!appSecret) {
  console.error("[pinterest-mcp] Error: PINTEREST_APP_SECRET env var is required.");
  process.exit(1);
}

// ── Create server ────────────────────────────────────────────────

const server = new McpServer({
  name: "pinterest-mcp-server",
  version: "1.0.0",
});

// ── Register all tools ───────────────────────────────────────────

registerUserTools(server);
registerPinsTools(server);
registerBoardsTools(server);
registerSearchTools(server);
registerMediaTools(server);

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
    // Don't exit — allow the server to start so Claude can report the error gracefully
  }

  // ── Start stdio transport ────────────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[pinterest-mcp] Server running on stdio. Ready for connections.");
}

startup().catch((err) => {
  console.error("[pinterest-mcp] Fatal startup error:", err);
  process.exit(1);
});
