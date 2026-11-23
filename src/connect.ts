// Hosted Pinterest account OAuth (replaces the localhost:3052 flow in production).
//
//   GET /pinterest/connect   HTTP Basic auth (password = PINTEREST_CONNECT_PASSWORD),
//                            then 302 to Pinterest authorize with all scopes and a
//                            random single-use state held server-side.
//   GET /pinterest/callback  Verify state, exchange the code, save tokens to
//                            PINTEREST_TOKEN_PATH, show the connected username.
//
// Tokens are never rendered, logged, or returned.
import crypto from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buildAuthorizeUrl, exchangeCode } from "./auth/pinterest-oauth.js";
import { writeTokens } from "./auth/token-manager.js";
import { PINTEREST_API_BASE, PINTEREST_SANDBOX } from "./constants.js";

const CONNECT_PASSWORD = process.env.PINTEREST_CONNECT_PASSWORD ?? "";
const REDIRECT_URI = (process.env.PINTEREST_REDIRECT_URI ?? "").trim();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PENDING_STATES = 100;
const BASIC_REALM = "pinterest-connect";

export const connectEnabled = Boolean(CONNECT_PASSWORD && REDIRECT_URI);

// state -> expiry (epoch ms). Single process (numReplicas 1), so memory is enough.
const pendingStates = new Map<string, number>();

function pruneStates(now: number): void {
  for (const [state, exp] of pendingStates) {
    if (exp <= now) pendingStates.delete(state);
  }
  // Hard cap so repeated hits cannot grow memory without bound: drop oldest.
  while (pendingStates.size >= MAX_PENDING_STATES) {
    const oldest = pendingStates.keys().next().value;
    if (oldest === undefined) break;
    pendingStates.delete(oldest);
  }
}

function issueState(): string {
  const now = Date.now();
  pruneStates(now);
  const state = crypto.randomBytes(32).toString("base64url");
  pendingStates.set(state, now + STATE_TTL_MS);
  return state;
}

/** Single-use: a state is consumed on first check whether or not it is valid. */
function consumeState(state: string): boolean {
  const exp = pendingStates.get(state);
  pendingStates.delete(state);
  return exp !== undefined && exp > Date.now();
}

/** Constant-time password check. Hash both sides so lengths always match. */
function passwordMatches(supplied: string): boolean {
  const a = crypto.createHash("sha256").update(supplied, "utf8").digest();
  const b = crypto.createHash("sha256").update(CONNECT_PASSWORD, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

/** Parse an HTTP Basic Authorization header and return the password, or null. */
function basicPassword(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const m = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(headerValue.trim());
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const idx = decoded.indexOf(":");
  if (idx < 0) return null;
  return decoded.slice(idx + 1);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sendHtml(res: ServerResponse, status: number, title: string, bodyHtml: string): void {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  res.end(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>` +
      `<body style="font-family:system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem">` +
      `${bodyHtml}</body></html>`
  );
}

function notConfigured(res: ServerResponse): void {
  sendHtml(
    res,
    503,
    "Not configured",
    "<h2>Pinterest connect is not configured</h2><p>Set PINTEREST_CONNECT_PASSWORD and PINTEREST_REDIRECT_URI.</p>"
  );
}

/** GET /pinterest/connect */
export function handleConnect(req: IncomingMessage, res: ServerResponse): void {
  if (!connectEnabled) return notConfigured(res);

  const supplied = basicPassword(req.headers["authorization"]);
  if (supplied === null || !passwordMatches(supplied)) {
    res.setHeader("WWW-Authenticate", `Basic realm="${BASIC_REALM}", charset="UTF-8"`);
    return sendHtml(res, 401, "Unauthorized", "<h2>Unauthorized</h2>");
  }

  const appId = process.env.PINTEREST_APP_ID;
  if (!appId) return notConfigured(res);

  const location = buildAuthorizeUrl(appId, REDIRECT_URI, issueState());
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

/** Fetch the connected account's username with a fresh access token. */
async function fetchUsername(accessToken: string): Promise<string | null> {
  try {
    const r = await fetch(`${PINTEREST_API_BASE}/user_account`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return null;
    const body = (await r.json()) as { username?: unknown };
    return typeof body.username === "string" ? body.username : null;
  } catch {
    return null;
  }
}

/** GET /pinterest/callback */
export async function handleCallback(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!connectEnabled) return notConfigured(res);

  const url = new URL(req.url ?? "/", "http://localhost");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (!state || !consumeState(state)) {
    return sendHtml(
      res,
      400,
      "Invalid state",
      "<h2>Invalid or expired state</h2><p>Start again at /pinterest/connect.</p>"
    );
  }
  if (error || !code) {
    return sendHtml(
      res,
      400,
      "Authorization failed",
      `<h2>Authorization failed</h2><p>${escapeHtml(error ?? "no code returned")}</p>`
    );
  }

  try {
    const tokens = await exchangeCode(code, REDIRECT_URI);
    writeTokens(tokens);
    const username = await fetchUsername(tokens.access_token);
    console.error(`[pinterest-mcp] Pinterest connected${username ? ` as ${username}` : ""}; tokens saved.`);
    return sendHtml(
      res,
      200,
      "Pinterest connected",
      `<h2>Pinterest connected</h2>` +
        `<p>Account: <strong>${escapeHtml(username ?? "(username unavailable)")}</strong></p>` +
        `<p>Environment: <strong>${PINTEREST_SANDBOX ? "Pinterest API Sandbox" : "Production"}</strong></p>` +
        `<p>Tokens were saved on the server. You can close this window.</p>`
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(`[pinterest-mcp] Pinterest callback failed${status ? ` (${status})` : ""}: ${msg}`);
    return sendHtml(
      res,
      502,
      "Token exchange failed",
      `<h2>Token exchange failed</h2><p>${escapeHtml(status ? `HTTP ${status}: ${msg}` : msg)}</p>`
    );
  }
}
