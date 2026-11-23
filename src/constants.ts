// Shared Pinterest constants. Values that differ per environment come from env.

/**
 * Pinterest REST API base. Defaults to production. Set PINTEREST_API_BASE to
 * point elsewhere (for example the sandbox host); nothing switches automatically.
 */
export const PINTEREST_API_BASE = (process.env.PINTEREST_API_BASE ?? "https://api.pinterest.com/v5")
  .trim()
  .replace(/\/+$/, "");

/**
 * OAuth token endpoint. Pinterest issues tokens from the production API host
 * even when calls go to the sandbox, so this is fixed and not tied to
 * PINTEREST_API_BASE.
 */
export const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

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
