import fs from "fs";
import path from "path";
import os from "os";
import type { TokenSet } from "../types/pinterest.js";

const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const REFRESH_BEFORE_EXPIRY_SECONDS = 24 * 60 * 60; // 24 hours
const WARN_REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getTokenPath(): string {
  const raw = process.env.PINTEREST_TOKEN_PATH ?? "~/pinterest_mcp/auth/tokens.json";
  return raw.startsWith("~/") ? path.join(os.homedir(), raw.slice(2)) : raw;
}

export function readTokens(): TokenSet {
  const tokenPath = getTokenPath();
  if (!fs.existsSync(tokenPath)) {
    throw new Error(
      `Pinterest tokens not found at ${tokenPath}. Run 'npm run auth' to authorize.`
    );
  }
  try {
    const raw = fs.readFileSync(tokenPath, "utf-8");
    return JSON.parse(raw) as TokenSet;
  } catch {
    throw new Error(`Failed to parse Pinterest tokens at ${tokenPath}. Try re-running 'npm run auth'.`);
  }
}

export function writeTokens(tokens: TokenSet): void {
  const tokenPath = getTokenPath();
  const dir = path.dirname(tokenPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

function getAppCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.PINTEREST_APP_ID;
  const appSecret = process.env.PINTEREST_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("PINTEREST_APP_ID and PINTEREST_APP_SECRET env vars are required.");
  }
  return { appId, appSecret };
}

async function refreshAccessToken(tokens: TokenSet): Promise<TokenSet> {
  const { appId, appSecret } = getAppCredentials();
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    continuous_refresh: "true",
  });

  const response = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Token refresh failed (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_token_expires_in: number;
    scope: string;
    token_type: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const newTokens: TokenSet = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    access_token_expires_at: now + data.expires_in,
    refresh_token_expires_at: now + data.refresh_token_expires_in,
    scope: data.scope,
    updated_at: new Date().toISOString(),
  };

  writeTokens(newTokens);
  return newTokens;
}

let cachedTokens: TokenSet | null = null;

export async function getValidTokens(): Promise<TokenSet> {
  if (!cachedTokens) {
    cachedTokens = readTokens();
  }

  const now = Math.floor(Date.now() / 1000);

  // Warn if refresh token is expiring within 7 days
  if (cachedTokens.refresh_token_expires_at - now < WARN_REFRESH_TOKEN_EXPIRY_SECONDS) {
    const daysLeft = Math.floor((cachedTokens.refresh_token_expires_at - now) / 86400);
    console.error(
      `[pinterest-mcp] WARNING: Refresh token expires in ${daysLeft} days. Run 'npm run auth' to re-authorize.`
    );
  }

  // Refresh access token if expiring within 24 hours
  if (cachedTokens.access_token_expires_at - now < REFRESH_BEFORE_EXPIRY_SECONDS) {
    console.error("[pinterest-mcp] Access token expiring soon — refreshing...");
    cachedTokens = await refreshAccessToken(cachedTokens);
    console.error("[pinterest-mcp] Token refreshed successfully.");
  }

  return cachedTokens;
}

// Invalidate cached tokens (force re-read from disk on next call)
export function invalidateTokenCache(): void {
  cachedTokens = null;
}
