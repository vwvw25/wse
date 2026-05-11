'use client'

import React, { useState, useTransition, useMemo } from 'react'
import type { Song, SetList, TagOption } from '@/types/set-list'
import { TAG_CATEGORY_LABELS, TAG_CATEGORIES } from '@/types/set-list'
import {
  upsertSong, deleteSong, createSetList, deleteSetList, updateSetList,
  bulkInsertSongs, addTagOption, deleteTagOption,
} from './actions'

type Tab = 'set-lists' | 'songs' | 'tags'

// ── Title case ────────────────────────────────────────────────────────────────
const LOWER_WORDS = new Set(['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'by', 'in', 'of', 'up', 'as'])
function titleCase(str: string): string {
  if (!str) return str
  return str
    .toLowerCase()
    .split(' ')
    .map((word, i, arr) => {
      if (!word) return word
      if (i === 0 || i === arr.length - 1 || !LOWER_WORDS.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(' ')
}

interface Props {
  songs: Song[]
  setLists: SetList[]
  events: { id: string; event_date: string | null; venue_name: string | null }[]
  tagOptions: TagOption[]
}

function formatEventDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const inputStyle: React.CSSProperties = {
  width: '100%', height: 34, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
  background: 'var(--bg-secondary)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none',
}
const cancelBtn: React.CSSProperties = {
  padding: '7px 16px', fontSize: 13, background: 'transparent',
  color: 'var(--text-secondary)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 18px', fontSize: 13, fontWeight: 500,
  background: 'var(--accent)', color: '#fff', border: 'none',
  borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
}

// ── Overlay wrapper ───────────────────────────────────────────────────────────
function Overlay({ onClose, children, width = 480 }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg)', borderRadius: 'var(--radius-lg)', padding: 28,
        width, maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 4px 24px rgba(0,0,0,0.18)', overflowY: 'auto',
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ── Structured tag selector ───────────────────────────────────────────────────
function TagSelector({
  tagOptions,
  value,
  onChange,
}: {
  tagOptions: TagOption[]
  value: string        // comma-separated stored value
  onChange: (v: string) => void
}) {
  const knownValues = useMemo(() => new Set(tagOptions.map(t => t.value.toLowerCase())), [tagOptions])

  // Parse stored value into selected chips + free text
  const parts = value.split(',').map(t => t.trim()).filter(Boolean)
  const selected = new Set(parts.filter(p => knownValues.has(p.toLowerCase())))
  const freeText = parts.filter(p => !knownValues.has(p.toLowerCase())).join(', ')

  function toggle(val: string) {
    const next = new Set(selected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    const all = [...next, ...freeText.split(',').map(t => t.trim()).filter(Boolean)]
    onChange(all.join(', '))
  }

  function setFree(text: string) {
    const freeItems = text.split(',').map(t => t.trim()).filter(Boolean)
    const all = [...selected, ...freeItems]
    onChange(all.join(', '))
  }

  const byCategory = TAG_CATEGORIES.reduce<Record<string, TagOption[]>>((acc, cat) => {
    acc[cat] = tagOptions.filter(t => t.category === cat)
    return acc
  }, {} as Record<string, TagOption[]>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {TAG_CATEGORIES.map(cat => {
        const opts = byCategory[cat]
        if (!opts?.length) return null
        return (
          <div key={cat}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              {TAG_CATEGORY_LABELS[cat]}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {opts.map(opt => {
                const active = selected.has(opt.value)
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    style={{
                      padding: '3px 10px', fontSize: 12, borderRadius: 20, cursor: 'pointer',
                      fontFamily: 'var(--font)', border: '0.5px solid var(--border)',
                      background: active ? 'var(--accent)' : 'var(--bg-secondary)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      fontWeight: active ? 500 : 400,
                    }}
                  >{opt.value}</button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          Other tags
        </div>
        <input
          style={inputStyle}
          value={freeText}
          onChange={e => setFree(e.target.value)}
          placeholder="Comma-separated additional tags…"
        />
      </div>
    </div>
  )
}

// ── Artist combobox ───────────────────────────────────────────────────────────
function ArtistCombobox({
  value,
  onChange,
  existingArtists,
}: {
  value: string
  onChange: (v: string) => void
  existingArtists: string[]
}) {
  const [open, setOpen] = useState(false)

  const suggestions = useMemo(() => {
    const q = value.toLowerCase().trim()
    if (!q) return []
    return existingArtists.filter(a => a.toLowerCase().includes(q) && a.toLowerCase() !== q)
  }, [value, existingArtists])

  return (
    <div style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          maxHeight: 200, overflowY: 'auto', marginTop: 2,
        }}>
          {suggestions.map(a => (
            <div
              key={a}
              onMouseDown={() => { onChange(a); setOpen(false) }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                color: 'var(--text)',
                borderBottom: '0.5px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {a}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Song modal ────────────────────────────────────────────────────────────────
function SongModal({
  song,
  existingSongs,
  tagOptions,
  onClose,
}: {
  song: Partial<Song> | null
  existingSongs: Song[]
  tagOptions: TagOption[]
  onClose: () => void
}) {
  const existingArtists = useMemo(() =>
    [...new Set(existingSongs.map(s => s.artist).filter((a): a is string => !!a))].sort(),
    [existingSongs],
  )
  const [title, setTitle] = useState(song?.title ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [key, setKey] = useState(song?.key ?? '')
  const [link, setLink] = useState(song?.link ?? '')
  const [tags, setTags] = useState(song?.tags ?? '')
  const [notes, setNotes] = useState(song?.notes ?? '')
  const [addDuplicate, setAddDuplicate] = useState(false)
  const [pending, startTransition] = useTransition()

  const duplicate = useMemo(() => {
    if (!title.trim()) return null
    return existingSongs.find(s =>
      s.id !== song?.id &&
      s.title.toLowerCase().trim() === title.toLowerCase().trim() &&
      (s.artist ?? '').toLowerCase().trim() === artist.toLowerCase().trim(),
    ) ?? null
  }, [title, artist, existingSongs, song?.id])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (duplicate && !addDuplicate) return
    startTransition(async () => {
      await upsertSong({ id: song?.id, title, artist: artist || null, key: key || null, link: link || null, tags: tags || null, notes: notes || null })
      onClose()
    })
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
        {song?.id ? 'Edit song' : 'Add song'}
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Title *</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Artist</label>
          <ArtistCombobox value={artist} onChange={setArtist} existingArtists={existingArtists} />
        </div>

        {/* Duplicate warning */}
        {duplicate && (
          <div style={{
            padding: '10px 12px', background: 'var(--bg-warning, #fff8e6)',
            border: '0.5px solid var(--border-warning, #f0c040)',
            borderRadius: 'var(--radius-sm)', fontSize: 13,
          }}>
            <strong>"{duplicate.title}"</strong>{duplicate.artist ? ` by "${duplicate.artist}"` : ''} already exists.
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={addDuplicate} onChange={e => setAddDuplicate(e.target.checked)} />
              Add as duplicate anyway
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Key</label>
            <input style={inputStyle} value={key} onChange={e => setKey(e.target.value)} placeholder="e.g. Bb, C major" />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Reference link</label>
            <input style={inputStyle} value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Tags</label>
          <TagSelector tagOptions={tagOptions} value={tags} onChange={setTags} />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Notes</label>
          <input style={inputStyle} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button
            type="submit"
            disabled={pending || !title.trim() || (!!duplicate && !addDuplicate)}
            style={{ ...primaryBtn, opacity: (pending || (!!duplicate && !addDuplicate)) ? 0.5 : 1 }}
          >{pending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Overlay>
  )
}

// ── Edit set list modal ───────────────────────────────────────────────────────
function EditSetListModal({
  sl,
  events,
  onClose,
}: {
  sl: SetList
  events: Props['events']
  onClose: () => void
}) {
  const [name, setName] = useState(sl.name)
  const [eventId, setEventId] = useState(sl.event_id ?? '')
  const [isTemplate, setIsTemplate] = useState(sl.is_template)
  const [pending, startTransition] = useTransition()

  // Read-only event details
  const linkedEvent = events.find(e => e.id === (eventId || sl.event_id))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await updateSetList(sl.id, {
        name: name.trim(),
        event_id: isTemplate ? null : (eventId || null),
        is_template: isTemplate,
      })
      onClose()
    })
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Edit set list</div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Name *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required autoFocus />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="edit-is-template"
            checked={isTemplate}
            onChange={e => { setIsTemplate(e.target.checked); if (e.target.checked) setEventId('') }}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="edit-is-template" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            Template (no event)
          </label>
        </div>

        {!isTemplate && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Event</label>
            <select style={{ ...inputStyle, height: 34 }} value={eventId} onChange={e => setEventId(e.target.value)}>
              <option value="">— no event —</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {formatEventDate(ev.event_date)}{ev.venue_name ? ` — ${ev.venue_name}` : ''}
                </option>
              ))}
            </select>
            {linkedEvent && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)' }}>
                {formatEventDate(linkedEvent.event_date)}{linkedEvent.venue_name ? ` — ${linkedEvent.venue_name}` : ''}
                <span style={{ marginLeft: 6, color: 'var(--text-tertiary)' }}>(event details are read-only — edit on the event)</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={pending || !name.trim()} style={{ ...primaryBtn, opacity: pending ? 0.6 : 1 }}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

// ── New set list modal ────────────────────────────────────────────────────────
function NewSetListModal({ events, templates, onClose }: { events: Props['events']; templates: SetList[]; onClose: () => void }) {
  const [name, setName] = useState('')
  const [eventId, setEventId] = useState('')
  const [isTemplate, setIsTemplate] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const id = await createSetList({ name: name.trim(), event_id: eventId || null, is_template: isTemplate })
      onClose()
      if (id) window.location.href = `/admin/set-lists/${id}`
    })
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>New set list</div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Name *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} required autoFocus placeholder="e.g. Main set list" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="new-is-template" checked={isTemplate}
            onChange={e => { setIsTemplate(e.target.checked); if (e.target.checked) setEventId('') }} style={{ cursor: 'pointer' }} />
          <label htmlFor="new-is-template" style={{ fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>Save as template (no event)</label>
        </div>
        {!isTemplate && (
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Event</label>
            <select style={{ ...inputStyle, height: 34 }} value={eventId} onChange={e => setEventId(e.target.value)}>
              <option value="">— no event —</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{formatEventDate(ev.event_date)}{ev.venue_name ? ` — ${ev.venue_name}` : ''}</option>
              ))}
            </select>
          </div>
        )}
        {templates.length > 0 && (
          <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-secondary)' }}>
            Tip: you can apply a template after creating this set list.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={pending || !name.trim()} style={{ ...primaryBtn, opacity: pending ? 0.6 : 1 }}>
            {pending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

// ── CSV upload modal ──────────────────────────────────────────────────────────
const COL_ALIASES: Record<string, string> = {
  title: 'title', song: 'title', name: 'title',
  artist: 'artist', band: 'artist',
  key: 'key',
  link: 'link', url: 'link', reference: 'link',
  tags: 'tags', genre: 'tags',
  notes: 'notes', note: 'notes',
}

type ParsedSong = { title: string; artist: string; key: string; link: string; tags: string; notes: string; isDuplicate?: boolean }

function parseCsv(text: string, existingSongs: Song[]): { rows: ParsedSong[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row.'] }

  function parseLine(line: string): string[] {
    const result: string[] = []
    let cur = ''
    let inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  const headers = parseLine(lines[0]).map(h => COL_ALIASES[h.toLowerCase().trim()] ?? h.toLowerCase().trim())
  const titleIdx = headers.indexOf('title')
  if (titleIdx === -1) return { rows: [], errors: ['No "title" column found. Make sure your CSV has a "title" header.'] }

  const existingKeys = new Set(existingSongs.map(s => `${s.title.toLowerCase().trim()}||${(s.artist ?? '').toLowerCase().trim()}`))
  const rows: ParsedSong[] = []
  const errors: string[] = []

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const cols = parseLine(lines[i])
    const get = (field: string) => { const idx = headers.indexOf(field); return idx >= 0 ? (cols[idx] ?? '').trim() : '' }
    const title = titleCase(get('title'))
    if (!title) { errors.push(`Row ${i + 1}: no title, skipped.`); continue }
    const artist = titleCase(get('artist'))
    const key = `${title.toLowerCase().trim()}||${artist.toLowerCase().trim()}`
    rows.push({ title, artist, key: get('key'), link: get('link'), tags: get('tags'), notes: get('notes'), isDuplicate: existingKeys.has(key) })
  }

  return { rows, errors }
}

function CsvUploadModal({ existingSongs, onClose }: { existingSongs: Song[]; onClose: () => void }) {
  const [parsed, setParsed] = useState<ParsedSong[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const { rows, errors } = parseCsv(ev.target?.result as string, existingSongs)
      setParsed(rows); setErrors(errors)
    }
    reader.readAsText(file)
  }

  const toImport = parsed ? (skipDuplicates ? parsed.filter(r => !r.isDuplicate) : parsed) : []
  const dupCount = parsed?.filter(r => r.isDuplicate).length ?? 0

  function handleImport() {
    if (!toImport.length) return
    startTransition(async () => {
      await bulkInsertSongs(toImport.map(r => ({
        title: r.title, artist: r.artist || null, key: r.key || null,
        link: r.link || null, tags: r.tags || null, notes: r.notes || null,
      })))
      setDone(true)
    })
  }

  return (
    <Overlay onClose={onClose} width={620}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Import songs from CSV</div>
      {done ? (
        <div>
          <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 20 }}>✓ {toImport.length} songs imported successfully.</div>
          <button onClick={onClose} style={primaryBtn}>Done</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Upload a CSV with a header row. Recognised columns: <strong>title</strong> (required), artist, key, link, tags, notes.<br />
            Column names are case-insensitive. Extra columns are ignored.
          </div>

          <label style={{
            display: 'inline-block', padding: '7px 16px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg-secondary)', color: 'var(--text)',
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', marginBottom: 16, fontFamily: 'var(--font)',
          }}>
            {fileName || 'Choose CSV file…'}
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>

          {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-danger)', marginBottom: 4 }}>{e}</div>)}

          {dupCount > 0 && (
            <div style={{ padding: '10px 12px', background: 'var(--bg-warning, #fff8e6)', border: '0.5px solid var(--border-warning, #f0c040)', borderRadius: 'var(--radius-sm)', fontSize: 13, marginBottom: 12 }}>
              {dupCount} song{dupCount > 1 ? 's' : ''} already exist in your library.
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={skipDuplicates} onChange={e => setSkipDuplicates(e.target.checked)} />
                Skip duplicates (import {parsed!.length - dupCount} new songs only)
              </label>
            </div>
          )}

          {parsed && parsed.length > 0 && (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Preview — {parsed.length} rows ({dupCount > 0 ? `${dupCount} duplicate${dupCount > 1 ? 's' : ''} highlighted` : 'no duplicates'}):
              </div>
              <div style={{ flex: 1, overflowY: 'auto', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16, maxHeight: 300 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)' }}>
                      {['', 'Title', 'Artist', 'Key', 'Tags'].map((h, i) => (
                        <th key={i} style={{ textAlign: 'left', padding: '6px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.slice(0, 100).map((row, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid var(--border)', background: row.isDuplicate ? 'var(--bg-warning, #fff8e6)' : 'transparent', opacity: (skipDuplicates && row.isDuplicate) ? 0.4 : 1 }}>
                        <td style={{ padding: '5px 10px', fontSize: 11, color: 'var(--text-tertiary)' }}>{row.isDuplicate ? '⚠' : ''}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{row.title}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.artist}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12, color: 'var(--text-secondary)' }}>{row.key}</td>
                        <td style={{ padding: '5px 10px', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.tags}</td>
                      </tr>
                    ))}
                    {parsed.length > 100 && (
                      <tr><td colSpan={5} style={{ padding: '6px 10px', fontSize: 11, color: 'var(--text-tertiary)' }}>… and {parsed.length - 100} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {parsed?.length === 0 && fileName && (
            <div style={{ fontSize: 13, color: 'var(--text-danger)', marginBottom: 16 }}>No valid rows found.</div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={cancelBtn}>Cancel</button>
            <button onClick={handleImport} disabled={!toImport.length || pending} style={{ ...primaryBtn, opacity: (!toImport.length || pending) ? 0.5 : 1 }}>
              {pending ? 'Importing…' : `Import ${toImport.length} song${toImport.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}
    </Overlay>
  )
}

// ── Tags manager ──────────────────────────────────────────────────────────────
function TagsManager({ tagOptions }: { tagOptions: TagOption[] }) {
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  const byCategory = TAG_CATEGORIES.reduce<Record<string, TagOption[]>>((acc, cat) => {
    acc[cat] = tagOptions.filter(t => t.category === cat)
    return acc
  }, {} as Record<string, TagOption[]>)

  function handleAdd(cat: string) {
    const val = (newValues[cat] ?? '').trim()
    if (!val) return
    startTransition(async () => { await addTagOption(cat, val) })
    setNewValues(prev => ({ ...prev, [cat]: '' }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {TAG_CATEGORIES.map(cat => (
        <div key={cat}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
            {TAG_CATEGORY_LABELS[cat]}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {byCategory[cat].map(opt => (
              <div key={opt.id} style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px 3px 10px', borderRadius: 20, fontSize: 12,
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                color: 'var(--text)',
              }}>
                {opt.value}
                <button
                  onClick={() => { if (confirm(`Remove "${opt.value}"?`)) startTransition(async () => deleteTagOption(opt.id)) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-tertiary)', padding: '0 2px', lineHeight: 1, fontFamily: 'var(--font)' }}
                >✕</button>
              </div>
            ))}
            {byCategory[cat].length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No options yet</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              style={{ ...inputStyle, width: 200 }}
              value={newValues[cat] ?? ''}
              onChange={e => setNewValues(prev => ({ ...prev, [cat]: e.target.value }))}
              placeholder={`Add ${TAG_CATEGORY_LABELS[cat]} option…`}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(cat) } }}
            />
            <button
              onClick={() => handleAdd(cat)}
              disabled={!(newValues[cat] ?? '').trim()}
              style={{
                padding: '0 14px', fontSize: 13, background: 'var(--bg-secondary)',
                color: 'var(--text)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                opacity: !(newValues[cat] ?? '').trim() ? 0.5 : 1,
              }}
            >Add</button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SetListsClient({ songs, setLists, events, tagOptions }: Props) {
  const [tab, setTab] = useState<Tab>('set-lists')
  const [songSearch, setSongSearch] = useState('')
  const [songModal, setSongModal] = useState<Partial<Song> | null | false>(false)
  const [csvUploadOpen, setCsvUploadOpen] = useState(false)
  const [newSetListOpen, setNewSetListOpen] = useState(false)
  const [editingSetList, setEditingSetList] = useState<SetList | null>(null)
  const [, startTransition] = useTransition()

  const templates = setLists.filter(sl => sl.is_template)
  const eventSetLists = setLists.filter(sl => !sl.is_template)

  const filteredSongs = useMemo(() => {
    const q = songSearch.toLowerCase()
    if (!q) return songs
    return songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (s.artist ?? '').toLowerCase().includes(q) ||
      (s.tags ?? '').toLowerCase().includes(q) ||
      (s.key ?? '').toLowerCase().includes(q),
    )
  }, [songs, songSearch])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 16px', fontSize: 13, fontWeight: active ? 600 : 400,
    background: active ? 'var(--bg)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    border: active ? '0.5px solid var(--border)' : '0.5px solid transparent',
    borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
  })

  const btnStyle: React.CSSProperties = { ...primaryBtn, padding: '7px 16px' }

  return (
    <div style={{ padding: '24px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
          <button style={tabStyle(tab === 'set-lists')} onClick={() => setTab('set-lists')}>Set lists</button>
          <button style={tabStyle(tab === 'songs')} onClick={() => setTab('songs')}>Songs ({songs.length})</button>
          <button style={tabStyle(tab === 'tags')} onClick={() => setTab('tags')}>Tags</button>
        </div>
        {tab === 'set-lists' && (
          <button style={btnStyle} onClick={() => setNewSetListOpen(true)}>+ New set list</button>
        )}
        {tab === 'songs' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnStyle, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)' }} onClick={() => setCsvUploadOpen(true)}>Import CSV</button>
            <button style={btnStyle} onClick={() => setSongModal({})}>+ Add song</button>
          </div>
        )}
      </div>

      {/* ── Set lists tab ── */}
      {tab === 'set-lists' && (
        <div>
          {templates.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Templates</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {templates.map(sl => (
                  <SetListRow key={sl.id} sl={sl}
                    onEdit={() => setEditingSetList(sl)}
                    onDelete={() => startTransition(async () => deleteSetList(sl.id))} />
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {eventSetLists.length ? 'Event set lists' : 'No set lists yet'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {eventSetLists.map(sl => (
              <SetListRow key={sl.id} sl={sl}
                onEdit={() => setEditingSetList(sl)}
                onDelete={() => startTransition(async () => deleteSetList(sl.id))} />
            ))}
          </div>
        </div>
      )}

      {/* ── Songs tab ── */}
      {tab === 'songs' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <input
              value={songSearch}
              onChange={e => setSongSearch(e.target.value)}
              placeholder="Search by title, artist, key or tags…"
              style={{ ...inputStyle, width: 320 }}
            />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Artist', 'Key', 'Tags', 'Notes', 'Link', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '6px 12px 6px 0', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', width: h === '' ? 80 : undefined }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSongs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
                    {songSearch ? 'No songs match your search.' : 'No songs yet — add your first song.'}
                  </td>
                </tr>
              ) : filteredSongs.map(song => (
                <tr key={song.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{song.title}</td>
                  <td style={{ padding: '8px 12px 8px 0', fontSize: 13, color: 'var(--text-secondary)' }}>{song.artist ?? ''}</td>
                  <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{song.key ?? ''}</td>
                  <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{song.tags ?? ''}</td>
                  <td style={{ padding: '8px 12px 8px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>{song.notes ?? ''}</td>
                  <td style={{ padding: '8px 12px 8px 0', fontSize: 12 }}>
                    {song.link
                      ? <a href={song.link} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>↗ Link</a>
                      : ''}
                  </td>
                  <td style={{ padding: '8px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setSongModal(song)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '2px 6px', fontFamily: 'var(--font)' }}>Edit</button>
                    <button onClick={() => { if (confirm(`Delete "${song.title}"?`)) startTransition(async () => deleteSong(song.id)) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '2px 6px', fontFamily: 'var(--font)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tags tab ── */}
      {tab === 'tags' && <TagsManager tagOptions={tagOptions} />}

      {/* Modals */}
      {songModal !== false && (
        <SongModal song={songModal} existingSongs={songs} tagOptions={tagOptions} onClose={() => setSongModal(false)} />
      )}
      {csvUploadOpen && (
        <CsvUploadModal existingSongs={songs} onClose={() => setCsvUploadOpen(false)} />
      )}
      {newSetListOpen && (
        <NewSetListModal events={events} templates={templates} onClose={() => setNewSetListOpen(false)} />
      )}
      {editingSetList && (
        <EditSetListModal sl={editingSetList} events={events} onClose={() => setEditingSetList(null)} />
      )}
    </div>
  )
}

// ── Set list row ──────────────────────────────────────────────────────────────
function SetListRow({ sl, onEdit, onDelete }: { sl: SetList; onEdit: () => void; onDelete: () => void }) {
  const eventLabel = sl.event
    ? `${formatEventDate(sl.event.event_date)}${sl.event.venue_name ? ` — ${sl.event.venue_name}` : ''}`
    : sl.is_template ? 'Template' : 'No event'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)',
    }}>
      <div>
        <a href={`/admin/set-lists/${sl.id}`} style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', textDecoration: 'none' }}>
          {sl.name}
        </a>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {eventLabel}{sl.song_count != null ? ` · ${sl.song_count} songs` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={onEdit} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px', fontFamily: 'var(--font)' }}>Edit</button>
        <button onClick={() => { if (confirm(`Delete "${sl.name}"?`)) onDelete() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', padding: '4px 8px', fontFamily: 'var(--font)' }}>Delete</button>
      </div>
    </div>
  )
}
