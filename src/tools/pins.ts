import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestGet, pinterestPost, pinterestPatch, pinterestDelete, formatResponse } from "../api.js";

export function registerPinsTools(server: McpServer): void {

  // ── pinterest_pins_create ────────────────────────────────────────
  server.tool(
    "pinterest_pins_create",
    "Create a new pin on a board. Requires board_id and media_source (image URL or uploaded media_id). Optionally set title, description, link, alt_text, and board section.",
    {
      board_id: z.string().describe("The ID of the board to pin to"),
      media_source: z.object({
        source_type: z.enum(["image_url", "image_base64", "video_id", "pin_url", "multiple_image_urls", "multiple_media_ids"]).describe("Type of media source"),
        url: z.string().optional().describe("URL of the image (for source_type: image_url)"),
        content_type: z.string().optional().describe("MIME type (for source_type: image_base64)"),
        data: z.string().optional().describe("Base64-encoded image data (for source_type: image_base64)"),
        media_id: z.string().optional().describe("Media upload ID (for source_type: video_id)"),
        pin_url: z.string().optional().describe("URL of an existing pin to duplicate (for source_type: pin_url)"),
        items: z.array(z.object({
          source_type: z.string(),
          url: z.string().optional(),
          media_id: z.string().optional(),
        })).optional().describe("Array of media items (for multiple_image_urls or multiple_media_ids)"),
      }).describe("The media source for this pin"),
      title: z.string().optional().describe("Pin title (max 100 characters)"),
      description: z.string().optional().describe("Pin description (max 500 characters)"),
      link: z.string().optional().describe("Destination URL when the pin is clicked"),
      alt_text: z.string().optional().describe("Accessibility alt text for the pin image"),
      board_section_id: z.string().optional().describe("Board section ID to pin into"),
      note: z.string().optional().describe("Private note for this pin"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { ad_account_id, ...body } = params;
      const data = await pinterestPost("/pins", body, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_list ──────────────────────────────────────────
  server.tool(
    "pinterest_pins_list",
    "List pins owned by the authenticated user. Supports filtering by pin type and cursor-based pagination.",
    {
      bookmark: z.string().optional().describe("Cursor for next page (from previous response bookmark)"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      pin_filter: z.enum(["exclude_native", "exclude_repins", "has_been_promoted"]).optional().describe("Filter pins by type"),
      include_protected_pins: z.boolean().optional().describe("Whether to include protected pins"),
      pin_type: z.enum(["PRIVATE_AND_PUBLIC"]).optional().describe("Pin type filter"),
      creative_types: z.array(z.string()).optional().describe("Filter by creative types (e.g. REGULAR, VIDEO, SHOPPING)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
      privacy_filter: z.enum(["all", "protected", "public", "secret"]).optional().describe("Filter by pin privacy setting"),
    },
    async (params) => {
      const data = await pinterestGet("/pins", {
        bookmark: params.bookmark,
        page_size: params.page_size,
        pin_filter: params.pin_filter,
        include_protected_pins: params.include_protected_pins,
        pin_type: params.pin_type,
        creative_types: params.creative_types?.join(","),
        ad_account_id: params.ad_account_id,
        privacy_filter: params.privacy_filter,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_get ───────────────────────────────────────────
  server.tool(
    "pinterest_pins_get",
    "Get details of a specific pin including title, description, link, images, and optional metrics.",
    {
      pin_id: z.string().describe("The unique identifier of the pin"),
      pin_metrics: z.boolean().optional().describe("Include pin metrics (impressions, saves, clicks)"),
      ad_account_id: z.string().optional().describe("Ad account ID for promoted pin metrics"),
    },
    async (params) => {
      const data = await pinterestGet(`/pins/${encodeURIComponent(params.pin_id)}`, {
        pin_metrics: params.pin_metrics,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_update ────────────────────────────────────────
  server.tool(
    "pinterest_pins_update",
    "Update an existing pin's title, description, link, alt text, board, or board section.",
    {
      pin_id: z.string().describe("The unique identifier of the pin to update"),
      title: z.string().optional().describe("New pin title"),
      description: z.string().optional().describe("New pin description"),
      link: z.string().optional().describe("New destination URL"),
      alt_text: z.string().optional().describe("New alt text"),
      board_id: z.string().optional().describe("Move pin to this board ID"),
      board_section_id: z.string().optional().describe("Move pin to this board section ID"),
      note: z.string().optional().describe("Update private note"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { pin_id, ad_account_id, ...body } = params;
      const data = await pinterestPatch(`/pins/${encodeURIComponent(pin_id)}`, body, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_delete ────────────────────────────────────────
  server.tool(
    "pinterest_pins_delete",
    "Permanently delete a pin. This action cannot be undone.",
    {
      pin_id: z.string().describe("The unique identifier of the pin to delete"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestDelete(`/pins/${encodeURIComponent(params.pin_id)}`, {
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_save ──────────────────────────────────────────
  server.tool(
    "pinterest_pins_save",
    "Save (repin) an existing pin to one of the authenticated user's boards.",
    {
      pin_id: z.string().describe("The unique identifier of the pin to save"),
      board_id: z.string().describe("The board ID to save the pin to"),
      board_section_id: z.string().optional().describe("The board section ID to save the pin into"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { pin_id, ad_account_id, ...body } = params;
      const data = await pinterestPost(`/pins/${encodeURIComponent(pin_id)}/save`, body, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_get_analytics ─────────────────────────────────
  server.tool(
    "pinterest_pins_get_analytics",
    "Get analytics for a specific pin. Returns metrics like impressions, saves, clicks, and outbound clicks for the specified date range.",
    {
      pin_id: z.string().describe("The unique identifier of the pin"),
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      metric_types: z.array(z.enum(["IMPRESSION", "OUTBOUND_CLICK", "PIN_CLICK", "SAVE", "VIDEO_MRC_VIEW", "VIDEO_V50_WATCH_TIME", "QUARTILE_95_PERCENT_VIEW", "VIDEO_10S_VIEW", "VIDEO_START", "VIDEO_AVG_WATCH_TIME"])).describe("Metrics to return"),
      app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("App type filter"),
      split_field: z.enum(["NO_SPLIT", "APP_TYPE"]).optional().describe("Field to split analytics by"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet(`/pins/${encodeURIComponent(params.pin_id)}/analytics`, {
        start_date: params.start_date,
        end_date: params.end_date,
        metric_types: params.metric_types.join(","),
        app_types: params.app_types,
        split_field: params.split_field,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_get_multi_analytics ───────────────────────────
  server.tool(
    "pinterest_pins_get_multi_analytics",
    "Get analytics for multiple pins at once. Returns metrics for each pin_id for the specified date range.",
    {
      pin_ids: z.array(z.string()).describe("List of pin IDs to get analytics for (max 100)"),
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      metric_types: z.array(z.enum(["IMPRESSION", "OUTBOUND_CLICK", "PIN_CLICK", "SAVE", "VIDEO_MRC_VIEW", "VIDEO_V50_WATCH_TIME", "QUARTILE_95_PERCENT_VIEW", "VIDEO_10S_VIEW", "VIDEO_START", "VIDEO_AVG_WATCH_TIME"])).describe("Metrics to return"),
      app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("App type filter"),
      split_field: z.enum(["NO_SPLIT", "APP_TYPE"]).optional().describe("Field to split analytics by"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/pins/analytics", {
        pin_ids: params.pin_ids.join(","),
        start_date: params.start_date,
        end_date: params.end_date,
        metric_types: params.metric_types.join(","),
        app_types: params.app_types,
        split_field: params.split_field,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_add_product_tags ──────────────────────────────
  server.tool(
    "pinterest_pins_add_product_tags",
    "Add product tags to a pin for shoppable pin functionality. Links products from a catalog to specific areas of the pin image.",
    {
      pin_id: z.string().describe("The unique identifier of the pin"),
      product_tags: z.array(z.object({
        item_id: z.string().optional().describe("Catalog item ID"),
        name: z.string().optional().describe("Product name"),
        price_value: z.number().optional().describe("Product price"),
        currency: z.string().optional().describe("Currency code (e.g. USD)"),
        x_coord: z.number().optional().describe("X coordinate (0-1) for tag placement on image"),
        y_coord: z.number().optional().describe("Y coordinate (0-1) for tag placement on image"),
      })).describe("Array of product tags to add"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { pin_id, ad_account_id, product_tags } = params;
      const data = await pinterestPost(`/pins/${encodeURIComponent(pin_id)}/product_tags`, { product_tags }, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_list_product_tags ─────────────────────────────
  server.tool(
    "pinterest_pins_list_product_tags",
    "List all product tags on a specific pin.",
    {
      pin_id: z.string().describe("The unique identifier of the pin"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet(`/pins/${encodeURIComponent(params.pin_id)}/product_tags`, {
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_pins_delete_product_tags ───────────────────────────
  server.tool(
    "pinterest_pins_delete_product_tags",
    "Remove product tags from a pin in bulk.",
    {
      pin_id: z.string().describe("The unique identifier of the pin"),
      product_tag_ids: z.array(z.string()).describe("Array of product tag IDs to remove"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { pin_id, ad_account_id, product_tag_ids } = params;
      const data = await pinterestPost(
        `/pins/${encodeURIComponent(pin_id)}/product_tags/bulk-delete`,
        { product_tag_ids },
        { ad_account_id }
      );
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );
}
