// Shared server builder + config loader. Used by BOTH entrypoints:
// src/index.ts (local stdio) and src/http.ts (remote Streamable HTTP + OAuth).
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerUserTools } from "./tools/user.js";
import { registerPinsTools } from "./tools/pins.js";
import { registerBoardsTools } from "./tools/boards.js";
import { registerSearchTools } from "./tools/search.js";
import { registerMediaTools } from "./tools/media.js";

export const SERVER_NAME = "pinterest-mcp-server";
export const SERVER_VERSION = "1.1.0";

/** Build a fully-configured MCP server (all Pinterest tools registered). */
export function buildServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerUserTools(server);
  registerPinsTools(server);
  registerBoardsTools(server);
  registerSearchTools(server);
  registerMediaTools(server);
  return server;
}

/** Fail fast if the Pinterest app credentials are missing. */
export function requirePinterestConfig(): void {
  if (!process.env.PINTEREST_APP_ID) {
    console.error("[pinterest-mcp] Error: PINTEREST_APP_ID env var is required.");
    process.exit(1);
  }
  if (!process.env.PINTEREST_APP_SECRET) {
    console.error("[pinterest-mcp] Error: PINTEREST_APP_SECRET env var is required.");
    process.exit(1);
  }
}
