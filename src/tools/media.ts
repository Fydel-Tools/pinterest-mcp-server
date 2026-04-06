import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestGet, pinterestPost, formatResponse } from "../api.js";

export function registerMediaTools(server: McpServer): void {

  // ── pinterest_media_register_upload ─────────────────────────────
  server.tool(
    "pinterest_media_register_upload",
    "Register a media upload (video or image) with Pinterest to get an upload URL and parameters. After calling this, use the returned upload_url and upload_parameters to upload the file directly to Pinterest's storage via a multipart POST. Then use the media_id when creating a pin.",
    {
      media_type: z.enum(["video"]).describe("Type of media to upload (currently only 'video' supported for direct upload)"),
    },
    async (params) => {
      const data = await pinterestPost("/media", { media_type: params.media_type });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_media_get_status ───────────────────────────────────
  server.tool(
    "pinterest_media_get_status",
    "Get the processing status of a media upload. Returns status (pending, processing, succeeded, failed) and the media_id to use when creating a pin.",
    {
      media_id: z.string().describe("The media ID returned from pinterest_media_register_upload"),
    },
    async (params) => {
      const data = await pinterestGet(`/media/${encodeURIComponent(params.media_id)}`);
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_media_list ─────────────────────────────────────────
  server.tool(
    "pinterest_media_list",
    "List all media uploads registered by the authenticated user. Returns upload status and media IDs. Supports cursor-based pagination.",
    {
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
    },
    async (params) => {
      const data = await pinterestGet("/media", {
        bookmark: params.bookmark,
        page_size: params.page_size,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );
}
