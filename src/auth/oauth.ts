#!/usr/bin/env node
/**
 * Pinterest OAuth 2.0 one-time authorization script.
 * Run: npm run auth
 *
 * Spins up a local Express server on port 3052, opens the browser to the
 * Pinterest OAuth page, catches the redirect, exchanges the code for tokens
 * (with continuous_refresh=true), and writes tokens.json.
 */

import express from "express";
import { createServer } from "http";
import fs from "fs";
import path from "path";
import os from "os";
import { writeTokens } from "./token-manager.js";

const PORT = 3052;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const PINTEREST_AUTH_URL = "https://www.pinterest.com/oauth/";
const PINTEREST_TOKEN_URL = "https://api.pinterest.com/v5/oauth/token";

const SCOPES = [
  "user_accounts:read",
  "user_accounts:write",
  "pins:read",
  "pins:read_secret",
  "pins:write",
  "pins:write_secret",
  "boards:read",
  "boards:read_secret",
  "boards:write",
  "boards:write_secret",
  "catalogs:read",
  "catalogs:write",
  "ads:read",
  "ads:write",
].join(",");

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
    const credentials = Buffer.from(`${appId}:${appSecret}`).toString("base64");
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      continuous_refresh: "true",
    });

    const response = await fetch(PINTEREST_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Token exchange failed (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      refresh_token_expires_in: number;
      scope: string;
    };

    const now = Math.floor(Date.now() / 1000);
    writeTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      access_token_expires_at: now + data.expires_in,
      refresh_token_expires_at: now + data.refresh_token_expires_in,
      scope: data.scope,
      updated_at: new Date().toISOString(),
    });

    const tokenPath = process.env.PINTEREST_TOKEN_PATH ?? "~/pinterest_mcp/auth/tokens.json";
    const resolvedPath = tokenPath.startsWith("~/")
      ? path.join(os.homedir(), tokenPath.slice(2))
      : tokenPath;

    console.log(`\n✅ Authorization successful!`);
    console.log(`   Tokens written to: ${resolvedPath}`);
    console.log(`   Scope: ${data.scope}`);
    console.log(`   Access token expires in: ${Math.floor(data.expires_in / 3600)}h`);
    console.log(`   Refresh token expires in: ${Math.floor(data.refresh_token_expires_in / 86400)} days`);

    res.send(`
      <h2>✅ Pinterest authorization successful!</h2>
      <p>Tokens have been saved. You can close this window and return to the terminal.</p>
      <p><strong>Scope granted:</strong> ${data.scope}</p>
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
  const authUrl = new URL(PINTEREST_AUTH_URL);
  authUrl.searchParams.set("client_id", appId as string);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPES);

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
