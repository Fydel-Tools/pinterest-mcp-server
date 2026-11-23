// WorkOS AuthKit OAuth verification for the remote Pinterest MCP server.
// (Connector auth only. Pinterest account OAuth lives in src/auth/ and src/connect.ts.)
//
// This server is only the Resource Server: WorkOS AuthKit is the Authorization
// Server (it runs /oauth2/authorize, /oauth2/token, /oauth2/register (DCR),
// /oauth2/jwks and the discovery metadata). We verify access tokens and point
// clients at the AS via RFC 9728 protected-resource metadata.
//
// Single-operator model: verify the token against the AuthKit JWKS (issuer +
// audience) and allowlist the operator's WorkOS user id (token `sub`). No
// tenant/DB layer, unlike brain-v2 which maps org_id -> tenant.
import { jwtVerify, createRemoteJWKSet } from "jose";

const AUTHKIT_DOMAIN = (process.env.AUTHKIT_DOMAIN ?? "").trim().replace(/\/+$/, "");
const MCP_RESOURCE_URL = (process.env.MCP_RESOURCE_URL ?? "").trim();
const ALLOWED_WORKOS_SUBS = (process.env.ALLOWED_WORKOS_SUBS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const oauthEnabled = Boolean(AUTHKIT_DOMAIN && MCP_RESOURCE_URL);

const JWKS = AUTHKIT_DOMAIN
  ? createRemoteJWKSet(new URL(`${AUTHKIT_DOMAIN}/oauth2/jwks`))
  : null;

export class OAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthError";
  }
}

export interface AuthedUser {
  sub: string;
}

/** Extract the bearer token from an Authorization header value, or null. */
export function bearerFrom(headerValue: string | undefined): string | null {
  if (!headerValue) return null;
  const m = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return m ? m[1].trim() : null;
}

const PRM_PATH = "/.well-known/oauth-protected-resource";

/** Absolute URL of this server's protected-resource metadata document. */
export function prmUrl(): string {
  return new URL(MCP_RESOURCE_URL).origin + PRM_PATH;
}

/** RFC 9728 protected-resource metadata body. Tells clients which AS to use. */
export function protectedResourceMetadata() {
  return {
    resource: MCP_RESOURCE_URL,
    authorization_servers: AUTHKIT_DOMAIN ? [AUTHKIT_DOMAIN] : [],
    bearer_methods_supported: ["header"],
  };
}

/** WWW-Authenticate challenge that lets MCP clients discover the AS via our PRM. */
export function wwwAuthenticate(): string {
  return [
    'Bearer error="unauthorized"',
    'error_description="Authorization needed"',
    `resource_metadata="${prmUrl()}"`,
  ].join(", ");
}

/**
 * Verify a WorkOS AuthKit access token and return the authenticated user.
 * Throws OAuthError on any verification or authorization failure (caller -> 401).
 */
export async function authenticateOAuth(token: string): Promise<AuthedUser> {
  if (!JWKS || !AUTHKIT_DOMAIN || !MCP_RESOURCE_URL) {
    throw new OAuthError("oauth_not_configured");
  }
  let payload;
  try {
    ({ payload } = await jwtVerify(token, JWKS, {
      issuer: AUTHKIT_DOMAIN,
      audience: MCP_RESOURCE_URL,
    }));
  } catch (e) {
    const code = (e as { code?: string }).code;
    throw new OAuthError(code ?? "invalid_token");
  }
  // Allowlist gate: only the configured WorkOS user id(s) may access. This env's
  // AuthKit has other users (Meminent invitees), so the allowlist is the wall
  // that keeps this server single-operator. Empty list = open (not used here).
  const sub = String(payload.sub ?? "");
  if (ALLOWED_WORKOS_SUBS.length > 0 && !ALLOWED_WORKOS_SUBS.includes(sub)) {
    throw new OAuthError("not_authorized");
  }
  return { sub };
}

/** Fail fast if the OAuth env is not configured. */
export function requireOAuthConfig(): void {
  if (!oauthEnabled) {
    console.error("Error: AUTHKIT_DOMAIN and MCP_RESOURCE_URL are required (OAuth).");
    console.error("Set AUTHKIT_DOMAIN, MCP_RESOURCE_URL, and ALLOWED_WORKOS_SUBS.");
    process.exit(1);
  }
}
