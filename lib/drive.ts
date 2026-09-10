// Read-only Google Drive access via a service account (no user OAuth).
// Env: GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY (the client_email / private_key from
// the service-account JSON key). Hand-rolled with fetch + built-in crypto, matching
// the style of lib/gmail.ts — no googleapis dependency.

import crypto from 'crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export async function getDriveAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SA_EMAIL
  const rawKey = process.env.GOOGLE_SA_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error('GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY not set')
  }
  const privateKey = rawKey.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }))
  const signingInput = `${header}.${claim}`
  const signature = base64url(crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey))
  const jwt = `${signingInput}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const json = await res.json()
  if (!json.access_token) throw new Error(`Drive token exchange failed: ${JSON.stringify(json)}`)
  return json.access_token as string
}

interface RawEntry { id: string; name: string; mimeType: string }

async function listChildren(folderId: string, token: string): Promise<RawEntry[]> {
  const out: RawEntry[] = []
  let pageToken: string | undefined
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (json.error) throw new Error(`Drive list failed: ${json.error.message}`)
    out.push(...(json.files ?? []))
    pageToken = json.nextPageToken
  } while (pageToken)
  return out
}

export interface DriveFile {
  driveId: string
  name: string
  mimeType: string
  category: string    // first-level folder under the root, lowercased
  tagPath: string[]   // intermediate folder names below the category, lowercased
}

/**
 * BFS the folder tree under `rootId`. Top-level sub-folders become categories;
 * files anywhere beneath a category folder belong to it, with the intervening
 * sub-folder names as `tagPath`. Files sitting directly in the root are ignored.
 */
export async function walkDriveFolder(rootId: string, token: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  const queue: { id: string; category: string; tagPath: string[] }[] = []

  for (const c of await listChildren(rootId, token)) {
    if (c.mimeType === FOLDER_MIME) {
      queue.push({ id: c.id, category: c.name.trim().toLowerCase(), tagPath: [] })
    }
  }

  while (queue.length) {
    const { id, category, tagPath } = queue.shift()!
    for (const c of await listChildren(id, token)) {
      if (c.mimeType === FOLDER_MIME) {
        queue.push({ id: c.id, category, tagPath: [...tagPath, c.name.trim().toLowerCase()] })
      } else {
        files.push({ driveId: c.id, name: c.name, mimeType: c.mimeType, category, tagPath })
      }
    }
  }
  return files
}

export function stripExtension(filename: string): string {
  return filename.replace(/\.[a-z0-9]{1,8}$/i, '')
}
