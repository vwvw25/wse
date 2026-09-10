'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { AssetRecord, BundleRecord } from './actions'
import {
  createAsset, updateAsset, deleteAsset, bulkDeleteAssets, saveDriveFolder,
  createBundle, updateBundle, deleteBundle,
} from './actions'
import {
  prettyCategory, isVideoCategory, driveThumbnailUrl,
} from '@/lib/asset-categories'
import { buildBundleBlock, type BundleAsset } from '@/lib/asset-bundle-html'

const inputBase: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font)', boxSizing: 'border-box',
}

const fieldLabel: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
  marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em',
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)',
  color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer', fontFamily: 'var(--font)',
}

const btnGhost: React.CSSProperties = {
  padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'transparent',
  color: 'var(--text-secondary)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
}

const chip: React.CSSProperties = {
  fontSize: 11, padding: '1px 7px', borderRadius: 999,
  background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
  border: '0.5px solid var(--border)',
}

function toBundleAsset(a: AssetRecord): BundleAsset {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    drive_url: a.drive_url,
    video_url: a.video_url,
  }
}

async function copyAssets(assets: AssetRecord[]): Promise<void> {
  const { html, text } = buildBundleBlock(assets.map(toBundleAsset))
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ])
  } catch {
    await navigator.clipboard.writeText(text)
  }
}

// ── Thumbnail ────────────────────────────────────────────────────────────────

function Thumb({ asset }: { asset: AssetRecord }) {
  const [failed, setFailed] = useState(false)
  const src = asset.drive_file_id ? driveThumbnailUrl(asset.drive_file_id) : null
  const box: React.CSSProperties = {
    width: 52, height: 52, flexShrink: 0, borderRadius: 'var(--radius-sm)',
    border: '0.5px solid var(--border)', background: 'var(--bg-secondary)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', color: 'var(--text-tertiary)', fontSize: 18,
  }
  if (!src || failed) return <div style={box}>{isVideoCategory(asset.category) ? '▶' : '🗂'}</div>
  return (
    <div style={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}

// ── Asset form ───────────────────────────────────────────────────────────────

function AssetForm({ initial, categories, onSubmit, onCancel, submitLabel }: {
  initial?: AssetRecord
  categories: string[]
  onSubmit: (fd: FormData) => void
  onCancel?: () => void
  submitLabel: string
}) {
  const [category, setCategory] = useState(initial?.category ?? '')

  return (
    <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={fieldLabel}>Name</label>
        <input name="name" defaultValue={initial?.name ?? ''} required placeholder="e.g. Band photo — full lineup" style={inputBase} />
      </div>
      <div>
        <label style={fieldLabel}>Description</label>
        <input name="description" defaultValue={initial?.description ?? ''} placeholder="Optional — shown next to the link" style={inputBase} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>Category</label>
          <input
            name="category"
            list="asset-categories"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="photos, videos, bio…"
            style={inputBase}
          />
          <datalist id="asset-categories">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div style={{ flex: 1 }}>
          <label style={fieldLabel}>Tags (comma-separated)</label>
          <input name="tags" defaultValue={initial?.tags?.join(', ') ?? ''} placeholder="live, jazz, 2024" style={inputBase} />
        </div>
      </div>
      <div>
        <label style={fieldLabel}>Link (Google Drive)</label>
        <input name="drive_url" type="url" defaultValue={initial?.drive_url ?? ''} placeholder="https://drive.google.com/…" style={inputBase} />
      </div>
      {isVideoCategory(category) && (
        <div>
          <label style={fieldLabel}>Hosted video link (YouTube, Vimeo…)</label>
          <input name="video_url" type="url" defaultValue={initial?.video_url ?? ''} placeholder="https://youtube.com/…" style={inputBase} />
        </div>
      )}
      {!isVideoCategory(category) && initial?.video_url && (
        <input type="hidden" name="video_url" value={initial.video_url} />
      )}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <input type="checkbox" name="is_public" value="1" defaultChecked={initial?.is_public ?? false} />
          Show on public media page
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          Sort order
          <input name="sort_order" type="number" defaultValue={initial?.sort_order ?? 0} style={{ ...inputBase, width: 70, padding: '4px 6px' }} />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" style={btnPrimary}>{submitLabel}</button>
        {onCancel && <button type="button" onClick={onCancel} style={btnGhost}>Cancel</button>}
      </div>
    </form>
  )
}

// ── Asset row ────────────────────────────────────────────────────────────────

function AssetRow({ asset, selected, onToggle, onEdit }: {
  asset: AssetRecord
  selected: boolean
  onToggle: () => void
  onEdit: () => void
}) {
  const [, startTransition] = useTransition()

  return (
    <div style={{
      padding: '10px 14px', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-md)', background: selected ? 'var(--bg-info)' : 'var(--bg)',
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 20 }} />
      <Thumb asset={asset} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{asset.name}</span>
          {asset.is_public && <span style={{ ...chip, color: 'var(--accent)' }}>public</span>}
          {asset.tags.map(t => <span key={t} style={chip}>{t}</span>)}
        </div>
        {asset.description && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{asset.description}</div>
        )}
        <div style={{ display: 'flex', gap: 12, fontSize: 12, flexWrap: 'wrap' }}>
          {asset.video_url && <a href={asset.video_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>▶ Watch</a>}
          {asset.drive_url && <a href={asset.drive_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>🔗 Drive</a>}
          {!asset.drive_url && !asset.video_url && <span style={{ color: 'var(--text-tertiary)' }}>No link yet</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Edit</button>
        <button
          onClick={() => { if (confirm(`Delete "${asset.name}"?`)) startTransition(() => deleteAsset(asset.id)) }}
          style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}
        >Delete</button>
      </div>
    </div>
  )
}

// ── Bundles panel ────────────────────────────────────────────────────────────

function BundlesPanel({ bundles, assets, onEditBundle }: {
  bundles: BundleRecord[]
  assets: AssetRecord[]
  onEditBundle: (b: BundleRecord) => void
}) {
  const [, startTransition] = useTransition()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const byId = useMemo(() => new Map(assets.map(a => [a.id, a])), [assets])

  if (bundles.length === 0) {
    return <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No bundles yet. Tick some assets above and choose “Save as bundle”.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {bundles.map(b => {
        const items = b.asset_ids.map(id => byId.get(id)).filter(Boolean) as AssetRecord[]
        return (
          <div key={b.id} style={{ padding: '12px 14px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{b.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {items.length} asset{items.length === 1 ? '' : 's'}
                  {b.note ? ` — ${b.note}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={async () => { await copyAssets(items); setCopiedId(b.id); setTimeout(() => setCopiedId(null), 2000) }}
                  style={{ ...btnPrimary, padding: '5px 12px', fontSize: 12, background: copiedId === b.id ? '#276749' : 'var(--accent)', color: 'var(--accent-text-on)' }}
                >{copiedId === b.id ? 'Copied!' : 'Copy'}</button>
                <button onClick={() => onEditBundle(b)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Edit</button>
                <button
                  onClick={() => { if (confirm(`Delete bundle "${b.name}"?`)) startTransition(() => deleteBundle(b.id)) }}
                  style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}
                >Delete</button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Drive folder setup ───────────────────────────────────────────────────────

function DriveSetup({ driveFolderId }: { driveFolderId: string | null }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [, startTransition] = useTransition()

  if (driveFolderId && !editing) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        Drive folder connected ·{' '}
        <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 12 }}>change</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Paste the Google Drive ‘Assets’ folder link…"
        style={{ ...inputBase, width: 360 }}
      />
      <button
        onClick={() => startTransition(async () => { await saveDriveFolder(value); setEditing(false); setValue('') })}
        style={btnPrimary}
      >Save folder</button>
      {editing && <button onClick={() => setEditing(false)} style={btnGhost}>Cancel</button>}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function AssetsClient({ assets, bundles, driveFolderId, lastSyncedAt }: {
  assets: AssetRecord[]
  bundles: BundleRecord[]
  driveFolderId: string | null
  lastSyncedAt: string | null
}) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterCat, setFilterCat] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingBundle, setEditingBundle] = useState<BundleRecord | null>(null)
  const [copied, setCopied] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [, startTransition] = useTransition()

  const live = useMemo(() => assets.filter(a => !a.missing_from_drive), [assets])
  const missing = useMemo(() => assets.filter(a => a.missing_from_drive), [assets])

  const categories = useMemo(
    () => Array.from(new Set(assets.map(a => a.category))).sort(),
    [assets],
  )

  const filtered = useMemo(() => {
    const tag = filterTag.trim().toLowerCase()
    return live.filter(a => {
      if (filterCat && a.category !== filterCat) return false
      if (tag && !a.tags.some(t => t.toLowerCase().includes(tag))) return false
      return true
    })
  }, [live, filterCat, filterTag])

  const grouped = useMemo(() => {
    const map = new Map<string, AssetRecord[]>()
    for (const a of filtered) {
      const list = map.get(a.category) ?? []
      list.push(a)
      map.set(a.category, list)
    }
    return Array.from(map.keys()).sort().map(cat => ({ cat, items: map.get(cat)! }))
  }, [filtered])

  const selectedAssets = assets.filter(a => selected.has(a.id))

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setEditingBundle(null)
  }

  async function runSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/admin/assets/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setSyncMsg(json.error || 'Sync failed'); return }
      const bits = [`${json.added} added`, `${json.updated} updated`]
      if (json.missing) bits.push(`${json.missing} gone from Drive`)
      setSyncMsg(bits.join(' · '))
      router.refresh()
    } catch {
      setSyncMsg('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleCopySelected() {
    await copyAssets(selectedAssets)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSaveBundle() {
    if (editingBundle) {
      const name = prompt('Bundle name', editingBundle.name)
      if (!name) return
      startTransition(async () => {
        await updateBundle(editingBundle.id, name, editingBundle.note, [...selected])
        clearSelection()
      })
    } else {
      const name = prompt('Name this bundle (e.g. “Standard promo pack”)')
      if (!name) return
      startTransition(async () => {
        await createBundle(name, null, [...selected])
        clearSelection()
      })
    }
  }

  const lastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div style={{ padding: '32px', fontFamily: 'var(--font)', maxWidth: 880, paddingBottom: 96 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Assets</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Mirrors your Google Drive <code>Assets</code> folder. Tick assets to copy an email block or save a bundle.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {driveFolderId && (
            <button onClick={runSync} disabled={syncing} style={{ ...btnGhost, opacity: syncing ? 0.6 : 1 }}>
              {syncing ? 'Syncing…' : 'Sync from Drive'}
            </button>
          )}
          {!creating && <button onClick={() => setCreating(true)} style={{ ...btnPrimary, borderRadius: 'var(--radius-md)' }}>New asset</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <DriveSetup driveFolderId={driveFolderId} />
        {lastSync && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Last synced {lastSync}</span>}
        {syncMsg && <span style={{ fontSize: 12, color: 'var(--accent)' }}>{syncMsg}</span>}
      </div>

      {creating && (
        <div style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)', marginBottom: 16 }}>
          <AssetForm
            categories={categories}
            onSubmit={fd => startTransition(async () => { await createAsset(fd); setCreating(false) })}
            onCancel={() => setCreating(false)}
            submitLabel="Create asset"
          />
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...inputBase, width: 'auto' }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{prettyCategory(c)}</option>)}
        </select>
        <input value={filterTag} onChange={e => setFilterTag(e.target.value)} placeholder="Filter by tag…" style={{ ...inputBase, width: 200 }} />
        {(filterCat || filterTag) && (
          <button onClick={() => { setFilterCat(''); setFilterTag('') }} style={btnGhost}>Clear</button>
        )}
      </div>

      {/* Asset list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {grouped.length === 0 && !creating && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {assets.length === 0
              ? (driveFolderId ? 'No assets yet — hit “Sync from Drive”.' : 'Connect your Drive folder above, then sync.')
              : 'No assets match the filter.'}
          </p>
        )}
        {grouped.map(group => (
          <div key={group.cat}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {prettyCategory(group.cat)} <span style={{ color: 'var(--border-hover)' }}>· {group.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(a => (
                editingId === a.id ? (
                  <div key={a.id} style={{ padding: 16, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg)' }}>
                    <AssetForm
                      initial={a}
                      categories={categories}
                      onSubmit={fd => startTransition(async () => { await updateAsset(a.id, fd); setEditingId(null) })}
                      onCancel={() => setEditingId(null)}
                      submitLabel="Save"
                    />
                  </div>
                ) : (
                  <AssetRow
                    key={a.id}
                    asset={a}
                    selected={selected.has(a.id)}
                    onToggle={() => toggle(a.id)}
                    onEdit={() => setEditingId(a.id)}
                  />
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No longer in Drive */}
      {missing.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => setShowMissing(v => !v)}
            style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}
          >
            {showMissing ? '▾' : '▸'} No longer in Drive ({missing.length})
          </button>
          {showMissing && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {missing.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 12px', border: '0.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <span>{a.name} <span style={{ color: 'var(--text-tertiary)' }}>· {prettyCategory(a.category)}</span></span>
                  <button onClick={() => { if (confirm(`Delete "${a.name}"?`)) startTransition(() => deleteAsset(a.id)) }} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
                </div>
              ))}
              <button
                onClick={() => { if (confirm(`Delete all ${missing.length} assets no longer in Drive?`)) startTransition(() => bulkDeleteAssets(missing.map(a => a.id))) }}
                style={{ ...btnGhost, alignSelf: 'flex-start', color: '#dc2626' }}
              >Delete all {missing.length}</button>
            </div>
          )}
        </div>
      )}

      {/* Bundles */}
      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px', color: 'var(--text)' }}>Bundles</h2>
        <BundlesPanel
          bundles={bundles}
          assets={assets}
          onEditBundle={b => {
            setEditingBundle(b)
            setSelected(new Set(b.asset_ids))
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      </div>

      {/* Floating selection bar */}
      {selected.size > 0 && (
        <div style={{
          position: 'fixed', left: '50%', bottom: 20, transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 50,
          padding: '10px 14px', background: 'var(--text)', color: 'var(--bg)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          fontSize: 13,
        }}>
          <span>{selected.size} selected{editingBundle ? ` · editing “${editingBundle.name}”` : ''}</span>
          <button
            onClick={handleCopySelected}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, background: copied ? '#276749' : 'var(--bg)', color: copied ? '#fff' : 'var(--text)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
          >{copied ? 'Copied!' : 'Copy links'}</button>
          <button
            onClick={handleSaveBundle}
            style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'transparent', color: 'var(--bg)', border: '0.5px solid rgba(255,255,255,0.4)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}
          >{editingBundle ? 'Update bundle' : 'Save as bundle'}</button>
          <button
            onClick={clearSelection}
            style={{ padding: '6px 10px', fontSize: 12, background: 'transparent', color: 'rgba(255,255,255,0.7)', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)' }}
          >Clear</button>
        </div>
      )}
    </div>
  )
}
