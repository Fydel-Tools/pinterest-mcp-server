import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestGet, formatResponse } from "../api.js";

export function registerSearchTools(server: McpServer): void {

  // ── pinterest_search_pins ────────────────────────────────────────
  server.tool(
    "pinterest_search_pins",
    "Search for pins matching a query string. Returns pin objects with images, titles, descriptions, and links. Supports cursor-based pagination.",
    {
      query: z.string().describe("Search query string"),
      bookmark: z.string().optional().describe("Cursor for next page (from previous response bookmark)"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/search/pins", {
        query: params.query,
        bookmark: params.bookmark,
        page_size: params.page_size,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_search_boards ──────────────────────────────────────
  server.tool(
    "pinterest_search_boards",
    "Search for boards owned by the authenticated user matching a query string. Returns board objects with names, descriptions, and pin counts.",
    {
      query: z.string().describe("Search query string"),
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/search/boards", {
        query: params.query,
        bookmark: params.bookmark,
        page_size: params.page_size,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_search_partner_pins ───────────────────────────────
  server.tool(
    "pinterest_search_partner_pins",
    "Search for partner (promoted/advertiser) pins matching a query. Returns pins available from Pinterest's advertising partners.",
    {
      query: z.string().describe("Search query string"),
      country_code: z.string().describe("Two-letter country code (e.g. US, GB, DE)"),
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      x_pinterest_device_fingerprint: z.string().optional().describe("Device fingerprint for personalization"),
    },
    async (params) => {
      const data = await pinterestGet("/search/partner/pins", {
        query: params.query,
        country_code: params.country_code,
        bookmark: params.bookmark,
        page_size: params.page_size,
        x_pinterest_device_fingerprint: params.x_pinterest_device_fingerprint,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );
}
