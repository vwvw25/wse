// Builds the copy-to-clipboard block for a set of assets — pasted into an email
// (Gmail) when an agent asks for promo material / documents.
//
// Assets are links only (Google Drive, YouTube, etc.) — nothing is hosted here.
// Most assets have a single Drive link. Video assets may also carry a hosted-video
// link (YouTube/Vimeo); when present it's rendered as a "watch" link alongside the
// Drive "download" link.
//
// Two representations are produced:
//  - html: rich list, no font-family/font-size so it inherits the surrounding
//    email body's font (same rule as lib/quote-html.ts).
//  - text: plain lines, for plain-text paste targets.

export interface BundleAsset {
  id: string
  name: string
  description: string | null
  drive_url: string | null
  video_url: string | null
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildBundleBlock(
  assets: BundleAsset[],
  opts: { heading?: string } = {},
): { html: string; text: string } {
  const heading = opts.heading ?? 'Ward Smith Entertainment — media & documents'

  // ── HTML ──
  let html = `<div style="color:#111;line-height:1.6;">`
  html += `<p style="margin:0 0 8px;"><strong>${esc(heading)}</strong></p>`
  html += `<ul style="margin:0;padding:0 0 0 20px;">`
  for (const a of assets) {
    html += `<li style="margin:0 0 6px;">`
    if (a.video_url && a.drive_url) {
      html += `${esc(a.name)}`
      if (a.description) html += ` — ${esc(a.description)}`
      html += ` (<a href="${esc(a.video_url)}">watch</a> · <a href="${esc(a.drive_url)}">download</a>)`
    } else {
      const url = a.video_url || a.drive_url
      html += url ? `<a href="${esc(url)}">${esc(a.name)}</a>` : esc(a.name)
      if (a.description) html += ` — ${esc(a.description)}`
    }
    html += `</li>`
  }
  html += `</ul></div>`

  // ── Plain text ──
  const text = [
    heading,
    ...assets.map(a => {
      if (a.video_url && a.drive_url) {
        return `${a.name} — watch: ${a.video_url} · download: ${a.drive_url}`
      }
      const url = a.video_url || a.drive_url
      return url ? `${a.name} — ${url}` : a.name
    }),
  ].join('\n')

  return { html, text }
}
