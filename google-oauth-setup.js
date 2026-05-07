#!/usr/bin/env node
/**
 * One-time OAuth2 setup for WSE agents to access wardmusic@gmail.com Google Drive.
 * Run this once: node google-oauth-setup.js
 * It will open a browser window, you log in as wardmusic@gmail.com, and it saves a token.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');

const CLIENT_SECRET_PATH = path.join(__dirname, 'Google keys', 'client_secret_305564376620-cgg7912qrok50jlp54bl1bghmpatdf6a.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(__dirname, 'Google keys', 'wardmusic-oauth-token.json');

const credentials = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
const { client_id, client_secret, redirect_uris } = credentials.installed;

// Scopes needed: full Drive access (read/write)
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

const REDIRECT_PORT = 8765;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${encodeURIComponent(client_id)}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent(SCOPES)}` +
  `&access_type=offline` +
  `&prompt=consent`;

console.log('\n=== WSE Agents - Google Drive OAuth Setup ===\n');
console.log('Opening browser to authorise wardmusic@gmail.com access...');
console.log('If browser does not open, visit:\n');
console.log(authUrl);
console.log('\n');

// Open browser
try {
  execSync(`open "${authUrl}"`);
} catch (e) {
  console.log('Could not auto-open browser. Please visit the URL above manually.');
}

// Start local server to catch the redirect
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(400);
    res.end(`<h1>Error: ${error}</h1>`);
    console.error('OAuth error:', error);
    server.close();
    return;
  }

  if (!code) {
    res.writeHead(400);
    res.end('<h1>No code received</h1>');
    return;
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id,
      client_secret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (tokens.error) {
    res.writeHead(500);
    res.end(`<h1>Token error: ${tokens.error}</h1><p>${tokens.error_description}</p>`);
    console.error('Token error:', tokens);
    server.close();
    return;
  }

  // Save tokens
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

  res.writeHead(200);
  res.end('<h1>✅ Authorisation successful!</h1><p>You can close this tab. Token saved.</p>');

  console.log('\n✅ Success! Token saved to:');
  console.log(TOKEN_PATH);
  console.log('\nToken details:');
  console.log('  access_token: [present]');
  console.log('  refresh_token:', tokens.refresh_token ? '[present ✓]' : '[MISSING - re-run with prompt=consent]');
  console.log('  token_type:', tokens.token_type);
  console.log('  expires_in:', tokens.expires_in, 'seconds');
  console.log('\nNext step: wire this token into the WSE agents in Paperclip.');

  server.close();
});

server.listen(REDIRECT_PORT, () => {
  console.log(`Waiting for OAuth callback on http://localhost:${REDIRECT_PORT} ...`);
});
