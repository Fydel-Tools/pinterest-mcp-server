import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import type { TokenSet } from "../types/pinterest.js";
import { postTokenRequest, toTokenSet } from "./pinterest-oauth.js";

const REFRESH_BEFORE_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
const WARN_REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

const REAUTH_HINT =
  "Re-authorize at /pinterest/connect on the hosted server, or run 'npm run auth' locally.";

export function getTokenPath(): string {
  const raw = process.env.PINTEREST_TOKEN_PATH ?? "~/pinterest_mcp/auth/tokens.json";
  return raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : raw;
}

export function readTokens(): TokenSet {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    throw new Error(`Pinterest tokens not found at ${tokenPath}. ${REAUTH_HINT}`);
  }
  try {
    const raw = fs.readFileSync(tokenPath, "utf-8");
    return JSON.parse(raw) as TokenSet;
  } catch {
    throw new Error(`Failed to parse Pinterest tokens at ${tokenPath}. ${REAUTH_HINT}`);
  }
}

/**
 * Persist a token set atomically: write a temp file in the same directory,
 * fsync it, then rename over the target. A crash mid-write leaves the previous
 * file intact, so a rotated refresh token is never half-written. Also updates
 * the in-process cache so the running server uses the new tokens immediately.
 */
export function writeTokens(tokens: TokenSet): void {
  const tokenPath = getTokenPath();
  const dir = path.dirname(tokenPath);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const tmpPath = path.join(
    dir,
    `.${path.basename(tokenPath)}.${process.pid}.${crypto.randomBytes(6).toString("hex")}.tmp`
  );
  const fd = fs.openSync(tmpPath, "w", 0o600);
  try {
    fs.writeSync(fd, JSON.stringify(tokens, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  try {
    fs.renameSync(tmpPath, tokenPath);
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    throw err;
  }
  cachedTokens = tokens;
}

async function refreshAccessToken(tokens: TokenSet): Promise<TokenSet> {
  let data;
  try {
    data = await postTokenRequest({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
      continuous_refresh: "true",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = (err as { status?: number }).status;
    throw new Error(`Token refresh failed${status ? ` (${status})` : ""}: ${msg}. ${REAUTH_HINT}`);
  }
  // Pinterest rotates the refresh token on every refresh (continuous_refresh).
  // Write the whole set back right away so the new refresh token survives restarts.
  const newTokens = toTokenSet(data, tokens);
  writeTokens(newTokens);
  return newTokens;
}

let cachedTokens: TokenSet | null = null;
let inflightRefresh: Promise<TokenSet> | null = null;

function needsRefresh(tokens: TokenSet, now: number): boolean {
  return tokens.access_token_expires_at - now < REFRESH_BEFORE_EXPIRY_SECONDS;
}

export async function getValidTokens(): Promise<TokenSet> {
  if (!cachedTokens) {
    cachedTokens = readTokens();
  }

  const now = Math.floor(Date.now() / 1000);

  // Warn if refresh token is expiring within 7 days
  if (cachedTokens.refresh_token_expires_at - now < WARN_REFRESH_TOKEN_EXPIRY_SECONDS) {
    const daysLeft = Math.floor((cachedTokens.refresh_token_expires_at - now) / 86400);
    console.error(
      `[pinterest-mcp] WARNING: Refresh token expires in ${daysLeft} days. ${REAUTH_HINT}`
    );
  }

  // Refresh access token if expiring within 24 hours
  if (needsRefresh(cachedTokens, now)) {
    // Another process (or a /pinterest/callback) may have written newer tokens.
    // Re-read the file first so a rotated refresh token is never reused.
    try {
      const onDisk = readTokens();
      if (onDisk.updated_at !== cachedTokens.updated_at) cachedTokens = onDisk;
    } catch {
      // keep the cached set
    }
    if (!needsRefresh(cachedTokens, now)) return cachedTokens;

    // Single-flight: concurrent HTTP requests share one refresh call, so the
    // rotated refresh token is only spent once.
    if (!inflightRefresh) {
      console.error("[pinterest-mcp] Access token expiring soon, refreshing...");
      const current = cachedTokens;
      inflightRefresh = refreshAccessToken(current)
        .then((t) => {
          console.error("[pinterest-mcp] Token refreshed successfully.");
          return t;
        })
        .finally(() => {
          inflightRefresh = null;
        });
    }
    return inflightRefresh;
  }

  return cachedTokens;
}

// Invalidate cached tokens (force re-read from disk on next call)
export function invalidateTokenCache(): void {
  cachedTokens = null;
}
