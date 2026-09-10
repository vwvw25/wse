'use server'

import { createServiceClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { parseDriveFolderId } from '@/lib/asset-categories'

export interface AssetRecord {
  id: string
  name: string
  description: string | null
  category: string
  tags: string[]
  drive_url: string | null
  video_url: string | null
  drive_file_id: string | null
  source: 'manual' | 'drive'
  missing_from_drive: boolean
  is_public: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BundleRecord {
  id: string
  name: string
  note: string | null
  created_at: string
  asset_ids: string[]
}

function parseTags(raw: string | null): string[] {
  if (!raw) return []
  return Array.from(
    new Set(
      raw
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    ),
  )
}

function readAssetForm(formData: FormData) {
  return {
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string)?.trim() || null,
    category: ((formData.get('category') as string)?.trim() || 'other').toLowerCase(),
    tags: parseTags(formData.get('tags') as string | null),
    drive_url: (formData.get('drive_url') as string)?.trim() || null,
    video_url: (formData.get('video_url') as string)?.trim() || null,
    is_public: formData.get('is_public') === '1',
    sort_order: Number.parseInt((formData.get('sort_order') as string) || '0', 10) || 0,
  }
}

export async function createAsset(formData: FormData) {
  const supabase = createServiceClient()
  const { error } = await supabase.from('assets').insert({ ...readAssetForm(formData), source: 'manual' })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/assets')
}

export async function updateAsset(id: string, formData: FormData) {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from('assets')
    .update({ ...readAssetForm(formData), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/assets')
}

export async function deleteAsset(id: string) {
  const supabase = createServiceClient()
  await supabase.from('assets').delete().eq('id', id)
  revalidatePath('/admin/assets')
}

export async function bulkDeleteAssets(ids: string[]) {
  if (!ids.length) return
  const supabase = createServiceClient()
  await supabase.from('assets').delete().in('id', ids)
  revalidatePath('/admin/assets')
}

export async function saveDriveFolder(input: string) {
  const folderId = parseDriveFolderId(input)
  if (!folderId) throw new Error('Could not read a folder id from that link')
  const supabase = createServiceClient()
  await supabase.from('asset_settings').upsert({ id: 1, drive_folder_id: folderId }, { onConflict: 'id' })
  revalidatePath('/admin/assets')
}

// ── Bundles ──────────────────────────────────────────────────────────────────

async function replaceBundleItems(
  supabase: ReturnType<typeof createServiceClient>,
  bundleId: string,
  assetIds: string[],
) {
  await supabase.from('asset_bundle_items').delete().eq('bundle_id', bundleId)
  if (assetIds.length) {
    await supabase.from('asset_bundle_items').insert(
      assetIds.map((asset_id, position) => ({ bundle_id: bundleId, asset_id, position })),
    )
  }
}

export async function createBundle(name: string, note: string | null, assetIds: string[]) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('asset_bundles')
    .insert({ name: name.trim(), note: note?.trim() || null })
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create bundle')
  await replaceBundleItems(supabase, data.id, assetIds)
  revalidatePath('/admin/assets')
}

export async function updateBundle(id: string, name: string, note: string | null, assetIds: string[]) {
  const supabase = createServiceClient()
  await supabase.from('asset_bundles').update({ name: name.trim(), note: note?.trim() || null }).eq('id', id)
  await replaceBundleItems(supabase, id, assetIds)
  revalidatePath('/admin/assets')
}

export async function deleteBundle(id: string) {
  const supabase = createServiceClient()
  await supabase.from('asset_bundles').delete().eq('id', id)
  revalidatePath('/admin/assets')
}
