// Shared Pinterest constants. Values that differ per environment come from env.

/**
 * Pinterest REST API base. Defaults to production. Set PINTEREST_API_BASE to
 * point elsewhere (for example the sandbox host); nothing switches automatically.
 */
export const PINTEREST_API_BASE = (process.env.PINTEREST_API_BASE ?? "https://api.pinterest.com/v5")
  .trim()
  .replace(/\/+$/, "");

/**
 * OAuth token endpoint. Follows PINTEREST_API_BASE: Pinterest issues Sandbox
 * tokens from https://api-sandbox.pinterest.com/v5/oauth/token and production
 * tokens from https://api.pinterest.com/v5/oauth/token, and a token only works
 * on the host that issued it. PINTEREST_TOKEN_URL overrides this if set.
 */
export const PINTEREST_TOKEN_URL = (process.env.PINTEREST_TOKEN_URL ?? `${PINTEREST_API_BASE}/oauth/token`)
  .trim();

/** True when calls go to the Pinterest API Sandbox (Trial access pin writes). */
export const PINTEREST_SANDBOX = /api-sandbox\.pinterest\.com/.test(PINTEREST_API_BASE);

/** Pinterest user-facing authorize page. */
export const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";

/** All 14 scopes the app is approved for (user, pins, boards, catalogs, ads). */
export const PINTEREST_SCOPES = [
  "user_accounts:read",
  "user_accounts:write",
  "pins:read",
  "pins:read_secret",
  "pins:write",
  "pins:write_secret",
  "boards:read",
  "boards:read_secret",
  "boards:write",
  "boards:write_secret",
  "catalogs:read",
  "catalogs:write",
  "ads:read",
  "ads:write",
];
