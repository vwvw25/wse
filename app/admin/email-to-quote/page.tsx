'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractFromEmail, saveEvent, checkDuplicateEvents } from './actions'
import type { EmailExtractResult, ExtractedAutoFill, DuplicateEventMatch } from './actions'
import type { RequestDetails } from '@/types/quote'
import DuplicateWarningModal from '../events/DuplicateWarningModal'

const DEFAULT_SOURCES = ['Encore', 'Poptop', 'Last Minute Musicians', 'Website']

type State = 'input' | 'extracting' | 'review' | 'creating' | 'error'

const BOOKING_TYPE_LABELS = {
  background: 'Background',
  dancing_under_40: 'Dancing — under 40',
  dancing_over_40: 'Dancing — over 40',
  wedding: 'Wedding',
}

const TRAVEL_TYPE_LABELS = {
  london_based: 'London based',
  uk: 'UK day trip',
  domestic_overnight: 'UK overnight',
  international: 'International',
}

export default function EmailToQuotePage() {
  const router = useRouter()
  const [state, setState] = useState<State>('input')
  const [emailText, setEmailText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [autoFill, setAutoFill] = useState<ExtractedAutoFill | null>(null)
  const [requestDetails, setRequestDetails] = useState<RequestDetails | null>(null)
  const [originalParse, setOriginalParse] = useState<EmailExtractResult | null>(null)
  const [sources, setSources] = useState<string[]>(DEFAULT_SOURCES)
  const [duplicates, setDuplicates] = useState<DuplicateEventMatch[] | null>(null)

  useEffect(() => {
    fetch('/api/admin/invoice-settings')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data?.booking_sources) && data.booking_sources.length > 0) {
          setSources(data.booking_sources)
        }
      })
      .catch(() => {})
  }, [])

  async function handleExtract() {
    if (!emailText.trim()) return
    setState('extracting')
    try {
      const result = await extractFromEmail(emailText)
      setOriginalParse(result)
      setAutoFill(result.auto_fill)
      setRequestDetails(result.request_details)
      setState('review')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Extraction failed')
      setState('error')
    }
  }

  async function handleSaveEvent(force = false) {
    if (!autoFill || !requestDetails) return
    if (!force) {
      const matches = await checkDuplicateEvents(autoFill)
      if (matches.length > 0) {
        setDuplicates(matches)
        return
      }
    }
    setState('creating')
    try {
      const { eventId } = await saveEvent({ auto_fill: autoFill, request_details: requestDetails }, emailText, originalParse!)
      router.push(`/quote/new?event=${eventId}`)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to save event')
      setState('error')
    }
  }

  function setAF<K extends keyof ExtractedAutoFill>(key: K, value: ExtractedAutoFill[K]) {
    setAutoFill(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function setRD<K extends keyof RequestDetails>(key: K, value: string) {
    setRequestDetails(prev => prev ? { ...prev, [key]: value || null } : prev)
  }

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/admin/quotes" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Quotes</a>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '8px 0 4px', color: 'var(--text)' }}>New quote from email</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
          Paste the email below. Booking type and travel are selected on the next step.
        </p>
      </div>

      {(state === 'input' || state === 'error') && (
        <div>
          <textarea
            value={emailText}
            onChange={e => setEmailText(e.target.value)}
            placeholder="Paste the email here…"
            style={{
              width: '100%', minHeight: 260, padding: '14px 16px',
              fontSize: 13, fontFamily: 'var(--font)', lineHeight: 1.6,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
            }}
          />
          {state === 'error' && (
            <p style={{ fontSize: 12, color: '#e53e3e', margin: '8px 0 0' }}>
              {errorMsg} — check the email text and try again.
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button
              onClick={handleExtract}
              disabled={!emailText.trim()}
              style={{
                padding: '10px 24px', fontSize: 13, fontWeight: 500,
                background: emailText.trim() ? 'var(--text)' : 'var(--border)',
                color: emailText.trim() ? 'var(--bg)' : 'var(--text-tertiary)',
                border: 'none', borderRadius: 'var(--radius-md)',
                cursor: emailText.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Extract details
            </button>
          </div>
        </div>
      )}

      {state === 'extracting' && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Extracting…
        </div>
      )}

      {state === 'creating' && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Saving…
        </div>
      )}

      {state === 'review' && autoFill && requestDetails && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 24, alignItems: 'start' }}>
          {/* Original email — sticky reference panel */}
          <div style={{ position: 'sticky', top: 24 }}>
            <SectionHeader>Original email</SectionHeader>
            <div style={{
              background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '16px 20px',
              fontSize: 13, lineHeight: 1.65, color: 'var(--text)',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 'calc(100vh - 160px)', overflowY: 'auto',
            }}>
              {emailText}
            </div>
          </div>

          {/* Parsed fields */}
          <div>
          {/* Auto-fills section */}
          <SectionHeader>Auto-fills in form</SectionHeader>
          <div style={{
            background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 16,
          }}>
            {/* Client + date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <Field label="Client type">
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['agency', 'direct'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setAF('is_agency', t === 'agency')}
                      style={{
                        padding: '6px 14px', fontSize: 12, border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        background: (t === 'agency') === autoFill.is_agency ? 'var(--accent)' : 'var(--bg)',
                        color: (t === 'agency') === autoFill.is_agency ? '#fff' : 'var(--text)',
                        fontFamily: 'var(--font)',
                      }}
                    >
                      {t === 'agency' ? 'Agency' : 'Direct'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Event date">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TextInput value={autoFill.event_date ?? ''} onChange={v => setAF('event_date', v || null)} placeholder="YYYY-MM-DD" />
                  {autoFill.event_date && (() => {
                    const dt = new Date(autoFill.event_date + 'T12:00:00')
                    if (isNaN(dt.getTime())) return null
                    return (
                      <span style={{
                        flexShrink: 0, fontSize: 11, fontWeight: 500,
                        color: 'var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                      }}>
                        {dt.toLocaleDateString('en-GB', { weekday: 'long' })}
                      </span>
                    )
                  })()}
                </div>
              </Field>

              {autoFill.is_agency ? (
                <>
                  <Field label="Agency name">
                    <TextInput value={autoFill.agency_name ?? ''} onChange={v => setAF('agency_name', v || null)} placeholder="—" />
                  </Field>
                  <Field label="Agent name">
                    <TextInput value={autoFill.agent_name ?? ''} onChange={v => setAF('agent_name', v || null)} placeholder="—" />
                  </Field>
                  <Field label="Agent email" style={{ gridColumn: '1 / -1' }}>
                    <TextInput value={autoFill.client_email ?? ''} onChange={v => setAF('client_email', v || null)} placeholder="—" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="First name">
                    <TextInput value={autoFill.agent_first_name ?? ''} onChange={v => setAF('agent_first_name', v || null)} placeholder="—" />
                  </Field>
                  <Field label="Surname">
                    <TextInput value={autoFill.agent_surname ?? ''} onChange={v => setAF('agent_surname', v || null)} placeholder="—" />
                  </Field>
                  <Field label="Email">
                    <TextInput value={autoFill.client_email ?? ''} onChange={v => setAF('client_email', v || null)} placeholder="—" />
                  </Field>
                  <Field label="Telephone">
                    <TextInput value={autoFill.client_phone ?? ''} onChange={v => setAF('client_phone', v || null)} placeholder="—" />
                  </Field>
                </>
              )}

              <Field label="Source" style={{ gridColumn: '1 / -1' }}>
                <select
                  value={autoFill.source ?? ''}
                  onChange={e => {
                    const v = e.target.value || null
                    setAF('source', v)
                    if (v !== 'Poptop' && v !== 'Encore') setAF('source_job_url', null)
                  }}
                  style={{
                    width: '100%', height: 34, padding: '0 10px', fontSize: 13,
                    background: 'var(--bg)', color: autoFill.source ? 'var(--text)' : 'var(--text-tertiary)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' as const,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">— Select source —</option>
                  {sources.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>

              {(autoFill.source === 'Poptop' || autoFill.source === 'Encore') && (
                <Field label="Job reference URL" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="url"
                      value={autoFill.source_job_url ?? ''}
                      onChange={e => setAF('source_job_url', e.target.value || null)}
                      placeholder="https://…"
                      style={{
                        flex: 1, height: 34, padding: '0 10px', fontSize: 13,
                        background: 'var(--bg)', color: 'var(--text)',
                        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' as const,
                      }}
                    />
                    {autoFill.source_job_url && (
                      <a
                        href={autoFill.source_job_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          flexShrink: 0, padding: '0 12px', height: 34, display: 'flex', alignItems: 'center',
                          fontSize: 12, fontWeight: 500, color: 'var(--accent)',
                          border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                          textDecoration: 'none', whiteSpace: 'nowrap',
                        }}
                      >
                        Open →
                      </a>
                    )}
                  </div>
                </Field>
              )}
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

            {/* Venue */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <Field label="Venue name">
                <TextInput value={autoFill.venue_name ?? ''} onChange={v => setAF('venue_name', v || null)} placeholder="—" />
              </Field>
              <Field label="Guests">
                <TextInput value={autoFill.guests != null ? String(autoFill.guests) : ''} onChange={v => setAF('guests', v ? parseInt(v) || null : null)} placeholder="—" />
              </Field>
              <Field label="Postcode">
                <TextInput value={autoFill.venue_postcode ?? ''} onChange={v => setAF('venue_postcode', v || null)} placeholder="—" />
              </Field>
              <Field label="Location">
                <TextInput value={autoFill.location ?? ''} onChange={v => setAF('location', v || null)} placeholder="e.g. Central London, Manchester" />
              </Field>
              <Field label="Address" style={{ gridColumn: '1 / -1' }}>
                <TextInput value={autoFill.venue_address ?? ''} onChange={v => setAF('venue_address', v || null)} placeholder="—" />
              </Field>
            </div>

            <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

            {/* Times */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px 16px' }}>
              {(
                [
                  ['arrival_time', 'Arrival'],
                  ['start_time', 'Start'],
                  ['finish_time', 'Finish'],
                  ['load_out_time', 'Load out'],
                ] as [keyof ExtractedAutoFill, string][]
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <TextInput
                    value={(autoFill[key] as string) ?? ''}
                    onChange={v => setAF(key, (v || null) as never)}
                    placeholder="HH:MM"
                  />
                </Field>
              ))}
            </div>
          </div>

          {/* Request details section */}
          <SectionHeader>Request details — shown on form, not auto-filled</SectionHeader>
          <div style={{
            background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 24,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              <Field label="Band size requested">
                <TextInput
                  value={requestDetails.band_size_requested ?? ''}
                  onChange={v => setRD('band_size_requested', v)}
                  placeholder="e.g. 4 piece, trio"
                />
              </Field>
              <Field label="Sets requested">
                <TextInput
                  value={requestDetails.sets_requested ?? ''}
                  onChange={v => setRD('sets_requested', v)}
                  placeholder="e.g. 2 × 45 min"
                />
              </Field>
              <Field label="Special requirements">
                <TextInput
                  value={requestDetails.special_requirements ?? ''}
                  onChange={v => setRD('special_requirements', v)}
                  placeholder="e.g. boat, outdoor, no lift"
                />
              </Field>
              <Field label="Sound requirements">
                <TextInput
                  value={requestDetails.sound_requirements ?? ''}
                  onChange={v => setRD('sound_requirements', v)}
                  placeholder="e.g. limiter, client PA, acoustic"
                />
              </Field>
            </div>
            <div style={{ marginTop: 12 }}>
              <Field label="Notes">
                <textarea
                  value={requestDetails.notes ?? ''}
                  onChange={e => setRD('notes', e.target.value)}
                  placeholder="Anything else relevant to this quote…"
                  style={{
                    width: '100%', minHeight: 72, padding: '8px 10px',
                    fontSize: 13, fontFamily: 'var(--font)', lineHeight: 1.5,
                    background: 'var(--bg)', color: 'var(--text)',
                    border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                  }}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setState('input')}
              style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 500,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              ← Try again
            </button>
            <button
              onClick={() => handleSaveEvent()}
              style={{
                padding: '10px 24px', fontSize: 13, fontWeight: 500,
                background: 'var(--text)', color: 'var(--bg)',
                border: 'none', borderRadius: 'var(--radius-md)',
                cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              Save & start quote →
            </button>
          </div>
          </div>{/* end parsed fields column */}
        </div>
      )}
      {duplicates && (
        <DuplicateWarningModal
          matches={duplicates}
          onCancel={() => setDuplicates(null)}
          onConfirm={() => { setDuplicates(null); handleSaveEvent(true) }}
        />
      )}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: 'var(--text-secondary)', marginBottom: 8,
    }}>
      {children}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5, letterSpacing: '0.02em' }}>{label}</div>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', height: 34, padding: '0 10px', fontSize: 13,
        background: 'var(--bg)', color: 'var(--text)',
        border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
        outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
      }}
    />
  )
}
