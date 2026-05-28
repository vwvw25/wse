'use client'

import React, { useEffect, useState } from 'react'
import type { Settings } from '@/types/quote'
import type { InvoiceSettings } from '@/types/invoice'

type SettingsState = Settings & Record<string, number>

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  fontFamily: 'var(--font)',
  background: 'var(--bg)',
  color: 'var(--text)',
  width: 120,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text)',
  flex: 1,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 0',
  borderBottom: '0.5px solid var(--border)',
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  color: 'var(--text-secondary)',
  margin: '28px 0 8px',
}

function FieldRow({
  label,
  fieldKey,
  value,
  onChange,
  isPercent,
  hint,
}: {
  label: string
  fieldKey: string
  value: number
  onChange: (key: string, val: number) => void
  isPercent?: boolean
  hint?: string
}) {
  const displayValue = isPercent ? ((value - 1) * 100).toFixed(2) : value

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseFloat(e.target.value)
    if (isNaN(raw)) return
    const stored = isPercent ? 1 + raw / 100 : raw
    onChange(fieldKey, stored)
  }

  return (
    <div style={rowStyle}>
      <span style={labelStyle}>
        {label}
        {hint && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>{hint}</span>}
      </span>
      <input
        type="number"
        step="0.01"
        value={displayValue}
        onChange={handleChange}
        style={inputStyle}
      />
      {isPercent && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>}
    </div>
  )
}

type Section = 'pricing' | 'invoicing' | 'email' | 'general'

const NAV: { key: Section; label: string }[] = [
  { key: 'pricing', label: 'Pricing' },
  { key: 'invoicing', label: 'Invoicing' },
  { key: 'email', label: 'Email' },
  { key: 'general', label: 'General' },
]

export default function SettingsPage() {
  const [section, setSection] = useState<Section>('pricing')
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Invoice settings state
  const [invSettings, setInvSettings] = useState<Partial<InvoiceSettings>>({})
  const [invLoading, setInvLoading] = useState(true)
  const [invSaving, setInvSaving] = useState(false)
  const [invMessage, setInvMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Monitoring settings state
  const [monSettings, setMonSettings] = useState<{ alert_email?: string; delivery_threshold_minutes?: number; pending_threshold_minutes?: number; test_email_address?: string; reply_to_email?: string }>({})
  const [monLoading, setMonLoading] = useState(true)
  const [monSaving, setMonSaving] = useState(false)
  const [monMessage, setMonMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Test email state
  const [testSending, setTestSending] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; text: string }>>({})

  // Celebration GIFs state
  const [gifs, setGifs] = useState<{ id: string; url: string }[]>([])
  const [gifsLoading, setGifsLoading] = useState(true)
  const [newGifUrl, setNewGifUrl] = useState('')
  const [gifAdding, setGifAdding] = useState(false)
  const [gifDeleting, setGifDeleting] = useState<string | null>(null)
  const [gifError, setGifError] = useState<string | null>(null)

  // Booking sources state
  const [bookingSources, setBookingSources] = useState<string[]>([])
  const [newSource, setNewSource] = useState('')
  const [sourcesSaving, setSourcesSaving] = useState(false)
  const [sourcesMessage, setSourcesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const TEMPLATES = [
    { key: 'availability_request', label: 'Booking request' },
    { key: 'availability_reminder', label: 'Availability reminder' },
    { key: 'gig_confirmation', label: 'Gig confirmation' },
    { key: 'general_onboard', label: 'General onboard' },
    { key: 'info_request', label: 'Information request' },
    { key: 'onboarding_reminder_1', label: 'Onboarding / Info Request reminder (1st)' },
    { key: 'onboarding_reminder_urgent', label: 'Onboarding / Info Request reminder (urgent)' },
  ]

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false) })
      .catch(() => { setLoading(false) })
    fetch('/api/admin/invoice-settings')
      .then(r => r.json())
      .then(data => {
        setInvSettings(data)
        setInvLoading(false)
        if (Array.isArray(data?.booking_sources)) {
          setBookingSources(data.booking_sources)
        } else {
          setBookingSources(['Encore', 'Poptop', 'Last Minute Musicians', 'Website'])
        }
      })
      .catch(() => { setInvLoading(false) })
    fetch('/api/admin/monitoring-settings')
      .then(r => r.json())
      .then(data => { setMonSettings(data); setMonLoading(false) })
      .catch(() => { setMonLoading(false) })
    loadGifs()
  }, [])

  function loadGifs() {
    setGifsLoading(true)
    fetch('/api/admin/celebration-gifs')
      .then(r => r.json())
      .then(data => { setGifs(Array.isArray(data) ? data : []) })
      .catch(() => {})
      .finally(() => setGifsLoading(false))
  }

  function handleChange(key: string, val: number) {
    setSettings(prev => prev ? { ...prev, [key]: val } : prev)
    setMessage(null)
  }

  function handleInvChange(key: keyof InvoiceSettings, val: unknown) {
    setInvSettings(prev => ({ ...prev, [key]: val }))
    setInvMessage(null)
  }

  async function handleMonSave() {
    setMonSaving(true)
    setMonMessage(null)
    try {
      const res = await fetch('/api/admin/monitoring-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monSettings),
      })
      if (!res.ok) {
        const err = await res.json()
        setMonMessage({ type: 'error', text: err.error ?? 'Failed to save' })
      } else {
        setMonMessage({ type: 'success', text: 'Monitoring settings saved.' })
      }
    } catch {
      setMonMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setMonSaving(false)
    }
  }

  async function saveBookingSources() {
    setSourcesSaving(true)
    setSourcesMessage(null)
    try {
      const res = await fetch('/api/admin/invoice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_sources: bookingSources }),
      })
      if (!res.ok) {
        const err = await res.json()
        setSourcesMessage({ type: 'error', text: err.error ?? 'Failed to save' })
      } else {
        setSourcesMessage({ type: 'success', text: 'Sources saved.' })
      }
    } catch {
      setSourcesMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setSourcesSaving(false)
    }
  }

  function addSource() {
    const trimmed = newSource.trim()
    if (!trimmed || bookingSources.includes(trimmed)) return
    setBookingSources(prev => [...prev, trimmed])
    setNewSource('')
    setSourcesMessage(null)
  }

  function removeSource(s: string) {
    setBookingSources(prev => prev.filter(x => x !== s))
    setSourcesMessage(null)
  }

  async function addGif() {
    if (!newGifUrl.trim()) return
    setGifAdding(true)
    setGifError(null)
    try {
      const res = await fetch('/api/admin/celebration-gifs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newGifUrl.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setNewGifUrl('')
        loadGifs()
      } else {
        setGifError(data.error ?? 'Failed to add GIF')
      }
    } catch {
      setGifError('Network error')
    } finally {
      setGifAdding(false)
    }
  }

  async function deleteGif(id: string) {
    setGifDeleting(id)
    try {
      await fetch(`/api/admin/celebration-gifs/${id}`, { method: 'DELETE' })
      loadGifs()
    } finally {
      setGifDeleting(null)
    }
  }

  async function sendTestEmail(templateKey: string) {
    const to = monSettings.test_email_address
    if (!to) {
      setTestResults(prev => ({ ...prev, [templateKey]: { ok: false, text: 'Set a test email address first' } }))
      return
    }
    setTestSending(prev => ({ ...prev, [templateKey]: true }))
    setTestResults(prev => ({ ...prev, [templateKey]: { ok: true, text: '' } }))
    try {
      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateKey, to }),
      })
      if (res.ok) {
        setTestResults(prev => ({ ...prev, [templateKey]: { ok: true, text: `Sent to ${to}` } }))
      } else {
        const err = await res.json()
        setTestResults(prev => ({ ...prev, [templateKey]: { ok: false, text: err.error ?? 'Failed' } }))
      }
    } catch {
      setTestResults(prev => ({ ...prev, [templateKey]: { ok: false, text: 'Network error' } }))
    } finally {
      setTestSending(prev => ({ ...prev, [templateKey]: false }))
    }
  }

  async function handleInvSave() {
    setInvSaving(true)
    setInvMessage(null)
    try {
      const res = await fetch('/api/admin/invoice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invSettings),
      })
      if (!res.ok) {
        const err = await res.json()
        setInvMessage({ type: 'error', text: err.error ?? 'Failed to save' })
      } else {
        setInvMessage({ type: 'success', text: 'Invoice settings saved.' })
      }
    } catch {
      setInvMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setInvSaving(false)
    }
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error ?? 'Failed to save' })
      } else {
        setMessage({ type: 'success', text: 'Settings saved successfully.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  const navItemStyle = (active: boolean): React.CSSProperties => ({
    display: 'block', width: '100%', textAlign: 'left',
    padding: '7px 12px', fontSize: 13, fontFamily: 'var(--font)',
    background: active ? 'var(--bg-secondary)' : 'none',
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    fontWeight: active ? 500 : 400,
    border: 'none', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
  })

  const saveBtn = (onClick: () => void, disabled: boolean, label: string): React.CSSProperties => ({
    padding: '9px 20px', background: 'var(--accent)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14,
    fontWeight: 500, fontFamily: 'var(--font)',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
  })
  void saveBtn // referenced inline below

  if (loading) {
    return (
      <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}>
        Loading settings…
      </div>
    )
  }

  if (!settings) {
    return (
      <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', color: 'red' }}>
        Failed to load settings.
      </div>
    )
  }

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px', color: 'var(--text)' }}>Settings</h1>

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Left nav */}
        <nav style={{ width: 140, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 24 }}>
          {NAV.map(({ key, label }) => (
            <button key={key} onClick={() => setSection(key)} style={navItemStyle(section === key)}>
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div style={{ flex: 1, maxWidth: 580 }}>

          {/* ── Pricing ── */}
          {section === 'pricing' && (
            <>
              <div style={{
                background: '#fffbeb', border: '1px solid #f59e0b',
                borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                fontSize: 13, color: '#92400e', marginBottom: 24,
              }}>
                <strong>Note:</strong> Changing settings only affects new quotes. Existing quotes use their saved <code style={{ fontSize: 12 }}>settings_snapshot</code>.
              </div>

              <div style={sectionHeaderStyle}>Pricing</div>
              <FieldRow label="Business margin" fieldKey="business_margin" value={settings.business_margin} onChange={handleChange} isPercent hint="(markup above 100%)" />
              <FieldRow label="Solo rate multiple" fieldKey="solo_rate_multiple" value={settings.solo_rate_multiple} onChange={handleChange} />

              <div style={sectionHeaderStyle}>Set multipliers</div>
              <FieldRow label="2×45 multiplier" fieldKey="set_multiplier_2x45" value={settings.set_multiplier_2x45} onChange={handleChange} />
              <FieldRow label="3×45 multiplier" fieldKey="set_multiplier_3x45" value={settings.set_multiplier_3x45} onChange={handleChange} />
              <FieldRow label="4×45 multiplier" fieldKey="set_multiplier_4x45" value={settings.set_multiplier_4x45} onChange={handleChange} />
              <FieldRow label="5×45 multiplier" fieldKey="set_multiplier_5x45" value={settings.set_multiplier_5x45} onChange={handleChange} />

              <div style={sectionHeaderStyle}>PA / Sound</div>
              <FieldRow label="PA sound engineer rate" fieldKey="pa_sound_engineer_rate" value={settings.pa_sound_engineer_rate} onChange={handleChange} />
              <FieldRow label="PA deduction — Background PA (duo/trio)" fieldKey="pa_deduction_background_pa" value={settings.pa_deduction_background_pa} onChange={handleChange} hint="(negative — client provides PA)" />
              <FieldRow label="PA deduction — Extended Background PA (quartet+)" fieldKey="pa_deduction_extended_background_pa" value={settings.pa_deduction_extended_background_pa} onChange={handleChange} hint="(negative — client provides PA)" />
              <FieldRow label="PA rate before midnight (per hour)" fieldKey="pa_rate_before_midnight" value={settings.pa_rate_before_midnight} onChange={handleChange} />
              <FieldRow label="PA rate after midnight (per hour)" fieldKey="pa_rate_after_midnight" value={settings.pa_rate_after_midnight} onChange={handleChange} />

              <div style={sectionHeaderStyle}>Waiting time</div>
              <FieldRow label="Waiting time rate before midnight (per hour)" fieldKey="waiting_time_rate_before_midnight" value={settings.waiting_time_rate_before_midnight} onChange={handleChange} />
              <FieldRow label="Waiting time rate after midnight (per hour)" fieldKey="waiting_time_rate_after_midnight" value={settings.waiting_time_rate_after_midnight} onChange={handleChange} />
              <FieldRow label="Band after midnight rate (per hour)" fieldKey="band_after_midnight_rate" value={settings.band_after_midnight_rate} onChange={handleChange} />

              <div style={sectionHeaderStyle}>Travel</div>
              <FieldRow label="Additional driving rate" fieldKey="additional_driving_rate" value={settings.additional_driving_rate} onChange={handleChange} />

              <div style={sectionHeaderStyle}>Location surcharges</div>
              <FieldRow label="Boat surcharge" fieldKey="location_surcharge_boat" value={settings.location_surcharge_boat} onChange={handleChange} />
              <FieldRow label="City centre surcharge" fieldKey="location_surcharge_city" value={settings.location_surcharge_city} onChange={handleChange} />
              <FieldRow label="Stadium surcharge" fieldKey="location_surcharge_stadium" value={settings.location_surcharge_stadium} onChange={handleChange} />
              <FieldRow label="Private house surcharge" fieldKey="location_surcharge_house" value={settings.location_surcharge_house} onChange={handleChange} />
              <FieldRow label="No-drive zone surcharge" fieldKey="location_surcharge_no_drive" value={settings.location_surcharge_no_drive} onChange={handleChange} />

              <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Saving…' : 'Save pricing'}
                </button>
                {message && <span style={{ fontSize: 13, color: message.type === 'success' ? '#166534' : '#b91c1c' }}>{message.text}</span>}
              </div>
            </>
          )}

          {/* ── Invoicing ── */}
          {section === 'invoicing' && (
            invLoading ? <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</p> : <>
              <div style={sectionHeaderStyle}>Account</div>
              <div style={rowStyle}>
                <span style={labelStyle}>Account owner email <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(receives musician payment reminders)</span></span>
                <input type="email" style={inputStyle} value={invSettings.account_owner_email ?? ''} onChange={e => handleInvChange('account_owner_email', e.target.value || null)} placeholder="e.g. victoria@wardsmith.co.uk" />
              </div>

              <div style={sectionHeaderStyle}>VAT</div>
              <div style={rowStyle}>
                <span style={labelStyle}>VAT registered</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!invSettings.vat_registered} onChange={e => handleInvChange('vat_registered', e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{invSettings.vat_registered ? 'Yes' : 'No'}</span>
                </label>
              </div>
              {invSettings.vat_registered && (
                <div style={rowStyle}>
                  <span style={labelStyle}>VAT number</span>
                  <input type="text" style={inputStyle} value={invSettings.vat_number ?? ''} onChange={e => handleInvChange('vat_number', e.target.value || null)} placeholder="GB123456789" />
                </div>
              )}

              <div style={sectionHeaderStyle}>Bank details</div>
              {([
                ['bank_name', 'Bank name', 'e.g. Monzo'],
                ['account_name', 'Account name', 'e.g. Ward Smith Entertainment'],
                ['sort_code', 'Sort code', 'XX-XX-XX'],
                ['account_number', 'Account number', ''],
                ['iban', 'IBAN', 'Optional'],
                ['swift', 'SWIFT / BIC', 'Optional'],
              ] as [keyof InvoiceSettings, string, string][]).map(([key, label, placeholder]) => (
                <div key={key} style={rowStyle}>
                  <span style={labelStyle}>{label}</span>
                  <input type="text" style={inputStyle} value={(invSettings[key] as string | null) ?? ''} onChange={e => handleInvChange(key, e.target.value || null)} placeholder={placeholder} />
                </div>
              ))}

              <div style={sectionHeaderStyle}>Email template</div>
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
                Tokens: <code>{'{{client_name}}'}</code> <code>{'{{invoice_number}}'}</code> <code>{'{{event_date}}'}</code> <code>{'{{total}}'}</code> <code>{'{{due_date}}'}</code>
              </p>
              <div style={rowStyle}>
                <span style={labelStyle}>Subject</span>
                <input type="text" style={{ ...inputStyle, width: 320 }} value={invSettings.invoice_email_subject ?? ''} onChange={e => handleInvChange('invoice_email_subject', e.target.value || null)} placeholder="Invoice {{invoice_number}} — Ward Smith Entertainment" />
              </div>
              <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
                <span style={{ ...labelStyle, paddingTop: 6 }}>Body</span>
                <textarea style={{ ...inputStyle, width: 320, height: 140, resize: 'vertical', padding: '6px 10px', lineHeight: 1.5 }} value={invSettings.invoice_email_body ?? ''} onChange={e => handleInvChange('invoice_email_body', e.target.value || null)} placeholder={`Hi {{client_name}},\n\nPlease find attached invoice {{invoice_number}}…`} />
              </div>

              <div style={sectionHeaderStyle}>PDF appearance</div>
              <div style={rowStyle}>
                <span style={labelStyle}>Logo URL <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(public image link)</span></span>
                <input type="text" style={{ ...inputStyle, width: 260 }} value={invSettings.logo_url ?? ''} onChange={e => handleInvChange('logo_url', e.target.value || null)} placeholder="https://…/logo.png" />
              </div>
              <div style={{ ...rowStyle, alignItems: 'flex-start', borderBottom: 'none' }}>
                <span style={{ ...labelStyle, paddingTop: 6 }}>Default notes</span>
                <textarea style={{ ...inputStyle, width: 260, height: 72, resize: 'vertical', padding: '6px 10px', lineHeight: 1.5 }} value={invSettings.default_notes ?? ''} onChange={e => handleInvChange('default_notes', e.target.value || null)} placeholder="e.g. Payment terms, thank you note…" />
              </div>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={handleInvSave} disabled={invSaving} style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: invSaving ? 'not-allowed' : 'pointer', opacity: invSaving ? 0.7 : 1 }}>
                  {invSaving ? 'Saving…' : 'Save invoice settings'}
                </button>
                {invMessage && <span style={{ fontSize: 13, color: invMessage.type === 'success' ? '#166534' : '#b91c1c' }}>{invMessage.text}</span>}
              </div>
            </>
          )}

          {/* ── Email ── */}
          {section === 'email' && (
            monLoading ? <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</p> : <>
              <div style={sectionHeaderStyle}>Monitoring</div>
              <div style={rowStyle}>
                <span style={labelStyle}>Alert email <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(notified of delivery issues)</span></span>
                <input type="email" style={{ ...inputStyle, width: 220 }} value={monSettings.alert_email ?? ''} onChange={e => { setMonSettings(prev => ({ ...prev, alert_email: e.target.value || undefined })); setMonMessage(null) }} placeholder="you@example.com" />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Delivery alert threshold <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(minutes)</span></span>
                <input type="number" style={inputStyle} value={monSettings.delivery_threshold_minutes ?? 30} onChange={e => { setMonSettings(prev => ({ ...prev, delivery_threshold_minutes: parseInt(e.target.value) || 30 })); setMonMessage(null) }} min={5} />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Reply-to address <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(musician replies + invoice copies)</span></span>
                <input type="email" style={{ ...inputStyle, width: 220 }} value={monSettings.reply_to_email ?? ''} onChange={e => { setMonSettings(prev => ({ ...prev, reply_to_email: e.target.value || undefined })); setMonMessage(null) }} placeholder="you@gmail.com" />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Send test emails to</span>
                <input type="email" style={{ ...inputStyle, width: 220 }} value={monSettings.test_email_address ?? ''} onChange={e => { setMonSettings(prev => ({ ...prev, test_email_address: e.target.value || undefined })); setMonMessage(null) }} placeholder="you@gmail.com" />
              </div>
              <div style={{ ...rowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>Email logs</span>
                <a href="/admin/email-logs" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>View logs</a>
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={handleMonSave} disabled={monSaving} style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: monSaving ? 'not-allowed' : 'pointer', opacity: monSaving ? 0.7 : 1 }}>
                  {monSaving ? 'Saving…' : 'Save email settings'}
                </button>
                {monMessage && <span style={{ fontSize: 13, color: monMessage.type === 'success' ? '#166534' : '#b91c1c' }}>{monMessage.text}</span>}
              </div>

              <div style={{ ...sectionHeaderStyle, marginTop: 32 }}>Musician email templates</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Send a test version to the address above.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {TEMPLATES.map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {testResults[key] && <span style={{ fontSize: 12, color: testResults[key].ok ? '#166534' : '#b91c1c' }}>{testResults[key].ok ? `✓ ${testResults[key].text}` : `✗ ${testResults[key].text}`}</span>}
                      <button onClick={() => sendTestEmail(key)} disabled={testSending[key]} style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', cursor: testSending[key] ? 'not-allowed' : 'pointer', opacity: testSending[key] ? 0.6 : 1, fontFamily: 'var(--font)' }}>
                        {testSending[key] ? 'Sending…' : 'Send test'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── General ── */}
          {section === 'general' && (
            <>
              <div style={sectionHeaderStyle}>Booking sources</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                Shown as a dropdown on the email-to-quote form to track where enquiries came from.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 12 }}>
                {bookingSources.map(s => (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>{s}</span>
                    <button
                      onClick={() => removeSource(s)}
                      title="Remove"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9ca3af', lineHeight: 1 }}
                    >
                      <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M6 2h8M3 5h14M5 5l1 12h8l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                ))}
                {bookingSources.length === 0 && (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '4px 0' }}>No sources added yet.</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="New source name…"
                  value={newSource}
                  onChange={e => setNewSource(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSource() }}
                  style={{ flex: 1, padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                />
                <button
                  onClick={addSource}
                  disabled={!newSource.trim()}
                  style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', cursor: newSource.trim() ? 'pointer' : 'not-allowed', opacity: newSource.trim() ? 1 : 0.5, fontFamily: 'var(--font)' }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <button
                  onClick={saveBookingSources}
                  disabled={sourcesSaving}
                  style={{ padding: '9px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: sourcesSaving ? 'not-allowed' : 'pointer', opacity: sourcesSaving ? 0.7 : 1 }}
                >
                  {sourcesSaving ? 'Saving…' : 'Save sources'}
                </button>
                {sourcesMessage && <span style={{ fontSize: 13, color: sourcesMessage.type === 'success' ? '#166534' : '#b91c1c' }}>{sourcesMessage.text}</span>}
              </div>

              <div style={sectionHeaderStyle}>Celebration GIFs</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>Shown at random when a musician confirms availability.</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <a href="/availability/preview?state=yes" target="_blank" rel="noreferrer" style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>Preview accepted ↗</a>
                <a href="/availability/preview?state=no" target="_blank" rel="noreferrer" style={{ padding: '5px 14px', fontSize: 12, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>Preview declined ↗</a>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input type="url" placeholder="Paste a GIF URL…" value={newGifUrl} onChange={e => setNewGifUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addGif() }} style={{ flex: 1, padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }} />
                <button onClick={addGif} disabled={gifAdding || !newGifUrl.trim()} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: gifAdding || !newGifUrl.trim() ? 'not-allowed' : 'pointer', opacity: gifAdding || !newGifUrl.trim() ? 0.6 : 1, fontFamily: 'var(--font)' }}>{gifAdding ? 'Adding…' : 'Add'}</button>
              </div>
              {gifError && <p style={{ fontSize: 12, color: '#b91c1c', margin: '-8px 0 12px' }}>{gifError}</p>}
              {gifsLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</p>
              ) : gifs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No GIFs added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {gifs.map(gif => (
                    <div key={gif.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={gif.url} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 4, flexShrink: 0, background: '#f3f4f6' }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gif.url}</span>
                      <button onClick={() => deleteGif(gif.id)} disabled={gifDeleting === gif.id} title="Remove" style={{ background: 'none', border: 'none', cursor: gifDeleting === gif.id ? 'not-allowed' : 'pointer', padding: 4, color: '#9ca3af', flexShrink: 0, lineHeight: 1, opacity: gifDeleting === gif.id ? 0.4 : 1 }}>
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M6 2h8M3 5h14M5 5l1 12h8l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ ...sectionHeaderStyle, marginTop: 32 }}>Add-ons</div>
              <div style={{ ...rowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>Manage add-ons</span>
                <a href="/admin/add-ons" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>Open</a>
              </div>

              <div style={{ ...sectionHeaderStyle, marginTop: 24 }}>Exports</div>
              <div style={{ ...rowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>Events CSV</span>
                <a href="/api/admin/export/events" download style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none' }}>Download</a>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
