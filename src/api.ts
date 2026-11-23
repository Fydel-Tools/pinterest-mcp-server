import { getValidTokens } from "./auth/token-manager.js";
import { PINTEREST_API_BASE } from "./constants.js";

// Build a query string from an object, omitting undefined/null values
function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

function formatPinterestError(status: number, endpoint: string, body: unknown): string {
  const bodyStr = typeof body === "object" ? JSON.stringify(body) : String(body);

  switch (status) {
    case 401:
      return `Access token expired or invalid. Re-authorize at /pinterest/connect (hosted) or run 'npm run auth' (local). (${endpoint})`;
    case 403: {
      const scopeHint =
        typeof body === "object" && body !== null && "message" in body
          ? ` Missing scope: ${(body as { message: string }).message}`
          : " Re-authorize with the correct scopes.";
      return `Forbidden: insufficient permissions.${scopeHint} (${endpoint})`;
    }
    case 404:
      return `Resource not found: ${endpoint}`;
    case 429:
      return `Rate limited. Pinterest allows ~1000 requests/minute. Wait a moment and retry. (${endpoint})`;
    default:
      return `Pinterest API error ${status} at ${endpoint}: ${bodyStr}`;
  }
}

async function pinterestFetch(
  method: string,
  endpoint: string,
  queryParams?: Record<string, unknown>,
  body?: unknown
): Promise<unknown> {
  const tokens = await getValidTokens();
  const qs = queryParams ? buildQueryString(queryParams) : "";
  const url = `${PINTEREST_API_BASE}${endpoint}${qs}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
  };

  const init: RequestInit = { method, headers };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(url, init);

  if (response.status === 204) {
    return { success: true };
  }

  const responseText = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    parsed = responseText;
  }

  if (!response.ok) {
    throw new Error(formatPinterestError(response.status, endpoint, parsed));
  }

  return parsed;
}

export async function pinterestGet(
  endpoint: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  return pinterestFetch("GET", endpoint, params);
}

export async function pinterestPost(
  endpoint: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<unknown> {
  return pinterestFetch("POST", endpoint, params, body);
}

export async function pinterestPatch(
  endpoint: string,
  body?: unknown,
  params?: Record<string, unknown>
): Promise<unknown> {
  return pinterestFetch("PATCH", endpoint, params, body);
}

export async function pinterestDelete(
  endpoint: string,
  params?: Record<string, unknown>,
  body?: unknown
): Promise<unknown> {
  return pinterestFetch("DELETE", endpoint, params, body);
}

export function formatResponse(data: unknown): string {
  return JSON.stringify(data, null, 2);
}
