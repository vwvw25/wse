'use client'

import { useState, useRef, useTransition } from 'react'
import type { EventRecord, ContractFlag, ContractFile } from '@/types/quote'
import { saveContractReview, saveContractParsed, resolveContractFlag, acceptContractFlag, deleteContract, deleteContractAttachment } from '../actions'

type ParsedContract = Record<string, string | number | null>

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

function contractKeyToEventKey(key: string): string {
  if (key === 'band_size') return 'band_size_requested'
  return key
}

function normalise(v: string | number | null | undefined): string {
  return String(v ?? '').trim().toLowerCase()
}

function isDifferent(eventVal: string, contractVal: string | number | null): boolean {
  if (!contractVal && !eventVal) return false
  if (!contractVal) return false
  return normalise(eventVal) !== normalise(contractVal)
}

async function fetchSignedUrl(eventId: string, filePath?: string): Promise<string | null> {
  const url = filePath
    ? `/api/admin/events/${eventId}/contract?path=${encodeURIComponent(filePath)}`
    : `/api/admin/events/${eventId}/contract`
  const res = await fetch(url)
  if (!res.ok) return null
  const json = await res.json()
  return json.url ?? null
}

function FileCard({
  name,
  size,
  uploadedAt,
  onView,
  onDelete,
  deleting,
}: {
  name: string
  size?: number
  uploadedAt: string
  onView: () => void
  onDelete?: () => void
  deleting?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 14px', background: 'var(--bg-secondary)',
    }}>
      <div style={{
        width: 32, height: 40, flexShrink: 0, borderRadius: 4,
        background: '#fee2e2', border: '0.5px solid #fca5a5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 8, fontWeight: 700, color: '#dc2626', letterSpacing: '0.05em' }}>PDF</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {size ? `${(size / 1024).toFixed(0)} KB · ` : ''}
          {new Date(uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onView}
          style={{
            padding: '4px 10px', fontSize: 12, fontWeight: 500,
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            color: 'var(--text)', borderRadius: 'var(--radius-sm)',
            cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
          }}
        >
          View
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 500,
              background: 'transparent', border: '0.5px solid var(--border)',
              color: '#dc2626', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
            }}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function ContractSection({
  event,
  quotePrice,
}: {
  event: EventRecord
  quotePrice: number | null
}) {
  const mainFileRef = useRef<HTMLInputElement>(null)
  const attachFileRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [attaching, setAttaching] = useState(false)
  const [parsed, setParsed] = useState<ParsedContract | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, 'accept' | 'flag'>>({})
  const [saving, startSaving] = useTransition()
  const [deleting, startDeleting] = useTransition()
  const [resolvingFlag, startResolvingFlag] = useTransition()
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null)

  const [localContract, setLocalContract] = useState(event.contract)
  const [modalUrl, setModalUrl] = useState<string | null>(null)
  const [modalFileName, setModalFileName] = useState<string>('Contract')

  const savedContract = localContract
  const existingFlags = savedContract?.flags ?? []
  const attachments = savedContract?.attachments ?? []
  const showSaved = !!savedContract && !parsed

  async function openFile(filePath?: string, fileName?: string) {
    const url = await fetchSignedUrl(event.id, filePath)
    if (!url) return
    setModalFileName(fileName ?? 'Contract')
    setModalUrl(url)
  }

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
      const newContract = {
        parsed: json.parsed,
        flags: [],
        uploaded_at: new Date().toISOString(),
        file_name: json.file?.name,
        file_size: json.file?.size,
        file_path: json.file?.path,
        attachments: savedContract?.attachments ?? [],
      }
      setParsed(json.parsed)
      setLocalContract(newContract)
      await saveContractParsed(event.id, json.parsed, json.file)
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Failed to parse contract')
    } finally {
      setParsing(false)
    }
  }

  async function handleAttach(file: File) {
    setAttaching(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/admin/events/${event.id}/contract/attach`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setLocalContract(c => {
        if (!c) {
          return {
            parsed: {},
            flags: [],
            uploaded_at: new Date().toISOString(),
            attachments: [json.attachment],
          }
        }
        return { ...c, attachments: [...(c.attachments ?? []), json.attachment] }
      })
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Failed to attach file')
    } finally {
      setAttaching(false)
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
      setLocalContract(c => ({ ...c!, parsed, flags }))
      setParsed(null)
      setDecisions({})
    })
  }

  const diffs = parsed
    ? FIELDS.filter(f => isDifferent(getEventValue(event, f.key), parsed[f.key]))
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

      {/* Hidden file inputs */}
      <input
        ref={mainFileRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleUpload(f)
          e.target.value = ''
        }}
      />
      <input
        ref={attachFileRef}
        type="file"
        accept="application/pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleAttach(f)
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
            {/* Primary file card */}
            {savedContract.file_path && (
              <div style={{ borderBottom: '0.5px solid var(--border)' }}>
                <FileCard
                  name={savedContract.file_name ?? 'Contract'}
                  size={savedContract.file_size}
                  uploadedAt={savedContract.uploaded_at}
                  onView={() => openFile(savedContract.file_path, savedContract.file_name)}
                  onDelete={() => {
                    if (confirm('Delete this contract? This cannot be undone.')) {
                      startDeleting(async () => {
                        await deleteContract(event.id)
                        setLocalContract(null)
                      })
                    }
                  }}
                  deleting={deleting}
                />
              </div>
            )}

            {/* Additional attachments */}
            {attachments.map((att: ContractFile, i) => (
              <div key={att.path} style={{ borderBottom: i < attachments.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <FileCard
                  name={att.name}
                  size={att.size}
                  uploadedAt={att.uploaded_at}
                  onView={() => openFile(att.path, att.name)}
                  onDelete={() => {
                    if (confirm(`Delete ${att.name}?`)) {
                      setDeletingAttachment(att.path)
                      deleteContractAttachment(event.id, att.path).then(() => {
                        setLocalContract(c => c ? { ...c, attachments: (c.attachments ?? []).filter(a => a.path !== att.path) } : c)
                        setDeletingAttachment(null)
                      })
                    }
                  }}
                  deleting={deletingAttachment === att.path}
                />
              </div>
            ))}

            {/* Add file / Replace contract row */}
            <div style={{
              padding: '8px 14px',
              borderTop: (savedContract.file_path || attachments.length > 0) ? '0.5px solid var(--border)' : 'none',
              display: 'flex', gap: 8,
            }}>
              <button
                onClick={() => attachFileRef.current?.click()}
                disabled={attaching}
                style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 500,
                  background: 'transparent', border: '0.5px solid var(--border)',
                  color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                  cursor: attaching ? 'wait' : 'pointer', fontFamily: 'var(--font)',
                }}
              >
                {attaching ? 'Uploading…' : '+ Add file'}
              </button>
              {savedContract.file_path && (
                <button
                  onClick={() => mainFileRef.current?.click()}
                  disabled={parsing}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: '0.5px solid var(--border)',
                    color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                    cursor: parsing ? 'wait' : 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  {parsing ? 'Parsing…' : 'Replace contract'}
                </button>
              )}
              {!savedContract.file_path && (
                <button
                  onClick={() => mainFileRef.current?.click()}
                  disabled={parsing}
                  style={{
                    padding: '4px 10px', fontSize: 12, fontWeight: 500,
                    background: 'transparent', border: '0.5px solid var(--border)',
                    color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)',
                    cursor: parsing ? 'wait' : 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  {parsing ? 'Parsing…' : 'Upload contract PDF'}
                </button>
              )}
            </div>

            {/* Saved parsed fields */}
            {FIELDS.filter(f => savedContract.parsed[f.key] != null).map((f, i) => {
              const contractVal = savedContract.parsed[f.key]
              const eventVal = getEventValue(event, f.key)
              const diff = isDifferent(eventVal, contractVal)
              return (
                <div key={f.key} style={{
                  display: 'grid', gridTemplateColumns: '20px 130px 1fr 1fr',
                  gap: '0 12px', padding: '8px 14px', alignItems: 'center',
                  borderTop: '0.5px solid var(--border)',
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => mainFileRef.current?.click()}
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
          <button
            onClick={() => attachFileRef.current?.click()}
            disabled={attaching}
            style={{
              padding: '8px 16px', fontSize: 13, fontWeight: 500,
              background: 'transparent', color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', cursor: attaching ? 'wait' : 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            {attaching ? 'Uploading…' : 'Attach file'}
          </button>
          {parseError && <p style={{ fontSize: 13, color: '#b91c1c', margin: 0 }}>{parseError}</p>}
        </div>
      )}

      {/* Diff view after upload */}
      {parsed && (
        <div>
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
                  background: d === 'flag' ? '#fffbeb' : d === 'accept' ? '#f0fdf4' : 'var(--bg)',
                }}>
                  <div style={{ fontSize: 13, textAlign: 'center' }}>
                    {diff
                      ? <span style={{ color: '#d97706' }}>⚠</span>
                      : <span style={{ color: '#16a34a' }}>✓</span>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{f.label}</div>
                  <div style={{ fontSize: 13, color: diff ? 'var(--text-secondary)' : 'var(--text)' }}>
                    {eventVal || <em style={{ color: 'var(--text-tertiary)', fontStyle: 'normal' }}>—</em>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: diff ? 600 : 400, color: diff ? 'var(--text)' : 'var(--text-secondary)' }}>
                    {String(contractVal ?? '')}
                  </div>
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

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={handleApply}
              disabled={(!allDecided && diffs.length > 0) || saving}
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

      {/* PDF/file viewer modal */}
      {modalUrl && (
        <div
          onClick={() => setModalUrl(null)}
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
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderBottom: '0.5px solid #e5e5e5', flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#111' }}>{modalFileName}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a
                  href={modalUrl}
                  download={modalFileName}
                  style={{
                    padding: '4px 12px', fontSize: 12, fontWeight: 500,
                    background: '#111', color: '#fff', borderRadius: 6,
                    textDecoration: 'none',
                  }}
                >
                  Download
                </a>
                <button
                  onClick={() => setModalUrl(null)}
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
            <iframe
              src={modalUrl}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title={modalFileName}
            />
          </div>
        </div>
      )}
    </div>
  )
}
