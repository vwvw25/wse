import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getDriveAccessToken, walkDriveFolder, stripExtension } from '@/lib/drive'
import { driveViewUrl } from '@/lib/asset-categories'

// Vercel Hobby caps this at 10s regardless of maxDuration. A BFS sync of a few
// hundred files is tens of fast Drive calls — fine. If a tree ever grows past
// that, switch to syncing one category folder per request (client loops).
export const maxDuration = 60

export async function POST() {
  const supabase = createServiceClient()

  const { data: settings } = await supabase
    .from('asset_settings')
    .select('drive_folder_id')
    .eq('id', 1)
    .single()
  const folderId = settings?.drive_folder_id
  if (!folderId) {
    return NextResponse.json({ error: 'No Drive folder configured' }, { status: 400 })
  }

  let files
  try {
    const token = await getDriveAccessToken()
    files = await walkDriveFolder(folderId, token)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Drive sync failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const { data: existing } = await supabase
    .from('assets')
    .select('id, drive_file_id, category, drive_url, missing_from_drive')
    .eq('source', 'drive')
  const byDriveId = new Map((existing ?? []).map(a => [a.drive_file_id as string, a]))

  const seen = new Set<string>()
  const toInsert: Record<string, unknown>[] = []
  const toUpdate: { id: string; category: string; drive_url: string }[] = []

  for (const f of files) {
    seen.add(f.driveId)
    const url = driveViewUrl(f.driveId)
    const cur = byDriveId.get(f.driveId)
    if (!cur) {
      toInsert.push({
        name: stripExtension(f.name),
        category: f.category,
        tags: Array.from(new Set(f.tagPath)),
        drive_url: url,
        drive_file_id: f.driveId,
        source: 'drive',
      })
    } else if (cur.category !== f.category || cur.drive_url !== url || cur.missing_from_drive) {
      toUpdate.push({ id: cur.id, category: f.category, drive_url: url })
    }
  }

  const missingIds = (existing ?? [])
    .filter(a => a.drive_file_id && !seen.has(a.drive_file_id) && !a.missing_from_drive)
    .map(a => a.id)

  if (toInsert.length) {
    const { error } = await supabase.from('assets').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  for (const u of toUpdate) {
    await supabase
      .from('assets')
      .update({
        category: u.category,
        drive_url: u.drive_url,
        missing_from_drive: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', u.id)
  }
  if (missingIds.length) {
    await supabase.from('assets').update({ missing_from_drive: true }).in('id', missingIds)
  }

  await supabase
    .from('asset_settings')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', 1)

  return NextResponse.json({
    added: toInsert.length,
    updated: toUpdate.length,
    missing: missingIds.length,
    total: files.length,
  })
}
