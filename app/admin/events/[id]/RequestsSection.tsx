'use client'

import React, { useState, useTransition } from 'react'
import type { Song } from '@/types/set-list'
import type { EventRequest } from '@/types/event-request'
import {
  addFromRepertoireRequests,
  addToLearnRequest,
  updateRequestStatus,
  deleteRequest,
} from './requests/actions'

// ── Fuzzy matching ─────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

function fuzzyScore(query: string, song: Song): number {
  const q = normalize(query)
  const title = normalize(song.title)
  const artist = normalize(song.artist ?? '')
  const combined = `${title} ${artist}`.trim()

  if (q === title || q === combined) return 1.0
  if (title.startsWith(q) || q.startsWith(title)) return 0.9
  if (title.includes(q) || q.includes(title)) return 0.8

  const qTokens = q.split(' ').filter(t => t.length > 2)
  const titleTokens = title.split(' ').filter(t => t.length > 2)
  const overlap = qTokens.filter(t => titleTokens.includes(t)).length
  if (overlap > 0) return 0.4 + (overlap / Math.max(qTokens.length, titleTokens.length)) * 0.4

  return 0
}

function parseLine(line: string): { rawTitle: string; rawArtist: string | null } {
  const parts = line.split(/\s+[-–]\s+/)
  if (parts.length >= 2) {
    return { rawTitle: parts[0].trim(), rawArtist: parts.slice(1).join(' - ').trim() }
  }
  return { rawTitle: line.trim(), rawArtist: null }
}

type ParsedMatch = {
  line: string
  rawTitle: string
  rawArtist: string | null
  match: { song: Song; score: number } | null
  accepted: boolean
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  requested: { background: '#f1f5f9', color: '#475569' },
  confirmed: { background: '#dcfce7', color: '#166534' },
  declined: { background: '#fee2e2', color: '#991b1b' },
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
      ...STATUS_STYLES[status],
    }}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RequestsSection({
  eventId,
  requests: initialRequests,
  allSongs,
}: {
  eventId: string
  requests: EventRequest[]
  allSongs: Song[]
}) {
  const [, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'from_repertoire' | 'to_learn'>('from_repertoire')

  // From repertoire — paste & parse state
  const [pasteText, setPasteText] = useState('')
  const [parsedMatches, setParsedMatches] = useState<ParsedMatch[] | null>(null)
  const [adding, setAdding] = useState(false)

  // To learn form
  const [toLearnTitle, setToLearnTitle] = useState('')
  const [toLearnArtist, setToLearnArtist] = useState('')

  const fromRepertoire = initialRequests.filter(r => r.type === 'from_repertoire')
  const toLearn = initialRequests.filter(r => r.type === 'to_learn')

  // Existing song_ids already requested (to avoid duplicates)
  const existingFromRepSongIds = new Set(fromRepertoire.map(r => r.song_id).filter(Boolean))

  function handleParse() {
    const lines = pasteText.split('\n').map(l => l.trim()).filter(Boolean)
    const matches: ParsedMatch[] = lines.map(line => {
      const { rawTitle, rawArtist } = parseLine(line)
      const query = rawArtist ? `${rawTitle} ${rawArtist}` : rawTitle
      let best: { song: Song; score: number } | null = null
      for (const song of allSongs) {
        if (existingFromRepSongIds.has(song.id)) continue
        const score = fuzzyScore(query, song)
        if (score > 0.4 && (!best || score > best.score)) best = { song, score }
      }
      return { line, rawTitle, rawArtist, match: best, accepted: best !== null }
    })
    setParsedMatches(matches)
  }

  function toggleAccepted(idx: number) {
    setParsedMatches(prev => prev ? prev.map((m, i) => i === idx ? { ...m, accepted: !m.accepted } : m) : prev)
  }

  async function handleAddAccepted() {
    if (!parsedMatches) return
    const toAdd = parsedMatches
      .filter(m => m.accepted && m.match)
      .map(m => ({ song_id: m.match!.song.id, title: m.match!.song.title, artist: m.match!.song.artist }))
    if (!toAdd.length) return
    setAdding(true)
    await addFromRepertoireRequests(eventId, toAdd)
    setParsedMatches(null)
    setPasteText('')
    setAdding(false)
  }

  async function handleAddToLearn(e: React.FormEvent) {
    e.preventDefault()
    if (!toLearnTitle.trim()) return
    startTransition(async () => {
      await addToLearnRequest(eventId, toLearnTitle, toLearnArtist || null)
      setToLearnTitle('')
      setToLearnArtist('')
    })
  }

  async function handleStatusChange(req: EventRequest, status: 'requested' | 'confirmed' | 'declined') {
    startTransition(async () => {
      await updateRequestStatus(req.id, eventId, status, req.song_id, req.type, req.title, req.artist)
    })
  }

  async function handleDelete(req: EventRequest) {
    if (!confirm(`Remove "${req.title}"?`)) return
    startTransition(async () => { await deleteRequest(req.id, eventId) })
  }

  const tabBtn = (t: 'from_repertoire' | 'to_learn'): React.CSSProperties => ({
    padding: '7px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)',
    background: 'none', border: 'none', borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent',
    color: activeTab === t ? 'var(--text)' : 'var(--text-secondary)',
    fontWeight: activeTab === t ? 500 : 400,
  })

  const inputStyle: React.CSSProperties = {
    height: 34, padding: '0 10px', fontSize: 13, boxSizing: 'border-box',
    background: 'var(--bg)', color: 'var(--text)',
    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font)', outline: 'none',
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 24 }}>
        <button style={tabBtn('from_repertoire')} onClick={() => setActiveTab('from_repertoire')}>
          From repertoire {fromRepertoire.length > 0 && `(${fromRepertoire.length})`}
        </button>
        <button style={tabBtn('to_learn')} onClick={() => setActiveTab('to_learn')}>
          To learn {toLearn.length > 0 && `(${toLearn.length})`}
        </button>
      </div>

      {/* ── From repertoire ── */}
      {activeTab === 'from_repertoire' && (
        <div>
          {/* Paste & parse */}
          {parsedMatches === null ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>
                Paste a list of requested songs — one per line, e.g. "Mr Brightside - The Killers"
              </div>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                placeholder={'Mr Brightside - The Killers\nValerie\nDancing Queen - ABBA'}
                style={{
                  width: '100%', minHeight: 120, padding: '10px 12px', fontSize: 13,
                  fontFamily: 'var(--font)', lineHeight: 1.6, boxSizing: 'border-box',
                  background: 'var(--bg-secondary)', color: 'var(--text)',
                  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  resize: 'vertical', outline: 'none',
                }}
              />
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={handleParse}
                  disabled={!pasteText.trim()}
                  style={{
                    padding: '7px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    background: pasteText.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: pasteText.trim() ? '#fff' : 'var(--text-tertiary)',
                    border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
                  }}
                >
                  Match against repertoire →
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text)' }}>
                Review matches — click to toggle
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {parsedMatches.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => m.match && toggleAccepted(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)',
                      background: m.accepted ? '#f0fdf4' : 'var(--bg-secondary)',
                      cursor: m.match ? 'pointer' : 'default',
                      opacity: m.match ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 }}>
                      {m.match ? (m.accepted ? '✓' : '○') : '✕'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>"{m.line}"</div>
                      {m.match ? (
                        <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 2 }}>
                          {m.match.song.title}
                          {m.match.song.artist && <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>{m.match.song.artist}</span>}
                          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                            {Math.round(m.match.score * 100)}% match
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 2 }}>No match found in repertoire</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAddAccepted}
                  disabled={adding || !parsedMatches.some(m => m.accepted && m.match)}
                  style={{
                    padding: '7px 18px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
                    opacity: adding ? 0.6 : 1,
                  }}
                >
                  {adding ? 'Adding…' : `Add ${parsedMatches.filter(m => m.accepted && m.match).length} song${parsedMatches.filter(m => m.accepted && m.match).length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => { setParsedMatches(null); setPasteText('') }}
                  style={{
                    padding: '7px 14px', fontSize: 13, cursor: 'pointer',
                    background: 'none', color: 'var(--text-secondary)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing from-repertoire requests */}
          <RequestList requests={fromRepertoire} onStatusChange={handleStatusChange} onDelete={handleDelete} />
        </div>
      )}

      {/* ── To learn ── */}
      {activeTab === 'to_learn' && (
        <div>
          <form onSubmit={handleAddToLearn} style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Title</div>
              <input
                value={toLearnTitle}
                onChange={e => setToLearnTitle(e.target.value)}
                placeholder="Song title"
                style={{ ...inputStyle, width: 220 }}
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Artist</div>
              <input
                value={toLearnArtist}
                onChange={e => setToLearnArtist(e.target.value)}
                placeholder="Artist (optional)"
                style={{ ...inputStyle, width: 180 }}
              />
            </div>
            <button
              type="submit"
              disabled={!toLearnTitle.trim()}
              style={{
                padding: '0 18px', height: 34, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: toLearnTitle.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                color: toLearnTitle.trim() ? '#fff' : 'var(--text-tertiary)',
                border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)',
              }}
            >
              Add request
            </button>
          </form>

          <RequestList requests={toLearn} onStatusChange={handleStatusChange} onDelete={handleDelete} showConfirmNote />
        </div>
      )}
    </div>
  )
}

// ── Request list ──────────────────────────────────────────────────────────────

function RequestList({
  requests,
  onStatusChange,
  onDelete,
  showConfirmNote,
}: {
  requests: EventRequest[]
  onStatusChange: (req: EventRequest, status: 'requested' | 'confirmed' | 'declined') => void
  onDelete: (req: EventRequest) => void
  showConfirmNote?: boolean
}) {
  if (requests.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '16px 0' }}>
        No requests yet.
      </div>
    )
  }

  return (
    <div>
      {showConfirmNote && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
          Confirming a request will automatically add the song to the repertoire.
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            {['Title', 'Artist', 'Status', ''].map((h, i) => (
              <th key={i} style={{
                textAlign: 'left', padding: '7px 12px', fontSize: 11,
                fontWeight: 600, color: 'var(--text-secondary)',
                paddingLeft: i === 0 ? 16 : 12,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '9px 12px 9px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                {req.title}
                {req.status === 'confirmed' && req.type === 'to_learn' && req.song_id && (
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400, marginLeft: 6 }}>
                    · added to repertoire
                  </span>
                )}
              </td>
              <td style={{ padding: '9px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                {req.artist ?? '—'}
              </td>
              <td style={{ padding: '9px 12px' }}>
                <select
                  value={req.status}
                  onChange={e => onStatusChange(req, e.target.value as 'requested' | 'confirmed' | 'declined')}
                  style={{
                    height: 28, padding: '0 6px', fontSize: 12, cursor: 'pointer',
                    background: 'var(--bg)', color: 'var(--text)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font)', outline: 'none',
                  }}
                >
                  <option value="requested">Requested</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="declined">Declined</option>
                </select>
              </td>
              <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                <button
                  onClick={() => onDelete(req)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--text-tertiary)', padding: '0 4px',
                    fontFamily: 'var(--font)',
                  }}
                >✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
