# Pinterest MCP Server

MCP server for the Pinterest API v5. Gives Claude direct access to manage pins, boards, analytics, search, and media uploads for FYDELITY's Pinterest account.

**App:** Pin_Fydelity_MCP (App ID: 1517658)
**API:** Pinterest API v5.23.0
**Auth:** OAuth 2.0 with continuous refresh tokens
**Phase:** 1: Organic tools only (42 tools)

---

## Tools (42 total)

### User (14 tools)
- `pinterest_user_get_account`: Get account details
- `pinterest_user_get_analytics`: Account analytics by date range
- `pinterest_user_get_top_pins`: Top-performing pins
- `pinterest_user_get_top_video_pins`: Top video pins
- `pinterest_user_list_businesses`: Connected business accounts
- `pinterest_user_list_followers`: Follower list
- `pinterest_user_list_following`: Following list
- `pinterest_user_list_following_boards`: Boards the user follows
- `pinterest_user_follow`: Follow a user
- `pinterest_user_list_websites`: Verified websites
- `pinterest_user_verify_website`: Verify a website
- `pinterest_user_unverify_website`: Remove website verification
- `pinterest_user_get_verification_code`: Get website verification metatag
- `pinterest_user_list_following_interests`: Interests followed by a user

### Pins (11 tools)
- `pinterest_pins_create`: Create a new pin
- `pinterest_pins_list`: List owned pins
- `pinterest_pins_get`: Get pin details + optional metrics
- `pinterest_pins_update`: Update pin metadata
- `pinterest_pins_delete`: Delete a pin
- `pinterest_pins_save`: Repin to a board
- `pinterest_pins_get_analytics`: Analytics for one pin
- `pinterest_pins_get_multi_analytics`: Analytics for multiple pins
- `pinterest_pins_add_product_tags`: Add shoppable product tags
- `pinterest_pins_list_product_tags`: List product tags on a pin
- `pinterest_pins_delete_product_tags`: Remove product tags in bulk

### Boards (11 tools)
- `pinterest_boards_create`: Create a board
- `pinterest_boards_list`: List boards
- `pinterest_boards_get`: Get board details
- `pinterest_boards_update`: Update board metadata
- `pinterest_boards_delete`: Delete a board
- `pinterest_boards_list_pins`: List pins on a board
- `pinterest_boards_create_section`: Create a board section
- `pinterest_boards_list_sections`: List board sections
- `pinterest_boards_update_section`: Rename a section
- `pinterest_boards_delete_section`: Delete a section
- `pinterest_boards_list_section_pins`: List pins in a section

### Search (3 tools)
- `pinterest_search_pins`: Search pins
- `pinterest_search_boards`: Search boards
- `pinterest_search_partner_pins`: Search partner/promoted pins

### Media (3 tools)
- `pinterest_media_register_upload`: Register a video upload, get upload URL
- `pinterest_media_get_status`: Check upload processing status
- `pinterest_media_list`: List all media uploads

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

Every refreshed token set is written back atomically (temp file, fsync, rename), so the rotated refresh token survives restarts. Concurrent requests share one refresh call, and the file is re-read before refreshing in case another process already rotated it.

---

## Remote connector (Streamable HTTP)

`dist/http.js` serves the same 42 tools over stateless Streamable HTTP (a fresh server per request), authenticated with WorkOS AuthKit OAuth. Same pattern as `amazon-sp-api-mcp-server` v1.1.0. The stdio entry (`dist/index.js`) still works unchanged.

### Routes

| Route | Auth | Purpose |
|---|---|---|
| `GET /healthz` | none | Railway healthcheck |
| `GET /.well-known/oauth-protected-resource` | none | RFC 9728 metadata pointing clients at AuthKit |
| `POST /mcp` | WorkOS bearer token | MCP endpoint. 401 carries `WWW-Authenticate` with `resource_metadata` |
| `GET /pinterest/connect` | HTTP Basic (`PINTEREST_CONNECT_PASSWORD`, any username) | Redirects to Pinterest authorize with all 14 scopes and a single-use state (10 minute expiry) |
| `GET /pinterest/callback` | state check | Exchanges the code, saves tokens to `PINTEREST_TOKEN_PATH`, shows the connected username |

### Environment variables

| Variable | Required | Production value / notes |
|---|---|---|
| `PINTEREST_APP_ID` | yes | `1517658` |
| `PINTEREST_APP_SECRET` | yes | Pinterest app secret |
| `PINTEREST_TOKEN_PATH` | yes on Railway | `/data/tokens.json` (default locally: `~/pinterest_mcp/auth/tokens.json`) |
| `PINTEREST_API_BASE` | no | Default `https://api.pinterest.com/v5`. Never switched to sandbox automatically |
| `PINTEREST_REDIRECT_URI` | yes for connect | `https://pinterest.meminent.ai/pinterest/callback` |
| `PINTEREST_CONNECT_PASSWORD` | yes for connect | Long random string. Without it (or the redirect URI) the connect routes return 503 |
| `AUTHKIT_DOMAIN` | yes | Shared AuthKit domain used by brain-v2, faire, amazon-sp |
| `MCP_RESOURCE_URL` | yes | `https://pinterest.meminent.ai/mcp`. Must match the resource registered in WorkOS AuthKit |
| `ALLOWED_WORKOS_SUBS` | yes | Comma-separated WorkOS user ids allowed to connect |
| `PORT` | no | Railway sets it. Default 8080 |
| `MAX_PAYLOAD_BYTES` | no | Default 1048576 |

See `.env.example` for the full list.

### Railway

- Builder: `Dockerfile` (Node 22 slim, multi-stage). `railway.json` starts `node dist/http.js` with healthcheck `/healthz`, one replica.
- Attach a volume mounted at `/data` and set `PINTEREST_TOKEN_PATH=/data/tokens.json`. Without the volume, rotated refresh tokens are lost on every redeploy.
- Keep `numReplicas` at 1: OAuth state and the refresh lock live in process memory.

### Pinterest app redirect URI

Register this redirect URI in the Pinterest developer app (id 1517658), exactly:

```
https://pinterest.meminent.ai/pinterest/callback
```

Keep `http://localhost:3052/callback` registered too if you still use `npm run auth` locally.

Then open `https://pinterest.meminent.ai/pinterest/connect`, enter the connect password, approve on Pinterest, and confirm the page shows the expected username.

### Add the connector in Claude

1. The resource `https://pinterest.meminent.ai/mcp` must be registered in WorkOS AuthKit first (same step as amazon-sp).
2. In Claude, open Settings, then Connectors, then Add custom connector.
3. Enter the URL `https://pinterest.meminent.ai/mcp` and save.
4. Click Connect and sign in through AuthKit with an allowlisted WorkOS user.

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
