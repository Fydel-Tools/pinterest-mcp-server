// Pinterest OAuth helpers shared by the local one-time script (src/auth/oauth.ts,
// localhost:3052) and the hosted connect flow (src/connect.ts).
import { PINTEREST_AUTH_URL, PINTEREST_SCOPES, PINTEREST_TOKEN_URL } from "../constants.js";
import type { TokenSet } from "../types/pinterest.js";

export function getAppCredentials(): { appId: string; appSecret: string } {
  const appId = process.env.PINTEREST_APP_ID;
  const appSecret = process.env.PINTEREST_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error("PINTEREST_APP_ID and PINTEREST_APP_SECRET env vars are required.");
  }
  return { appId, appSecret };
}

/** Pinterest authorize URL requesting all scopes, bound to a redirect URI and state. */
export function buildAuthorizeUrl(appId: string, redirectUri: string, state?: string): string {
  const url = new URL(PINTEREST_AUTH_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", PINTEREST_SCOPES.join(","));
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

/** Raw shape of a Pinterest token endpoint response. */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
}

/** Error from the token endpoint. Carries the HTTP status and Pinterest's message only. */
export class PinterestTokenError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "PinterestTokenError";
  }
}

/** Extract a short, token-free error message from a token endpoint error body. */
function tokenErrorMessage(text: string): string {
  try {
    const body = JSON.parse(text) as { message?: unknown; error?: unknown; error_description?: unknown };
    const msg = body.message ?? body.error_description ?? body.error;
    if (typeof msg === "string" && msg) return msg.slice(0, 300);
  } catch {
    // not JSON
  }
  return "token endpoint error";
}

/** POST to the Pinterest token endpoint with app Basic auth. */
export async function postTokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const { appId, appSecret } = getAppCredentials();
  const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const response = await fetch(PINTEREST_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new PinterestTokenError(response.status, tokenErrorMessage(text));
  }
  return (await response.json()) as TokenResponse;
}

/**
 * Turn a token endpoint response into a stored TokenSet. Fields Pinterest omits
 * (a refresh response without a new refresh token, for example) fall back to the
 * previous token set so nothing is lost.
 */
export function toTokenSet(data: TokenResponse, previous?: TokenSet): TokenSet {
  const now = Math.floor(Date.now() / 1000);
  const refreshToken = data.refresh_token ?? previous?.refresh_token;
  if (!refreshToken) {
    throw new Error("Pinterest token response did not include a refresh token.");
  }
  return {
    access_token: data.access_token,
    refresh_token: refreshToken,
    access_token_expires_at: now + data.expires_in,
    refresh_token_expires_at:
      data.refresh_token_expires_in !== undefined
        ? now + data.refresh_token_expires_in
        : previous?.refresh_token_expires_at ?? 0,
    scope: data.scope ?? previous?.scope ?? "",
    updated_at: new Date().toISOString(),
  };
}

/** Exchange an authorization code for tokens (continuous refresh enabled). */
export async function exchangeCode(code: string, redirectUri: string): Promise<TokenSet> {
  const data = await postTokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    continuous_refresh: "true",
  });
  return toTokenSet(data);
}
