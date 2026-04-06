import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { pinterestGet, pinterestPost, pinterestPatch, pinterestDelete, formatResponse } from "../api.js";

export function registerBoardsTools(server: McpServer): void {

  // ── pinterest_boards_create ──────────────────────────────────────
  server.tool(
    "pinterest_boards_create",
    "Create a new Pinterest board. Optionally set description, privacy (PUBLIC/SECRET/PROTECTED), and whether it's a collaborative board.",
    {
      name: z.string().describe("Board name (max 180 characters)"),
      description: z.string().optional().describe("Board description"),
      privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("Board privacy setting (default: PUBLIC)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { ad_account_id, ...body } = params;
      const data = await pinterestPost("/boards", body, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_list ────────────────────────────────────────
  server.tool(
    "pinterest_boards_list",
    "List boards owned by the authenticated user. Supports filtering by privacy and cursor-based pagination.",
    {
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      privacy: z.enum(["ALL", "PROTECTED", "PUBLIC", "PUBLIC_AND_SECRET", "SECRET"]).optional().describe("Filter boards by privacy setting"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet("/boards", {
        bookmark: params.bookmark,
        page_size: params.page_size,
        privacy: params.privacy,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_get ─────────────────────────────────────────
  server.tool(
    "pinterest_boards_get",
    "Get details of a specific board including name, description, pin count, follower count, and privacy setting.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet(`/boards/${encodeURIComponent(params.board_id)}`, {
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_update ──────────────────────────────────────
  server.tool(
    "pinterest_boards_update",
    "Update a board's name, description, or privacy setting.",
    {
      board_id: z.string().describe("The unique identifier of the board to update"),
      name: z.string().optional().describe("New board name"),
      description: z.string().optional().describe("New board description"),
      privacy: z.enum(["PUBLIC", "PROTECTED", "SECRET"]).optional().describe("New privacy setting"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { board_id, ad_account_id, ...body } = params;
      const data = await pinterestPatch(`/boards/${encodeURIComponent(board_id)}`, body, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_delete ──────────────────────────────────────
  server.tool(
    "pinterest_boards_delete",
    "Permanently delete a board and all its pins. This action cannot be undone.",
    {
      board_id: z.string().describe("The unique identifier of the board to delete"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestDelete(`/boards/${encodeURIComponent(params.board_id)}`, {
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_list_pins ───────────────────────────────────
  server.tool(
    "pinterest_boards_list_pins",
    "List all pins on a specific board. Supports filtering by creative type and cursor-based pagination.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      creative_types: z.array(z.string()).optional().describe("Filter by creative type (e.g. REGULAR, VIDEO, SHOPPING, CAROUSEL)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
      pin_metrics: z.boolean().optional().describe("Include pin metrics"),
    },
    async (params) => {
      const data = await pinterestGet(`/boards/${encodeURIComponent(params.board_id)}/pins`, {
        bookmark: params.bookmark,
        page_size: params.page_size,
        creative_types: params.creative_types?.join(","),
        ad_account_id: params.ad_account_id,
        pin_metrics: params.pin_metrics,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_create_section ─────────────────────────────
  server.tool(
    "pinterest_boards_create_section",
    "Create a new section within a board to organize pins.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      name: z.string().describe("Section name (max 180 characters)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { board_id, ad_account_id, name } = params;
      const data = await pinterestPost(`/boards/${encodeURIComponent(board_id)}/sections`, { name }, { ad_account_id });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_list_sections ──────────────────────────────
  server.tool(
    "pinterest_boards_list_sections",
    "List all sections within a board.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestGet(`/boards/${encodeURIComponent(params.board_id)}/sections`, {
        bookmark: params.bookmark,
        page_size: params.page_size,
        ad_account_id: params.ad_account_id,
      });
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_update_section ─────────────────────────────
  server.tool(
    "pinterest_boards_update_section",
    "Update the name of a board section.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      section_id: z.string().describe("The unique identifier of the section to update"),
      name: z.string().describe("New section name"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const { board_id, section_id, ad_account_id, name } = params;
      const data = await pinterestPatch(
        `/boards/${encodeURIComponent(board_id)}/sections/${encodeURIComponent(section_id)}`,
        { name },
        { ad_account_id }
      );
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_delete_section ─────────────────────────────
  server.tool(
    "pinterest_boards_delete_section",
    "Delete a board section. Pins in the section are moved to the main board, not deleted.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      section_id: z.string().describe("The unique identifier of the section to delete"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
    },
    async (params) => {
      const data = await pinterestDelete(
        `/boards/${encodeURIComponent(params.board_id)}/sections/${encodeURIComponent(params.section_id)}`,
        { ad_account_id: params.ad_account_id }
      );
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );

  // ── pinterest_boards_list_section_pins ──────────────────────────
  server.tool(
    "pinterest_boards_list_section_pins",
    "List all pins in a specific board section. Supports cursor-based pagination.",
    {
      board_id: z.string().describe("The unique identifier of the board"),
      section_id: z.string().describe("The unique identifier of the section"),
      bookmark: z.string().optional().describe("Cursor for next page"),
      page_size: z.number().int().min(1).max(250).optional().describe("Number of results per page (max 250)"),
      ad_account_id: z.string().optional().describe("Ad account ID"),
      pin_metrics: z.boolean().optional().describe("Include pin metrics"),
    },
    async (params) => {
      const data = await pinterestGet(
        `/boards/${encodeURIComponent(params.board_id)}/sections/${encodeURIComponent(params.section_id)}/pins`,
        {
          bookmark: params.bookmark,
          page_size: params.page_size,
          ad_account_id: params.ad_account_id,
          pin_metrics: params.pin_metrics,
        }
      );
      return { content: [{ type: "text", text: formatResponse(data) }] };
    }
  );
}
