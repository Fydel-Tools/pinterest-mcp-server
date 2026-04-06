# Pinterest MCP Server

MCP server for the Pinterest API v5. Gives Claude direct access to manage pins, boards, analytics, search, and media uploads for FYDELITY's Pinterest account.

**App:** Pin_Fydelity_MCP (App ID: 1517658)
**API:** Pinterest API v5.23.0
**Auth:** OAuth 2.0 with continuous refresh tokens
**Phase:** 1 — Organic tools only (42 tools)

---

## Tools (42 total)

### User (14 tools)
- `pinterest_user_get_account` — Get account details
- `pinterest_user_get_analytics` — Account analytics by date range
- `pinterest_user_get_top_pins` — Top-performing pins
- `pinterest_user_get_top_video_pins` — Top video pins
- `pinterest_user_list_businesses` — Connected business accounts
- `pinterest_user_list_followers` — Follower list
- `pinterest_user_list_following` — Following list
- `pinterest_user_list_following_boards` — Boards the user follows
- `pinterest_user_follow` — Follow a user
- `pinterest_user_list_websites` — Verified websites
- `pinterest_user_verify_website` — Verify a website
- `pinterest_user_unverify_website` — Remove website verification
- `pinterest_user_get_verification_code` — Get website verification metatag
- `pinterest_user_list_following_interests` — Interests followed by a user

### Pins (11 tools)
- `pinterest_pins_create` — Create a new pin
- `pinterest_pins_list` — List owned pins
- `pinterest_pins_get` — Get pin details + optional metrics
- `pinterest_pins_update` — Update pin metadata
- `pinterest_pins_delete` — Delete a pin
- `pinterest_pins_save` — Repin to a board
- `pinterest_pins_get_analytics` — Analytics for one pin
- `pinterest_pins_get_multi_analytics` — Analytics for multiple pins
- `pinterest_pins_add_product_tags` — Add shoppable product tags
- `pinterest_pins_list_product_tags` — List product tags on a pin
- `pinterest_pins_delete_product_tags` — Remove product tags in bulk

### Boards (11 tools)
- `pinterest_boards_create` — Create a board
- `pinterest_boards_list` — List boards
- `pinterest_boards_get` — Get board details
- `pinterest_boards_update` — Update board metadata
- `pinterest_boards_delete` — Delete a board
- `pinterest_boards_list_pins` — List pins on a board
- `pinterest_boards_create_section` — Create a board section
- `pinterest_boards_list_sections` — List board sections
- `pinterest_boards_update_section` — Rename a section
- `pinterest_boards_delete_section` — Delete a section
- `pinterest_boards_list_section_pins` — List pins in a section

### Search (3 tools)
- `pinterest_search_pins` — Search pins
- `pinterest_search_boards` — Search boards
- `pinterest_search_partner_pins` — Search partner/promoted pins

### Media (3 tools)
- `pinterest_media_register_upload` — Register a video upload, get upload URL
- `pinterest_media_get_status` — Check upload processing status
- `pinterest_media_list` — List all media uploads

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Build

```bash
npm run build
```

### 3. Authorize (one-time)

Set your app credentials and run the OAuth flow:

```bash
PINTEREST_APP_ID=1517658 \
PINTEREST_APP_SECRET=your_secret_here \
PINTEREST_TOKEN_PATH=~/pinterest_mcp/auth/tokens.json \
npm run auth
```

This opens a browser window to Pinterest's OAuth page. After you authorize, tokens are written to `~/pinterest_mcp/auth/tokens.json` with `chmod 600`.

**Scopes requested:**
```
user_accounts:read, user_accounts:write,
pins:read, pins:read_secret, pins:write, pins:write_secret,
boards:read, boards:read_secret, boards:write, boards:write_secret,
catalogs:read, catalogs:write,
ads:read, ads:write
```

> **Note:** `catalogs:read/write` and `ads:read/write` are requested for future phases. If your Pinterest app doesn't have these approved yet, the OAuth flow will fail. Remove them from `SCOPES` in `src/auth/oauth.ts` and re-run if needed.

### 4. Claude Desktop config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
"pinterest": {
  "command": "node",
  "args": ["/Users/fydelityphoto/pinterest-mcp-server/dist/index.js"],
  "env": {
    "PINTEREST_APP_ID": "1517658",
    "PINTEREST_APP_SECRET": "<your_secret>",
    "PINTEREST_TOKEN_PATH": "/Users/fydelityphoto/pinterest_mcp/auth/tokens.json"
  }
}
```

---

## Token Management

Pinterest uses OAuth 2.0 with **continuous refresh tokens** (required since Sept 25, 2025).

- **Access tokens:** Valid for ~1 hour. Auto-refreshed when within 24 hours of expiry.
- **Refresh tokens:** Valid for 60 days. Each refresh issues a new refresh token (old one is invalidated). The server warns 7 days before expiry.
- **Token file:** `~/pinterest_mcp/auth/tokens.json` (chmod 600)

The `continuous_refresh=true` parameter is sent on both the initial OAuth code exchange and every refresh call. Without it, refresh tokens expire and are not renewed.

---

## Development

```bash
npm run dev    # TypeScript watch mode
npm run build  # Compile to dist/
npm run auth   # Re-run OAuth flow
```

---

## Phase 2 (future)

- Ads tools (campaigns, ad groups, creatives, ad analytics)
- Catalogs / product groups
- Audience management
