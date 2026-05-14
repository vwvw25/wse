'use client'

import React, { useState, useTransition, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SetList, SetListSong, Song, TagOption } from '@/types/set-list'
import type { EventRequest } from '@/types/event-request'
import { TAG_CATEGORY_LABELS, TAG_CATEGORIES } from '@/types/set-list'
import {
  addSongToSetList,
  removeSongFromSetList,
  reorderSetListSongs,
  renameSetList,
  applyTemplate,
} from '../actions'

interface Props {
  setList: SetList
  setListSongs: SetListSong[]
  allSongs: Song[]
  templates: { id: string; name: string }[]
  tagOptions: TagOption[]
  eventRequests?: EventRequest[]
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function parseSetsCount(sets: string | null): number {
  if (!sets) return 1
  const m = sets.match(/^(\d+)/)
  return m ? parseInt(m[1]) : 1
}

// ── Draggable song row ────────────────────────────────────────────────────────
function SortableSongRow({
  sls,
  idx,
  setNumbers,
  onRemove,
  onChangeSet,
}: {
  sls: SetListSong
  idx: number
  setNumbers: number[]
  onRemove: () => void
  onChangeSet: (n: number | null) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: sls.id })
  const song = sls.song

  return (
    <div
      ref={setNodeRef}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 10px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
        marginBottom: 4,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      {/* Position number */}
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 18, textAlign: 'right', flexShrink: 0 }}>
        {idx + 1}
      </span>

      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          color: 'var(--text-tertiary)',
          fontSize: 14,
          flexShrink: 0,
          lineHeight: 1,
          padding: '0 2px',
          userSelect: 'none',
        }}
      >
        ⠿
      </span>

      {/* Song info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {song?.link
          ? <a href={song.link} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', textDecoration: 'underline', textDecorationColor: 'var(--border)' }}>{song.title ?? '—'}</a>
          : <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{song?.title ?? '—'}</span>}
        {song?.artist && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{song.artist}</span>}
        {song?.key && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{song.key}</span>}
        {song?.notes && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8, fontStyle: 'italic' }}>{song.notes}</span>}
      </div>

      {/* Move to set */}
      <select
        value={sls.set_number ?? ''}
        onChange={e => onChangeSet(e.target.value ? parseInt(e.target.value) : null)}
        style={{
          height: 26, padding: '0 6px', fontSize: 11,
          background: 'var(--bg)', color: 'var(--text)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
          fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer',
        }}
      >
        <option value="">Unassigned</option>
        {setNumbers.map(n => <option key={n} value={n}>Set {n}</option>)}
      </select>

      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '0 3px', fontFamily: 'var(--font)', lineHeight: 1 }}
      >✕</button>
    </div>
  )
}

// ── Sortable group (one set or unassigned) ────────────────────────────────────
function SortableGroup({
  label,
  items,
  setNumbers,
  onRemove,
  onChangeSet,
  onReorder,
}: {
  label: string
  items: SetListSong[]
  setNumbers: number[]
  onRemove: (id: string) => void
  onChangeSet: (sls: SetListSong, n: number | null) => void
  onReorder: (newOrder: SetListSong[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(s => s.id === active.id)
    const newIdx = items.findIndex(s => s.id === over.id)
    onReorder(arrayMove(items, oldIdx, newIdx))
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label} — {items.length} songs
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>No songs yet.</div>
      ) : (
        <DndContext id={`dnd-${label}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {items.map((sls, idx) => (
              <SortableSongRow
                key={sls.id}
                sls={sls}
                idx={idx}
                setNumbers={setNumbers}
                onRemove={() => onRemove(sls.id)}
                onChangeSet={n => onChangeSet(sls, n)}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function SetListEditor({ setList, setListSongs: initialSongs, allSongs, templates, tagOptions, eventRequests = [] }: Props) {
  const [songs, setSongs] = useState<SetListSong[]>(initialSongs)
  const [songSearch, setSongSearch] = useState('')
  const [activeTagFilters, setActiveTagFilters] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState(setList.name)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [, startTransition] = useTransition()

  const setsCount = parseSetsCount(setList.event?.request_details?.sets_requested ?? null)
  const setNumbers = Array.from({ length: setsCount }, (_, i) => i + 1)

  const grouped = useMemo(() => {
    const unassigned = songs.filter(s => s.set_number == null).sort((a, b) => a.position - b.position)
    const bySet: Record<number, SetListSong[]> = {}
    for (const n of setNumbers) {
      bySet[n] = songs.filter(s => s.set_number === n).sort((a, b) => a.position - b.position)
    }
    return { unassigned, bySet }
  }, [songs, setNumbers])

  const filteredAllSongs = useMemo(() => {
    const q = songSearch.toLowerCase()
    const inList = new Set(songs.map(s => s.song_id))
    let available = allSongs.filter(s => !inList.has(s.id))

    // Tag filters — song must have ALL active filters
    if (activeTagFilters.size > 0) {
      available = available.filter(s => {
        const songTags = (s.tags ?? '').split(',').map(t => t.trim().toLowerCase())
        return [...activeTagFilters].every(f => songTags.includes(f.toLowerCase()))
      })
    }

    if (!q) return available
    return available.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.artist ?? '').toLowerCase().includes(q) ||
      (s.tags ?? '').toLowerCase().includes(q),
    )
  }, [allSongs, songs, songSearch, activeTagFilters])

  const byCategory = useMemo(() =>
    TAG_CATEGORIES.reduce<Record<string, TagOption[]>>((acc, cat) => {
      acc[cat] = tagOptions.filter(t => t.category === cat)
      return acc
    }, {} as Record<string, TagOption[]>),
    [tagOptions],
  )

  function toggleFilter(value: string) {
    setActiveTagFilters(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  async function handleAddSong(song: Song, setNumber?: number) {
    const nextPos = songs.filter(s => s.set_number === (setNumber ?? null)).length
    const optimistic: SetListSong = {
      id: `tmp-${Date.now()}`,
      set_list_id: setList.id,
      song_id: song.id,
      position: nextPos,
      set_number: setNumber ?? null,
      created_at: new Date().toISOString(),
      song,
    }
    setSongs(prev => [...prev, optimistic])
    setLastSaved(Date.now())
    startTransition(async () => { await addSongToSetList(setList.id, song.id, setNumber) })
  }

  function handleRemove(slsId: string) {
    const sls = songs.find(s => s.id === slsId)
    if (!sls) return
    setSongs(prev => prev.filter(s => s.id !== slsId))
    startTransition(async () => { await removeSongFromSetList(sls.id, setList.id) })
  }

  function handleReorder(setNumber: number | null, newOrder: SetListSong[]) {
    const updates = newOrder.map((s, i) => ({ ...s, position: i }))
    setSongs(prev => [...prev.filter(s => s.set_number !== setNumber), ...updates])
    startTransition(async () => {
      await reorderSetListSongs(setList.id, updates.map(u => ({ id: u.id, position: u.position, set_number: u.set_number })))
    })
  }

  function handleChangeSet(sls: SetListSong, newSet: number | null) {
    const updated = { ...sls, set_number: newSet, position: songs.filter(s => s.set_number === newSet).length }
    setSongs(prev => prev.map(s => s.id === sls.id ? updated : s))
    startTransition(async () => {
      await reorderSetListSongs(setList.id, [{ id: sls.id, position: updated.position, set_number: newSet }])
    })
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    setEditingName(false)
    startTransition(async () => { await renameSetList(setList.id, name) })
  }

  async function handleApplyTemplate() {
    if (!selectedTemplate) return
    if (!confirm('This will add all songs from the template to this set list. Continue?')) return
    startTransition(async () => {
      await applyTemplate(selectedTemplate, setList.id)
      window.location.reload()
    })
  }

  const btnSm: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 12, color: 'var(--text-secondary)', padding: '0 4px',
    fontFamily: 'var(--font)', lineHeight: 1,
  }

  return (
    <div style={{ padding: '24px 32px' }}>

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <a
          href={setList.event_id ? `/admin/events/${setList.event_id}?tab=set-lists` : '/admin/set-lists'}
          style={{ fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          {setList.event_id ? '← Back to event' : '← Set lists'}
        </a>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        {editingName ? (
          <form onSubmit={handleRename} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus style={{
              height: 32, padding: '0 10px', fontSize: 18, fontWeight: 600,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font)', outline: 'none',
            }} />
            <button type="submit" style={{ ...btnSm, color: 'var(--accent)', fontWeight: 500 }}>Save</button>
            <button type="button" onClick={() => { setEditingName(false); setName(setList.name) }} style={btnSm}>Cancel</button>
          </form>
        ) : (
          <>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>{name}</h1>
            <button onClick={() => setEditingName(true)} style={btnSm}>Rename</button>
          </>
        )}
      </div>

      {/* Event info */}
      {setList.event && (
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {formatDate(setList.event.event_date)}
          {setList.event.venue_name ? ` — ${setList.event.venue_name}` : ''}
          {setList.event.request_details?.sets_requested ? ` · ${setList.event.request_details.sets_requested}` : ''}
          {setList.event.start_time ? ` · ${setList.event.start_time}` : ''}
          {setList.event.finish_time ? `–${setList.event.finish_time}` : ''}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        <button onClick={() => setAdding(v => !v)} style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 500,
          background: adding ? 'var(--bg-secondary)' : 'var(--accent)',
          color: adding ? 'var(--text)' : '#fff',
          border: adding ? '0.5px solid var(--border)' : 'none',
          borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
        }}>{adding ? 'Close' : '+ Add songs'}</button>
        {adding && lastSaved && (
          <span style={{ fontSize: 12, color: '#16a34a', alignSelf: 'center' }}>✓ Songs save automatically</span>
        )}

        <a href={`/print/set-list/${setList.id}`} target="_blank" style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 500,
          background: 'transparent', color: 'var(--text-secondary)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
        }}>Print / PDF</a>

        <a href={`/setlist/${setList.id}`} target="_blank" style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 500,
          background: 'transparent', color: 'var(--text-secondary)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
        }}>↗ Share link</a>

        <a href={`/admin/set-lists/${setList.id}/export.csv`} style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 500,
          background: 'transparent', color: 'var(--text-secondary)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
        }}>Export CSV</a>

        {templates.length > 0 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} style={{
              height: 34, padding: '0 8px', fontSize: 13,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font)', outline: 'none',
            }}>
              <option value="">Apply template…</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            {selectedTemplate && (
              <button onClick={handleApplyTemplate} style={{
                padding: '7px 12px', fontSize: 13, background: 'var(--bg-secondary)',
                color: 'var(--text)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}>Apply</button>
            )}
          </div>
        )}
      </div>

      {/* Add songs panel */}
      {adding && (
        <div style={{ marginBottom: 28, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
            Song library — click to add ({filteredAllSongs.length} available)
          </div>

          {/* Tag filters by category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {TAG_CATEGORIES.map(cat => {
              const opts = byCategory[cat]
              if (!opts?.length) return null
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', width: 80, flexShrink: 0 }}>
                    {TAG_CATEGORY_LABELS[cat]}
                  </span>
                  {opts.map(opt => {
                    const active = activeTagFilters.has(opt.value)
                    return (
                      <button key={opt.id} type="button" onClick={() => toggleFilter(opt.value)} style={{
                        padding: '2px 9px', fontSize: 11, borderRadius: 20, cursor: 'pointer',
                        fontFamily: 'var(--font)', border: '0.5px solid var(--border)',
                        background: active ? 'var(--accent)' : 'var(--bg)',
                        color: active ? '#fff' : 'var(--text-secondary)',
                        fontWeight: active ? 500 : 400,
                      }}>{opt.value}</button>
                    )
                  })}
                </div>
              )
            })}
            {activeTagFilters.size > 0 && (
              <button onClick={() => setActiveTagFilters(new Set())} style={{
                alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font)', padding: 0,
              }}>✕ Clear filters</button>
            )}
          </div>

          <input
            value={songSearch} onChange={e => setSongSearch(e.target.value)}
            placeholder="Search songs…" autoFocus
            style={{
              width: 260, height: 30, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
              background: 'var(--bg)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font)', outline: 'none', marginBottom: 12,
            }}
          />
          <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredAllSongs.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>
                {songSearch ? 'No songs match.' : 'All songs are already in this set list.'}
              </div>
            ) : filteredAllSongs.map(song => (
              <div key={song.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg)', border: '0.5px solid var(--border)',
              }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{song.title}</span>
                  {song.artist && <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 8 }}>{song.artist}</span>}
                  {song.tags && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>{song.tags}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {setNumbers.map(n => (
                    <button key={n} onClick={() => handleAddSong(song, n)} style={{
                      padding: '3px 8px', fontSize: 11, background: 'var(--accent)', color: '#fff',
                      border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                    }}>Set {n}</button>
                  ))}
                  <button onClick={() => handleAddSong(song, undefined)} style={{
                    padding: '3px 8px', fontSize: 11,
                    background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>Unassigned</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requested songs box */}
      {eventRequests.length > 0 && (
        <div style={{
          marginBottom: 20, padding: '12px 16px',
          background: '#fefce8', border: '0.5px solid #fde68a',
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Requested songs
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {eventRequests.map(req => {
              const inList = songs.some(s => s.song_id === req.song_id)
              const matchingSong = allSongs.find(s => s.id === req.song_id)
              return (
                <button
                  key={req.id}
                  onClick={() => !inList && matchingSong && handleAddSong(matchingSong)}
                  disabled={inList || !matchingSong}
                  title={inList ? 'Already in set list' : matchingSong ? `Click to add ${req.title}` : 'Song not in repertoire'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20, fontSize: 12,
                    fontFamily: 'var(--font)', cursor: inList || !matchingSong ? 'default' : 'pointer',
                    background: inList ? '#dcfce7' : 'white',
                    color: inList ? '#166534' : '#92400e',
                    border: `0.5px solid ${inList ? '#86efac' : '#fde68a'}`,
                    fontWeight: inList ? 600 : 400,
                  }}
                >
                  {inList && <span>✓</span>}
                  {req.title}
                  {req.artist && <span style={{ opacity: 0.7 }}>· {req.artist}</span>}
                  {req.type === 'to_learn' && <span style={{ opacity: 0.6, fontSize: 10 }}>to learn</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Set sections */}
      {setNumbers.map(n => (
        <SortableGroup
          key={n}
          label={`Set ${n}`}
          items={grouped.bySet[n] ?? []}
          setNumbers={setNumbers}
          onRemove={handleRemove}
          onChangeSet={handleChangeSet}
          onReorder={newOrder => handleReorder(n, newOrder)}
        />
      ))}

      {/* Unassigned */}
      {(grouped.unassigned.length > 0 || songs.length === 0) && (
        <SortableGroup
          label="Unassigned"
          items={grouped.unassigned}
          setNumbers={setNumbers}
          onRemove={handleRemove}
          onChangeSet={handleChangeSet}
          onReorder={newOrder => handleReorder(null, newOrder)}
        />
      )}

      {songs.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '16px 0' }}>
          No songs yet — click "+ Add songs" to start building this set list.
        </div>
      )}
    </div>
  )
}
