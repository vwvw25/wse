// Asset categories are dynamic — each is the name of a top-level sub-folder inside
// the Drive `Assets/` folder, stored lowercased in `assets.category`. There is no
// fixed list. These helpers are just for display and for the one behavioural
// branch (video assets get an extra "hosted video link" field).

/** Title-case a category / folder name for headings: "bio" -> "Bio", "pli pat" -> "Pli Pat". */
export function prettyCategory(category: string): string {
  return category
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ')
}

/** Video assets show an extra field for a hosted-video-platform link (YouTube/Vimeo). */
export function isVideoCategory(category: string): boolean {
  return /video/i.test(category)
}

/** Google Drive's unauthenticated thumbnail endpoint (works once the folder is link-shared). */
export function driveThumbnailUrl(driveFileId: string, size = 'w400'): string {
  return `https://drive.google.com/thumbnail?id=${driveFileId}&sz=${size}`
}

/** Human-openable view link for a Drive file. */
export function driveViewUrl(driveFileId: string): string {
  return `https://drive.google.com/file/d/${driveFileId}/view`
}

/** Pull the folder id out of a pasted Drive folder URL (or accept a bare id). */
export function parseDriveFolderId(input: string): string | null {
  const s = input.trim()
  if (!s) return null
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s
  return null
}
