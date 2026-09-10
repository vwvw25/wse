# Assets & bundles flow

How a band asset gets stored once and reused when an agent asks for promo material
or compliance documents.

## Why this exists

Agents repeatedly request the same things — photos, videos, MP3s, bio, logo, PLI
insurance, PAT, riders. Before this, each request meant opening a file store, working
out what to send, and copying links by hand. The Assets library is a single filterable
list of every asset's **link**; bundles are saved selections; the copy block turns a
selection into email-ready HTML + plain text.

**Assets are links only** — nothing is hosted or uploaded. An asset row holds a Google
Drive URL (and, for video, an optional YouTube/Vimeo URL), not a file.

## The Drive mirror

The library mirrors a Google Drive folder so entries don't have to be typed in one at
a time. A **service account** (`lib/drive.ts`, env `GOOGLE_SA_EMAIL` /
`GOOGLE_SA_PRIVATE_KEY`, scope `drive.readonly`) walks the folder whose id is in
`asset_settings.drive_folder_id`:

- top-level sub-folders → **category** (lowercased folder name — freeform, no enum)
- files anywhere beneath → an asset (`name` = filename without extension,
  `drive_url` = `https://drive.google.com/file/d/<id>/view`, `drive_file_id` = the
  Drive id, `source = 'drive'`)
- intermediate sub-folder names → **tags** (set on first import only)

Curation happens in Drive: the `Assets/` folder holds only what should show. There is
no staging/review screen — sync just reconciles.

**Sync reconciliation** (`POST /api/admin/assets/sync`, matched on `drive_file_id`):

| Case | Effect |
|---|---|
| file not seen before | insert |
| known file, folder or link changed | update `category` / `drive_url` only |
| known asset, file gone from Drive | set `missing_from_drive = true` (never auto-deleted) |
| known file reappears | clear `missing_from_drive` |

**Invariant: sync never overwrites a human edit.** `name`, `description`, `tags`,
`video_url`, `is_public`, `sort_order` are only ever written by the admin UI (or by the
initial insert). Re-syncing touches nothing else.

Thumbnails and view links are **derived from `drive_file_id`, not stored**:
`https://drive.google.com/thumbnail?id=<id>&sz=w400` and `.../file/d/<id>/view`. Both
need the folder set to "anyone with the link → Viewer" (which is also what lets agents
open the links).

## Entry points

- **[/admin/assets](../../app/admin/assets/page.tsx)** — the library. Server component
  loads `assets`, `asset_bundles`, `asset_bundle_items`, `asset_settings`; the rest is
  client state in [AssetsClient.tsx](../../app/admin/assets/AssetsClient.tsx) (filter,
  multi-select, copy, "Sync from Drive" button, Drive-folder setup input).
- **[POST /api/admin/assets/sync](../../app/api/admin/assets/sync/route.ts)** — the
  reconcile. Vercel Hobby 10s cap applies; a few hundred files is fine (tens of Drive
  calls). If a tree grows large, switch to one-category-per-request.

## Files in order

1. [lib/drive.ts](../../lib/drive.ts) — `getDriveAccessToken()` (service-account JWT
   signed with built-in `crypto`, no `googleapis` dep — mirrors
   [lib/gmail.ts](../../lib/gmail.ts)), `walkDriveFolder()` (BFS), `stripExtension()`.
2. [lib/asset-categories.ts](../../lib/asset-categories.ts) — display/behaviour helpers
   only: `prettyCategory`, `isVideoCategory` (`/video/i`), `driveThumbnailUrl`,
   `driveViewUrl`, `parseDriveFolderId`.
3. [app/admin/assets/actions.ts](../../app/admin/assets/actions.ts) — `createAsset` /
   `updateAsset` / `deleteAsset` / `bulkDeleteAssets`, `saveDriveFolder`, and
   `createBundle` / `updateBundle` / `deleteBundle` (`replaceBundleItems` rewrites the
   join rows on every save).
4. [lib/asset-bundle-html.ts](../../lib/asset-bundle-html.ts) — `buildBundleBlock()` →
   `{ html, text }`. No font on the HTML (inherits the email body's font, same rule as
   [lib/quote-html.ts](../../lib/quote-html.ts)). Video assets with a `video_url` render
   as "watch · download". Clipboard write in `AssetsClient` mirrors
   `EmailComposer.handleCopy` (a `ClipboardItem` with `text/html` + `text/plain`).

## Tables written

| Table | Written by |
|---|---|
| `assets` | sync route (insert / limited update / `missing_from_drive`); admin UI actions (everything else) |
| `asset_bundles` | `createBundle` / `updateBundle` / `deleteBundle` |
| `asset_bundle_items` | `replaceBundleItems` (delete-all-then-insert per bundle save) |
| `asset_settings` | `saveDriveFolder` (folder id), sync route (`last_synced_at`) |

No storage buckets.

## Gotchas

- Categories are freeform Drive folder names — a typo in a folder name makes a new
  category. `isVideoCategory` is a regex (`/video/i`), so `Videos`, `Video`, `Live
  video` all get the hosted-video-link field.
- The service-account key's `private_key` has literal `\n` when pasted into an env var;
  `getDriveAccessToken` does `.replace(/\\n/g, '\n')`.
- Superseded the earlier uncommitted `documents` feature (which uploaded files) —
  `migrate-assets.sql` folds any `documents` rows' name + link into `assets`.
