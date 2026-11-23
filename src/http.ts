// Remote HTTP entrypoint. Stateless Streamable HTTP MCP authenticated with a
// WorkOS AuthKit OAuth access token (verified against the AuthKit JWKS and
// allowlisted by WorkOS user id). Build a fresh server + transport per request,
// hand off, close. This server is the OAuth Resource Server only.
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { buildServer, requirePinterestConfig, SERVER_NAME, SERVER_VERSION } from "./server.js";
import { connectEnabled, handleConnect, handleCallback } from "./connect.js";
import { getValidTokens } from "./auth/token-manager.js";
import {
  authenticateOAuth,
  bearerFrom,
  wwwAuthenticate,
  protectedResourceMetadata,
  requireOAuthConfig,
  oauthEnabled,
  OAuthError,
} from "./oauth.js";

const PORT = Number(process.env.PORT ?? 8080);
const MAX_BODY = Number(process.env.MAX_PAYLOAD_BYTES ?? 1_048_576); // 1 MB

// Fail fast on missing config (Pinterest app creds + OAuth wiring).
requirePinterestConfig();
requireOAuthConfig();

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(text);
}

function readBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > maxBytes) {
        reject(new Error("payload_too_large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const raw = bearerFrom(req.headers["authorization"]);
  if (!raw) {
    res.setHeader("WWW-Authenticate", wwwAuthenticate());
    return send(res, 401, { error: "unauthorized", reason: "missing" });
  }
  try {
    await authenticateOAuth(raw);
  } catch (e) {
    res.setHeader("WWW-Authenticate", wwwAuthenticate());
    const reason = e instanceof OAuthError ? e.message : "invalid_token";
    return send(res, 401, { error: "unauthorized", reason });
  }

  let bodyText: string;
  try {
    bodyText = await readBody(req, MAX_BODY);
  } catch {
    return send(res, 413, { error: "payload_too_large", max_bytes: MAX_BODY });
  }

  let parsed: unknown;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : undefined;
  } catch {
    return send(res, 400, { error: "invalid_json" });
  }

  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, parsed);
  } catch (e) {
    console.error("[pinterest-mcp] mcp handler error:", e);
    if (!res.headersSent) send(res, 500, { error: "internal" });
  }
}

const httpServer = createServer((req, res) => {
  const url = req.url ?? "/";
  if (req.method === "GET" && (url === "/healthz" || url === "/")) {
    return send(res, 200, { ok: true, service: SERVER_NAME, version: SERVER_VERSION, oauth: oauthEnabled });
  }
  if (req.method === "GET" && url === "/.well-known/oauth-protected-resource") {
    return send(res, 200, protectedResourceMetadata());
  }
  if (req.method === "POST" && (url === "/mcp" || url === "/")) {
    return void handleMcp(req, res);
  }
  // Hosted Pinterest account OAuth (Basic-auth gated connect + state-checked callback).
  const pathname = url.split("?")[0];
  if (req.method === "GET" && pathname === "/pinterest/connect") {
    return handleConnect(req, res);
  }
  if (req.method === "GET" && pathname === "/pinterest/callback") {
    return void handleCallback(req, res).catch((e) => {
      console.error("[pinterest-mcp] callback handler error:", e instanceof Error ? e.message : String(e));
      if (!res.headersSent) send(res, 500, { error: "internal" });
    });
  }
  return send(res, 404, { error: "not_found" });
});

httpServer.listen(PORT, () => {
  console.error(`[pinterest-mcp] HTTP server listening on :${PORT} (v${SERVER_VERSION}, oauth=${oauthEnabled}, connect=${connectEnabled})`);
  // Startup token check: warn only. The server must stay up so /pinterest/connect
  // can create tokens when none exist yet.
  getValidTokens()
    .then(() => console.error("[pinterest-mcp] Pinterest tokens loaded and valid."))
    .catch((err: unknown) =>
      console.error(
        `[pinterest-mcp] Warning: Pinterest tokens not usable yet: ${err instanceof Error ? err.message : String(err)}`
      )
    );
});

function shutdown(sig: string): void {
  console.error(`[pinterest-mcp] shutting down (${sig})`);
  httpServer.close();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
