#!/usr/bin/env node
/**
 * Google Drive helper for WSE agents.
 * Uses OAuth2 tokens stored in GOOGLE_OAUTH_TOKEN_PATH.
 *
 * Usage: node gdrive-helper.js <command> [args]
 *
 * Commands:
 *   list [folderId]     - List files (defaults to root My Drive)
 *   search <query>      - Search for files by name
 *   read <fileId>       - Read a file's content (text/Google Doc)
 *   info <fileId>       - Get file metadata
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const TOKEN_PATH = process.env.GOOGLE_OAUTH_TOKEN_PATH;
const CLIENT_SECRET_PATH = process.env.GOOGLE_CLIENT_SECRET_PATH;

if (!TOKEN_PATH || !CLIENT_SECRET_PATH) {
  console.error('Error: GOOGLE_OAUTH_TOKEN_PATH and GOOGLE_CLIENT_SECRET_PATH must be set');
  process.exit(1);
}

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
  const secrets = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH));
  const { client_id, client_secret } = secrets.installed;

  // Check if access token is still valid (with 60s buffer)
  if (tokens.expiry_date && Date.now() < tokens.expiry_date - 60000) {
    return tokens.access_token;
  }

  // Refresh the token
  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token: tokens.refresh_token,
    grant_type: 'refresh_token',
  }).toString();

  const res = await httpsRequest({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
  }, body);

  if (res.body.error) throw new Error(`Token refresh failed: ${res.body.error}`);

  // Save updated tokens
  const updated = { ...tokens, ...res.body, expiry_date: Date.now() + res.body.expires_in * 1000 };
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(updated, null, 2));
  return updated.access_token;
}

async function driveRequest(accessToken, path, params = {}) {
  const query = new URLSearchParams(params).toString();
  const fullPath = `/drive/v3${path}${query ? '?' + query : ''}`;
  const res = await httpsRequest({
    hostname: 'www.googleapis.com',
    path: fullPath,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  return res.body;
}

async function main() {
  const [,, command, ...args] = process.argv;

  const token = await getAccessToken();

  if (command === 'list') {
    const folderId = args[0] || 'root';
    const result = await driveRequest(token, '/files', {
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime,size)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });
    console.log(JSON.stringify(result.files || result, null, 2));

  } else if (command === 'search') {
    const query = args.join(' ');
    const result = await driveRequest(token, '/files', {
      q: `name contains '${query}' and trashed=false`,
      fields: 'files(id,name,mimeType,modifiedTime)',
      pageSize: 20,
    });
    console.log(JSON.stringify(result.files || result, null, 2));

  } else if (command === 'info') {
    const fileId = args[0];
    const result = await driveRequest(token, `/files/${fileId}`, {
      fields: 'id,name,mimeType,modifiedTime,size,parents,webViewLink',
    });
    console.log(JSON.stringify(result, null, 2));

  } else if (command === 'read') {
    const fileId = args[0];
    // For Google Docs, export as plain text
    const info = await driveRequest(token, `/files/${fileId}`, { fields: 'mimeType,name' });

    let exportPath;
    if (info.mimeType === 'application/vnd.google-apps.document') {
      exportPath = `/drive/v3/files/${fileId}/export?mimeType=text/plain`;
    } else {
      exportPath = `/drive/v3/files/${fileId}?alt=media`;
    }

    const res = await new Promise((resolve, reject) => {
      https.get(`https://www.googleapis.com${exportPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    console.log(res);

  } else {
    console.log('Commands: list [folderId] | search <query> | info <fileId> | read <fileId>');
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
