'use client'

import { useState, useTransition } from 'react'
import type { EventRecord, AvRiderSummary, AvSetupSummary } from '@/types/quote'
import { updateEventAv } from '../actions'

const selectStyle: React.CSSProperties = {
  width: '100%', maxWidth: 280, height: 36, padding: '0 10px', fontSize: 13,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', appearance: 'auto',
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
      {children}
    </label>
  )
}

type ProvidedBy = 'us' | 'client' | 'venue' | ''
type RiderStatus = 'sent' | 'unsent' | ''

export default function AvSection({
  event,
  avRiders,
  avSetups,
}: {
  event: EventRecord
  avRiders: AvRiderSummary[]
  avSetups: AvSetupSummary[]
}) {
  const [avProvidedBy, setAvProvidedBy] = useState<ProvidedBy>(event.av_provided_by ?? '')
  const [avRiderId, setAvRiderId] = useState(event.av_rider_id ?? '')
  const [riderStatus, setRiderStatus] = useState<RiderStatus>(event.rider_status ?? '')
  const [avSetupId, setAvSetupId] = useState(event.av_setup_id ?? '')
  const [saving, startTransition] = useTransition()

  function save(next: { av_provided_by?: ProvidedBy; av_rider_id?: string; rider_status?: RiderStatus; av_setup_id?: string }) {
    const merged = {
      av_provided_by: (next.av_provided_by ?? avProvidedBy) || null,
      av_rider_id: (next.av_rider_id ?? avRiderId) || null,
      rider_status: (next.rider_status ?? riderStatus) || null,
      av_setup_id: (next.av_setup_id ?? avSetupId) || null,
    }
    startTransition(async () => { await updateEventAv(event.id, merged) })
  }

  function handleProvidedByChange(v: string) {
    const value: ProvidedBy = v === 'us' || v === 'client' || v === 'venue' ? v : ''
    setAvProvidedBy(value)
    const clearedSetup = value === 'us' ? avSetupId : ''
    const clearedRider = value === 'client' || value === 'venue' ? avRiderId : ''
    const clearedStatus = value === 'client' || value === 'venue' ? riderStatus : ''
    if (clearedSetup !== avSetupId) setAvSetupId(clearedSetup)
    if (clearedRider !== avRiderId) setAvRiderId(clearedRider)
    if (clearedStatus !== riderStatus) setRiderStatus(clearedStatus)
    save({ av_provided_by: value, av_setup_id: clearedSetup, av_rider_id: clearedRider, rider_status: clearedStatus })
  }

  function handleRiderChange(v: string) {
    setAvRiderId(v)
    const clearedStatus = v ? riderStatus : ''
    if (clearedStatus !== riderStatus) setRiderStatus(clearedStatus)
    save({ av_rider_id: v, rider_status: clearedStatus })
  }

  const showRider = avProvidedBy === 'client' || avProvidedBy === 'venue'
  const showAvRequired = avProvidedBy === 'us'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <FieldLabel>AV to be provided by</FieldLabel>
        <select value={avProvidedBy} onChange={e => handleProvidedByChange(e.target.value)} style={selectStyle}>
          <option value="">—</option>
          <option value="us">Us</option>
          <option value="client">Client</option>
          <option value="venue">Venue</option>
        </select>
      </div>

      {showRider && (
        <div>
          <FieldLabel>Rider</FieldLabel>
          <select value={avRiderId} onChange={e => handleRiderChange(e.target.value)} style={selectStyle}>
            <option value="">—</option>
            {avRiders.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {avRiders.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              No riders configured yet — add one in Settings → AV → Riders.
            </div>
          )}
        </div>
      )}

      {showRider && avRiderId && (
        <div>
          <FieldLabel>Rider status</FieldLabel>
          <select
            value={riderStatus}
            onChange={e => { const v = e.target.value as RiderStatus; setRiderStatus(v); save({ rider_status: v }) }}
            style={selectStyle}
          >
            <option value="">—</option>
            <option value="unsent">Unsent</option>
            <option value="sent">Sent</option>
          </select>
        </div>
      )}

      {showAvRequired && (
        <div>
          <FieldLabel>AV required</FieldLabel>
          <select
            value={avSetupId}
            onChange={e => { setAvSetupId(e.target.value); save({ av_setup_id: e.target.value }) }}
            style={selectStyle}
          >
            <option value="">—</option>
            {avSetups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {avSetups.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              No AV set ups configured yet — add one in Settings → AV → Set ups.
            </div>
          )}
        </div>
      )}

      {saving && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Saving…</span>}
    </div>
  )
}
