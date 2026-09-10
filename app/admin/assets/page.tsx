import { createServiceClient } from '@/lib/supabase'
import type { AssetRecord, BundleRecord } from './actions'
import AssetsClient from './AssetsClient'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const supabase = createServiceClient()

  const [{ data: assets }, { data: bundles }, { data: items }, { data: settings }] = await Promise.all([
    supabase.from('assets').select('*').order('category').order('sort_order').order('name'),
    supabase.from('asset_bundles').select('*').order('name'),
    supabase.from('asset_bundle_items').select('bundle_id, asset_id, position').order('position'),
    supabase.from('asset_settings').select('drive_folder_id, last_synced_at').eq('id', 1).single(),
  ])

  const itemsByBundle = new Map<string, string[]>()
  for (const it of items ?? []) {
    const list = itemsByBundle.get(it.bundle_id) ?? []
    list.push(it.asset_id)
    itemsByBundle.set(it.bundle_id, list)
  }

  const bundleRecords: BundleRecord[] = (bundles ?? []).map(b => ({
    ...b,
    asset_ids: itemsByBundle.get(b.id) ?? [],
  }))

  return (
    <AssetsClient
      assets={(assets ?? []) as AssetRecord[]}
      bundles={bundleRecords}
      driveFolderId={settings?.drive_folder_id ?? null}
      lastSyncedAt={settings?.last_synced_at ?? null}
    />
  )
}
