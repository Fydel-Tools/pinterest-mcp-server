import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestGet, pinterestPost, pinterestDelete, formatResponse } from "../api.js";

export function registerUserTools(server: McpServer): void {

  // ── pinterest_user_get_account ──────────────────────────────────
  server.tool(
    "pinterest_user_get_account",
    "Get the authenticated user's Pinterest account details including username, account type, profile image, follower count, following count, pin count, and monthly views.",
    {},
    async () => {
      const data = await pinterestGet("/user_account");
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_get_analytics ────────────────────────────────
  server.tool(
    "pinterest_user_get_analytics",
    "Get analytics for the authenticated user's Pinterest account. Returns metrics like impressions, engagements, clicks, saves, and pin clicks for the specified date range.",
    {
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      from_claimed_content: z.enum(["OTHER", "CLAIMED", "BOTH"]).optional().describe("Filter by content claimed status"),
      pin_format: z.enum(["ALL", "ORGANIC_IMAGE", "ORGANIC_VIDEO", "ADS_STANDARD", "ADS_VIDEO", "ADS_SHOPPING", "ORGANIC_CAROUSEL", "ADS_CAROUSEL"]).optional().describe("Pin format filter"),
      app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("App type filter"),
      content_type: z.enum(["ALL", "PAID", "ORGANIC"]).optional().describe("Content type filter"),
      source: z.enum(["ALL", "YOUR_PINS", "OTHER_PINS"]).optional().describe("Source filter"),
      metric_types: z.array(z.string()).optional().describe("Metrics to return (e.g. IMPRESSION, ENGAGEMENT, PIN_CLICK, OUTBOUND_CLICK, SAVE)"),
      split_field: z.enum(["NO_SPLIT", "APP_TYPE", "OWNED_CONTENT", "SOURCE", "PIN_FORMAT"]).optional().describe("Field to split analytics by"),
      ad_account_id: z.string().optional().describe("Ad account ID for promoted pin metrics"),
    },
    async (params) => {
      const data = await pinterestGet("/user_account/analytics", {
        start_date: params.start_date,
        end_date: params.end_date,
        from_claimed_content: params.from_claimed_content,
        pin_format: params.pin_format,
        app_types: params.app_types,
        content_type: params.content_type,
        source: params.source,
        metric_types: params.metric_types?.join(","),
        split_field: params.split_field,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_get_top_pins ─────────────────────────────────
  server.tool(
    "pinterest_user_get_top_pins",
    "Get the top-performing pins for the authenticated user's account over a specified date range. Returns pins ranked by the specified sort field.",
    {
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      sort_by: z.enum(["ENGAGEMENT", "IMPRESSION", "OUTBOUND_CLICK", "PIN_CLICK", "SAVE"]).describe("Metric to sort pins by"),
      from_claimed_content: z.enum(["OTHER", "CLAIMED", "BOTH"]).optional().describe("Filter by claimed content"),
      pin_format: z.enum(["ALL", "ORGANIC_IMAGE", "ORGANIC_VIDEO", "ADS_STANDARD", "ADS_VIDEO", "ADS_SHOPPING", "ORGANIC_CAROUSEL", "ADS_CAROUSEL"]).optional().describe("Pin format filter"),
      app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("App type filter"),
      content_type: z.enum(["ALL", "PAID", "ORGANIC"]).optional().describe("Content type filter"),
      source: z.enum(["ALL", "YOUR_PINS", "OTHER_PINS"]).optional().describe("Source filter"),
      metric_types: z.array(z.string()).optional().describe("Additional metrics to include"),
      num_of_pins: z.number().int().min(1).max(25).optional().describe("Number of top pins to return (max 25)"),
      created_in_last_n_days: z.number().int().optional().describe("Filter to pins created in last N days"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/user_account/analytics/top_pins", {
        start_date: params.start_date,
        end_date: params.end_date,
        sort_by: params.sort_by,
        from_claimed_content: params.from_claimed_content,
        pin_format: params.pin_format,
        app_types: params.app_types,
        content_type: params.content_type,
        source: params.source,
        metric_types: params.metric_types?.join(","),
        num_of_pins: params.num_of_pins,
        created_in_last_n_days: params.created_in_last_n_days,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_get_top_video_pins ───────────────────────────
  server.tool(
    "pinterest_user_get_top_video_pins",
    "Get the top-performing video pins for the authenticated user's account over a specified date range.",
    {
      start_date: z.string().describe("Start date in YYYY-MM-DD format"),
      end_date: z.string().describe("End date in YYYY-MM-DD format"),
      sort_by: z.enum(["IMPRESSION", "SAVE", "OUTBOUND_CLICK", "VIDEO_MRC_VIEW", "VIDEO_AVG_WATCH_TIME", "VIDEO_V50_WATCH_TIME", "QUARTILE_95_PERCENT_VIEW", "VIDEO_10S_VIEW", "VIDEO_START"]).describe("Metric to sort video pins by"),
      from_claimed_content: z.enum(["OTHER", "CLAIMED", "BOTH"]).optional().describe("Filter by claimed content"),
      pin_format: z.enum(["ALL", "ORGANIC_IMAGE", "ORGANIC_VIDEO", "ADS_STANDARD", "ADS_VIDEO", "ADS_SHOPPING", "ORGANIC_CAROUSEL", "ADS_CAROUSEL"]).optional().describe("Pin format filter"),
      app_types: z.enum(["ALL", "MOBILE", "TABLET", "WEB"]).optional().describe("App type filter"),
      content_type: z.enum(["ALL", "PAID", "ORGANIC"]).optional().describe("Content type filter"),
      source: z.enum(["ALL", "YOUR_PINS", "OTHER_PINS"]).optional().describe("Source filter"),
      metric_types: z.array(z.string()).optional().describe("Additional metrics to include"),
      num_of_pins: z.number().int().min(1).max(25).optional().describe("Number of top video pins to return (max 25)"),
      created_in_last_n_days: z.number().int().optional().describe("Filter to pins created in last N days"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/user_account/analytics/top_video_pins", {
        start_date: params.start_date,
        end_date: params.end_date,
        sort_by: params.sort_by,
        from_claimed_content: params.from_claimed_content,
        pin_format: params.pin_format,
        app_types: params.app_types,
        content_type: params.content_type,
        source: params.source,
        metric_types: params.metric_types?.join(","),
        num_of_pins: params.num_of_pins,
        created_in_last_n_days: params.created_in_last_n_days,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_list_businesses ──────────────────────────────
  server.tool(
    "pinterest_user_list_businesses",
    "List business accounts connected to the authenticated user's personal Pinterest account.",
    {},
    async () => {
      const data = await pinterestGet("/user_account/businesses");
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_list_followers ───────────────────────────────
  server.tool(
    "pinterest_user_list_followers",
    "List Pinterest users who follow the authenticated account. Supports cursor-based pagination.",
    {
      bookmark: z.string().optional().describe("Cursor for next page (from previous response bookmark field)"),
      page_size: z.number().int().min(1).max(100).optional().describe("Number of results per page (max 100)"),
    },
    async (params) => {
      const data = await pinterestGet("/user_account/followers", {
        bookmark: params.bookmark,
        page_size: params.page_size,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_list_following ───────────────────────────────
  server.tool(
    "pinterest_user_list_following",
    "List Pinterest users that the authenticated account is following. Supports cursor-based pagination.",
    {
      feedType: z.enum(["ALL", "DEFAULT", "RANKED", "CREATOR_ONLY", "RANKED_CREATOR_ONLY"]).optional().describe("Type of following feed to retrieve"),
      explicit_following: z.boolean().optional().describe("Whether to return only explicitly followed users"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(100).optional().describe("Number of results per page (max 100)"),
    },
    async (params) => {
      const data = await pinterestGet("/user_account/following", {
        feedType: params.feedType,
        explicit_following: params.explicit_following,
        ad_account_id: params.ad_account_id,
        bookmark: params.bookmark,
        page_size: params.page_size,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_list_following_boards ────────────────────────
  server.tool(
    "pinterest_user_list_following_boards",
    "List boards that the authenticated user is following. Supports cursor-based pagination.",
    {
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(100).optional().describe("Number of results per page (max 100)"),
      explicit_following: z.boolean().optional().describe("Return only explicitly followed boards"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/user_account/following/boards", {
        bookmark: params.bookmark,
        page_size: params.page_size,
        explicit_following: params.explicit_following,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_follow ────────────────────────────────────────
  server.tool(
    "pinterest_user_follow",
    "Follow a Pinterest user by username.",
    {
      username: z.string().describe("The Pinterest username to follow (without @)"),
    },
    async (params) => {
      const data = await pinterestPost(`/user_account/following/${encodeURIComponent(params.username)}`);
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_list_websites ─────────────────────────────────
  server.tool(
    "pinterest_user_list_websites",
    "List websites claimed/verified by the authenticated user's Pinterest account.",
    {},
    async () => {
      const data = await pinterestGet("/user_account/websites");
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_verify_website ────────────────────────────────
  server.tool(
    "pinterest_user_verify_website",
    "Verify a website for the authenticated user's Pinterest account using a verification code.",
    {
      website: z.string().describe("The website URL to verify"),
      verification_code: z.string().describe("The verification code (from pinterest_user_get_verification_code)"),
    },
    async (params) => {
      const data = await pinterestPost("/user_account/websites", {
        website: params.website,
        verification_code: params.verification_code,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_unverify_website ──────────────────────────────
  server.tool(
    "pinterest_user_unverify_website",
    "Remove/unverify a website from the authenticated user's Pinterest account.",
    {
      website: z.string().describe("The website URL to unverify"),
    },
    async (params) => {
      const data = await pinterestDelete("/user_account/websites", { website: params.website });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_get_verification_code ─────────────────────────
  server.tool(
    "pinterest_user_get_verification_code",
    "Get a metatag/DNS verification code to use for verifying a website on the authenticated user's Pinterest account.",
    {},
    async () => {
      const data = await pinterestGet("/user_account/websites/verification");
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_user_list_following_interests ───────────────────────
  server.tool(
    "pinterest_user_list_following_interests",
    "Get interests that a user follows. Returns interest categories followed by the specified username.",
    {
      username: z.string().describe("Pinterest username to get followed interests for"),
    },
    async (params) => {
      const data = await pinterestGet(`/users/${encodeURIComponent(params.username)}/interests/follow`);
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );
}
