'use client'

import { useState, useRef, useTransition } from 'react'
import type { EventRecord, ContractFlag } from '@/types/quote'
import { saveContractReview, saveContractParsed, resolveContractFlag, acceptContractFlag, deleteContract } from '../actions'

type ParsedContract = Record<string, string | number | null>

// Fields to compare, in display order
const FIELDS: { key: string; label: string; rdKey?: boolean }[] = [
  { key: 'event_date', label: 'Event date' },
  { key: 'agency_name', label: 'Agency' },
  { key: 'agent_name', label: 'Agent' },
  { key: 'client_email', label: 'Client email' },
  { key: 'venue_name', label: 'Venue' },
  { key: 'venue_address', label: 'Venue address' },
  { key: 'venue_postcode', label: 'Postcode' },
  { key: 'location', label: 'Location' },
  { key: 'guests', label: 'Guests' },
  { key: 'arrival_time', label: 'Arrival time' },
  { key: 'start_time', label: 'Start time' },
  { key: 'finish_time', label: 'Finish time' },
  { key: 'load_out_time', label: 'Load out time' },
  { key: 'band_size', label: 'Band size', rdKey: true },
  { key: 'sets_requested', label: 'Sets', rdKey: true },
]

function getEventValue(ev: EventRecord, key: string): string {
  if (key === 'band_size') return ev.request_details?.band_size_requested ?? ''
  if (key === 'sets_requested') return ev.request_details?.sets_requested ?? ''
  const val = ev[key as keyof EventRecord]
  if (val == null) return ''
  return String(val)
}

// Map parsed contract key → event key (they differ for band_size)
function contractKeyToEventKey(key: string): string {
  if (key === 'band_size') return 'band_size_requested'
  return key
}

function normalise(v: string | number | null | undefined): string {
  return String(v ?? '').trim().toLowerCase()
}

function isDifferent(eventVal: string, contractVal: string | number | null): boolean {
  if (!contractVal && !eventVal) return false
  if (!contractVal) return false // contract doesn't mention it — not a conflict
  return normalise(eventVal) !== normalise(contractVal)
}

export default function ContractSection({
  event,
  quotePrice,
}: {
  event: EventRecord
  quotePrice: number | null
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedContract | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, 'accept' | 'flag'>>({})
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()
  const [resolvingFlag, startResolvingFlag] = useTransition()

  // Local copy so the saved view shows immediately after upload without waiting for server re-render
  const [localContract, setLocalContract] = useState(event.contract)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const savedContract = localContract
  const existingFlags = savedContract?.flags ?? []
  const showSaved = !!savedContract && !parsed

  async function handleUpload(file: File) {
    setParsing(true)
    setParseError(null)
    setParsed(null)
    setDecisions({})
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch(`/api/admin/events/${event.id}/contract`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Parse failed')
      const newContract = { parsed: json.parsed, flags: [], uploaded_at: new Date().toISOString(), file_name: json.file?.name, file_size: json.file?.size, file_path: json.file?.path }
      setParsed(json.parsed)
      setLocalContract(newContract)
      await saveContractParsed(event.id, json.parsed, json.file)
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Failed to parse contract')
    } finally {
      setParsing(false)
    }
  }

  function decide(key: string, d: 'accept' | 'flag') {
    setDecisions(prev => ({ ...prev, [key]: d }))
  }

  function handleApply() {
    if (!parsed) return
    const acceptedFields: Record<string, string | number | null> = {}
    const flags: ContractFlag[] = []

    for (const f of FIELDS) {
      const contractVal = parsed[f.key]
      const eventVal = getEventValue(event, f.key)
      if (!isDifferent(eventVal, contractVal)) continue
      const d = decisions[f.key]
      if (d === 'accept') {
        acceptedFields[contractKeyToEventKey(f.key)] = contractVal
      } else if (d === 'flag') {
        flags.push({
          field: f.key,
          label: f.label,
          contract_value: String(contractVal ?? ''),
          event_value: eventVal,
        })
      }
    }

    startSaving(async () => {
      await saveContractReview(event.id, acceptedFields, flags, parsed)
      setLocalContract({ parsed, flags, uploaded_at: localContract?.uploaded_at ?? new Date().toISOString() })
      setParsed(null)
      setDecisions({})
    })
  }

  function handleResolveFlag(fieldKey: string) {
    startResolvingFlag(async () => {
      await resolveContractFlag(event.id, fieldKey)
    })
  }

  // Diffs from current parse
  const diffs = parsed
    ? FIELDS.filter(f => isDifferent(getEventValue(event, f.key), parsed[f.key]))
    : []
  const matches = parsed
    ? FIELDS.filter(f => parsed[f.key] != null && !isDifferent(getEventValue(event, f.key), parsed[f.key]))
    : []
  const allDecided = diffs.length > 0 && diffs.every(f => decisions[f.key])

  const contractFee = parsed?.fee ?? null
  const feeMatch = contractFee != null && quotePrice != null
    ? Math.round(Number(contractFee)) === Math.round(quotePrice)
    : null

  return (
    <div>
      {/* Outstanding flags */}
      {existingFlags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {existingFlags.map(flag => (
            <div key={flag.field} style={{
              padding: '10px 14px', marginBottom: 6,
              background: '#fffbeb', border: '0.5px solid #f59e0b',
              borderRadius: 'var(--radius-md)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#92400e', marginBottom: 3 }}>
                ⚠ {flag.label}
              </div>
              <div style={{ fontSize: 12, color: '#78350f', marginBottom: 10 }}>
                Event record: <strong>{flag.event_value || '—'}</strong>
                <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
                Contract says: <strong>{flag.contract_value || '—'}</strong>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => startResolvingFlag(async () => {
                    await acceptContractFlag(event.id, flag)
                    setLocalContract(c => c ? { ...c, flags: c.flags.filter(f => f.field !== flag.field) } : c)
                  })}
                  disabled={resolvingFlag}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 500,
                    background: '#16a34a', border: 'none',
                    color: '#fff', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  Accept contract value
                </button>
                <button
                  onClick={() => startResolvingFlag(async () => {
                    await resolveContractFlag(event.id, flag.field)
                    setLocalContract(c => c ? { ...c, flags: c.flags.filter(f => f.field !== flag.field) } : c)
                  })}
                  disabled={resolvingFlag}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: '0.5px solid #d97706',
                    color: '#92400e', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  Agent will amend
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />

      {/* Saved contract view */}
      {showSaved && (
        <div>
          <div style={{
            border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
            overflow: 'hidden', marginBottom: 12,
          }}>
            {/* File card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 16px', background: 'var(--bg-secondary)',
              borderBottom: '0.5px solid var(--border)',
            }}>
              {/* PDF icon */}
              <div style={{
                width: 36, height: 44, flexShrink: 0, borderRadius: 4,
                background: '#fee2e2', border: '0.5px solid #fca5a5',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#dc2626', letterSpacing: '0.05em' }}>PDF</span>
              </div>

              {/* File info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {savedContract.file_name ?? 'Contract'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {savedContract.file_size ? `${(savedContract.file_size / 1024).toFixed(0)} KB · ` : ''}
                  Uploaded {new Date(savedContract.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {savedContract.file_path && (
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/admin/events/${event.id}/contract`)
                      setPdfUrl(res.url)
                    }}
                    style={{
                      padding: '5px 12px', fontSize: 12, fontWeight: 500,
                      background: 'var(--bg)', border: '0.5px solid var(--border)',
                      color: 'var(--text)', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
                    }}
                  >
                    View
                  </button>
                )}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={parsing}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: '0.5px solid var(--border)',
                    color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
                  }}
                >
                  {parsing ? 'Parsing…' : 'Replace'}
                </button>
                <button
                  onClick={() => {
                    if (confirm('Delete this contract? This cannot be undone.')) {
                      startDeleting(async () => {
                        await deleteContract(event.id)
                        setLocalContract(null)
                      })
                    }
                  }}
                  disabled={deleting}
                  style={{
                    padding: '5px 12px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: '0.5px solid var(--border)',
                    color: '#dc2626', borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
                  }}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Saved fields */}
            {FIELDS.filter(f => savedContract.parsed[f.key] != null).map((f, i, arr) => {
              const contractVal = savedContract.parsed[f.key]
              const eventVal = getEventValue(event, f.key)
              const diff = isDifferent(eventVal, contractVal)
              return (
                <div key={f.key} style={{
                  display: 'grid', gridTemplateColumns: '20px 130px 1fr 1fr',
                  gap: '0 12px', padding: '8px 14px', alignItems: 'center',
                  borderBottom: i === arr.length - 1 ? 'none' : '0.5px solid var(--border)',
                }}>
                  <div style={{ fontSize: 13, textAlign: 'center' }}>
                    {diff ? <span style={{ color: '#d97706' }}>⚠</span> : <span style={{ color: '#16a34a' }}>✓</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{eventVal || '—'}</div>
                  <div style={{ fontSize: 13, fontWeight: diff ? 600 : 400, color: 'var(--text)' }}>{String(contractVal ?? '')}</div>
                </div>
              )
            })}

            {/* Fee */}
            {savedContract.parsed.fee != null && (
              <div style={{
                display: 'grid', gridTemplateColumns: '20px 130px 1fr 1fr',
                gap: '0 12px', padding: '8px 14px', alignItems: 'center',
                borderTop: '0.5px solid var(--border)',
                background: quotePrice != null
                  ? Math.round(Number(savedContract.parsed.fee)) === Math.round(quotePrice) ? '#f0fdf4' : '#fffbeb'
                  : undefined,
              }}>
                <div style={{ fontSize: 13, textAlign: 'center' }}>
                  {quotePrice != null
                    ? Math.round(Number(savedContract.parsed.fee)) === Math.round(quotePrice)
                      ? <span style={{ color: '#16a34a' }}>✓</span>
                      : <span style={{ color: '#d97706' }}>⚠</span>
                    : null}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Fee</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{quotePrice != null ? `£${Math.round(quotePrice).toLocaleString('en-GB')}` : '—'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>£{Number(savedContract.parsed.fee).toLocaleString('en-GB')}</div>
              </div>
            )}
          </div>

          {parseError && <p style={{ fontSize: 13, color: '#b91c1c', marginBottom: 8 }}>{parseError}</p>}
        </div>
      )}

      {/* No contract yet — upload prompt */}
      {!showSaved && !parsed && (
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: parsing ? 'wait' : 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            {parsing ? 'Parsing…' : 'Upload contract PDF'}
          </button>
          {parseError && <p style={{ fontSize: 13, color: '#b91c1c', marginTop: 8 }}>{parseError}</p>}
        </div>
      )}

      {/* Diff view */}
      {parsed && (
        <div>
          {/* Fee check */}
          {contractFee != null && (
            <div style={{
              padding: '10px 14px', marginBottom: 12,
              border: `0.5px solid ${feeMatch === false ? '#f59e0b' : feeMatch === true ? '#16a34a' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              background: feeMatch === false ? '#fffbeb' : feeMatch === true ? '#f0fdf4' : 'var(--bg-secondary)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: feeMatch === false ? '#92400e' : feeMatch === true ? '#166534' : 'var(--text)', marginBottom: 2 }}>
                {feeMatch === false ? '⚠ Fee mismatch' : feeMatch === true ? '✓ Fee matches' : 'Fee (manual check)'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>
                Contract: <strong>£{Number(contractFee).toLocaleString('en-GB')}</strong>
                {quotePrice != null && (
                  <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>
                    Quote: <strong>£{Math.round(quotePrice).toLocaleString('en-GB')}</strong>
                  </span>
                )}
                {quotePrice == null && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-tertiary)' }}>
                    (no linked quote to compare)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* All fields — unified view */}
          <div style={{ marginBottom: 12, border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '20px 130px 1fr 1fr auto',
              gap: '0 12px', padding: '7px 14px',
              borderBottom: '0.5px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <div />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract</div>
              <div />
            </div>
            {FIELDS.filter(f => parsed[f.key] != null).map((f, i, arr) => {
              const contractVal = parsed[f.key]
              const eventVal = getEventValue(event, f.key)
              const diff = isDifferent(eventVal, contractVal)
              const d = decisions[f.key]
              const isLast = i === arr.length - 1

              return (
                <div key={f.key} style={{
                  display: 'grid',
                  gridTemplateColumns: '20px 130px 1fr 1fr auto',
                  gap: '0 12px',
                  padding: '9px 14px',
                  alignItems: 'center',
                  borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
                  background: d === 'flag' ? '#fffbeb' : d === 'accept' ? '#f0fdf4' : diff ? 'var(--bg)' : 'var(--bg)',
                }}>
                  {/* Status icon */}
                  <div style={{ fontSize: 13, textAlign: 'center' }}>
                    {diff
                      ? <span style={{ color: '#d97706' }}>⚠</span>
                      : <span style={{ color: '#16a34a' }}>✓</span>
                    }
                  </div>

                  {/* Label */}
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.label}</div>

                  {/* Event value */}
                  <div style={{ fontSize: 13, color: diff ? 'var(--text-secondary)' : 'var(--text)' }}>
                    {eventVal || <em style={{ color: 'var(--text-tertiary)', fontStyle: 'normal' }}>—</em>}
                  </div>

                  {/* Contract value */}
                  <div style={{ fontSize: 13, fontWeight: diff ? 600 : 400, color: diff ? 'var(--text)' : 'var(--text-secondary)' }}>
                    {String(contractVal ?? '')}
                  </div>

                  {/* Actions — only for diffs */}
                  <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', minWidth: 120 }}>
                    {diff ? (
                      <>
                        <button
                          onClick={() => decide(f.key, 'accept')}
                          style={{
                            padding: '3px 9px', fontSize: 11, fontWeight: 500,
                            background: d === 'accept' ? '#16a34a' : 'transparent',
                            color: d === 'accept' ? '#fff' : 'var(--text-secondary)',
                            border: `0.5px solid ${d === 'accept' ? '#16a34a' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                          }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => decide(f.key, 'flag')}
                          style={{
                            padding: '3px 9px', fontSize: 11, fontWeight: 500,
                            background: d === 'flag' ? '#d97706' : 'transparent',
                            color: d === 'flag' ? '#fff' : 'var(--text-secondary)',
                            border: `0.5px solid ${d === 'flag' ? '#d97706' : 'var(--border)'}`,
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
                          }}
                        >
                          Flag
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleApply}
              disabled={!allDecided && diffs.length > 0 || saving}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 500,
                background: 'var(--text)', color: 'var(--bg)', border: 'none',
                borderRadius: 'var(--radius-sm)', cursor: (allDecided || diffs.length === 0) && !saving ? 'pointer' : 'not-allowed',
                opacity: (allDecided || diffs.length === 0) && !saving ? 1 : 0.5,
                fontFamily: 'var(--font)',
              }}
            >
              {saving ? 'Saving…' : 'Apply'}
            </button>
            <button
              onClick={() => { setParsed(null); setDecisions({}) }}
              style={{
                padding: '7px 16px', fontSize: 13, fontWeight: 500,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              Review later
            </button>
            {!allDecided && diffs.length > 0 && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Review all {diffs.length - Object.keys(decisions).length} remaining differences to apply
              </span>
            )}
          </div>
        </div>
      )}

      {/* PDF modal */}
      {pdfUrl && (
        <div
          onClick={() => setPdfUrl(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '80vw', height: '88vh',
              background: '#fff', borderRadius: 8,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: '0.5px solid #e5e5e5', flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>
                {savedContract?.file_name ?? 'Contract'}
              </span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={pdfUrl}
                  download={savedContract?.file_name ?? 'contract.pdf'}
                  style={{
                    padding: '4px 12px', fontSize: 12, fontWeight: 500,
                    background: '#111', color: '#fff', borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  Download
                </a>
                <button
                  onClick={() => setPdfUrl(null)}
                  style={{
                    padding: '4px 10px', fontSize: 18, lineHeight: 1,
                    background: 'transparent', border: 'none',
                    color: '#888', cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            </div>
            {/* PDF iframe */}
            <iframe
              src={pdfUrl}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title="Contract"
            />
          </div>
        </div>
      )}
    </div>
  )
}
