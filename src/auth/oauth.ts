#!/usr/bin/env node
/**
 * Pinterest OAuth 2.0 one-time authorization script.
 * Run: npm run auth
 *
 * Local use only. Production uses the hosted /pinterest/connect flow (src/connect.ts).
 *
 * Spins up a local Express server on port 3052, opens the browser to the
 * Pinterest OAuth page, catches the redirect, exchanges the code for tokens
 * (with continuous_refresh=true), and writes tokens.json.
 */

import express from "express";
import { createServer } from "http";
import { writeTokens, getTokenPath } from "./token-manager.js";
import { buildAuthorizeUrl, exchangeCode } from "./pinterest-oauth.js";

const PORT = 3052;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

const appId = process.env.PINTEREST_APP_ID;
const appSecret = process.env.PINTEREST_APP_SECRET;

if (!appId || !appSecret) {
  console.error("Error: PINTEREST_APP_ID and PINTEREST_APP_SECRET env vars are required.");
  console.error("Set them before running: PINTEREST_APP_ID=xxx PINTEREST_APP_SECRET=yyy npm run auth");
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);

app.get("/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error || !code) {
    res.send(`<h2>Authorization failed: ${error ?? "no code returned"}</h2>`);
    setTimeout(() => process.exit(1), 500);
    return;
  }

  try {
    const tokens = await exchangeCode(code, REDIRECT_URI);
    writeTokens(tokens);
    const resolvedPath = getTokenPath();
    const expiresIn = tokens.access_token_expires_at - Math.floor(Date.now() / 1000);
    const refreshExpiresIn = tokens.refresh_token_expires_at - Math.floor(Date.now() / 1000);

    console.log(`\n✅ Authorization successful!`);
    console.log(`   Tokens written to: ${resolvedPath}`);
    console.log(`   Scope: ${tokens.scope}`);
    console.log(`   Access token expires in: ${Math.floor(expiresIn / 3600)}h`);
    console.log(`   Refresh token expires in: ${Math.floor(refreshExpiresIn / 86400)} days`);

    res.send(`
      <h2>✅ Pinterest authorization successful!</h2>
      <p>Tokens have been saved. You can close this window and return to the terminal.</p>
      <p><strong>Scope granted:</strong> ${tokens.scope}</p>
    `);

    setTimeout(() => {
      httpServer.close();
      process.exit(0);
    }, 1000);
  } catch (err) {
    console.error("Token exchange error:", err);
    res.send(`<h2>Error: ${err instanceof Error ? err.message : String(err)}</h2>`);
    setTimeout(() => process.exit(1), 500);
  }
});

httpServer.listen(PORT, async () => {
  const authUrl = new URL(buildAuthorizeUrl(appId as string, REDIRECT_URI));

  console.log(`\n🔐 Pinterest OAuth Authorization`);
  console.log(`   App ID: ${appId}`);
  console.log(`   Redirect URI: ${REDIRECT_URI}`);
  console.log(`\n   Opening browser to Pinterest OAuth page...`);
  console.log(`   If browser doesn't open, visit:\n   ${authUrl.toString()}\n`);

  try {
    const { default: open } = await import("open");
    await open(authUrl.toString());
  } catch {
    console.log("   (Could not open browser automatically — please copy the URL above)");
  }
});
