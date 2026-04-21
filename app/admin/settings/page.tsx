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

export default function SettingsPage() {
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
  const [monSettings, setMonSettings] = useState<{ alert_email?: string; delivery_threshold_minutes?: number; pending_threshold_minutes?: number }>({})
  const [monLoading, setMonLoading] = useState(true)
  const [monSaving, setMonSaving] = useState(false)
  const [monMessage, setMonMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false) })
      .catch(() => { setLoading(false) })
    fetch('/api/admin/invoice-settings')
      .then(r => r.json())
      .then(data => { setInvSettings(data); setInvLoading(false) })
      .catch(() => { setInvLoading(false) })
    fetch('/api/admin/monitoring-settings')
      .then(r => r.json())
      .then(data => { setMonSettings(data); setMonLoading(false) })
      .catch(() => { setMonLoading(false) })
  }, [])

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
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 8px', color: 'var(--text)' }}>Settings</h1>

      {/* Warning banner */}
      <div style={{
        background: '#fffbeb',
        border: '1px solid #f59e0b',
        borderRadius: 'var(--radius-sm)',
        padding: '10px 14px',
        fontSize: 13,
        color: '#92400e',
        marginBottom: 24,
      }}>
        <strong>Note:</strong> Changing settings only affects new quotes. Existing quotes use their saved{' '}
        <code style={{ fontSize: 12 }}>settings_snapshot</code>.
      </div>

      {/* Pricing */}
      <div style={sectionHeaderStyle}>Pricing</div>
      <FieldRow label="Business margin" fieldKey="business_margin" value={settings.business_margin} onChange={handleChange} isPercent hint="(markup above 100%)" />
      <FieldRow label="Solo rate multiple" fieldKey="solo_rate_multiple" value={settings.solo_rate_multiple} onChange={handleChange} />

      {/* Set multipliers */}
      <div style={sectionHeaderStyle}>Set multipliers</div>
      <FieldRow label="2×45 multiplier" fieldKey="set_multiplier_2x45" value={settings.set_multiplier_2x45} onChange={handleChange} />
      <FieldRow label="3×45 multiplier" fieldKey="set_multiplier_3x45" value={settings.set_multiplier_3x45} onChange={handleChange} />
      <FieldRow label="4×45 multiplier" fieldKey="set_multiplier_4x45" value={settings.set_multiplier_4x45} onChange={handleChange} />
      <FieldRow label="5×45 multiplier" fieldKey="set_multiplier_5x45" value={settings.set_multiplier_5x45} onChange={handleChange} />

      {/* PA / Sound */}
      <div style={sectionHeaderStyle}>PA / Sound</div>
      <FieldRow label="PA sound engineer rate" fieldKey="pa_sound_engineer_rate" value={settings.pa_sound_engineer_rate} onChange={handleChange} />
      <FieldRow label="PA deduction — Background PA (duo/trio)" fieldKey="pa_deduction_background_pa" value={settings.pa_deduction_background_pa} onChange={handleChange} hint="(negative — client provides PA)" />
      <FieldRow label="PA deduction — Extended Background PA (quartet+)" fieldKey="pa_deduction_extended_background_pa" value={settings.pa_deduction_extended_background_pa} onChange={handleChange} hint="(negative — client provides PA)" />
      <FieldRow label="PA rate before midnight (per hour)" fieldKey="pa_rate_before_midnight" value={settings.pa_rate_before_midnight} onChange={handleChange} />
      <FieldRow label="PA rate after midnight (per hour)" fieldKey="pa_rate_after_midnight" value={settings.pa_rate_after_midnight} onChange={handleChange} />

      {/* Waiting time */}
      <div style={sectionHeaderStyle}>Waiting time</div>
      <FieldRow label="Waiting time rate before midnight (per hour)" fieldKey="waiting_time_rate_before_midnight" value={settings.waiting_time_rate_before_midnight} onChange={handleChange} />
      <FieldRow label="Waiting time rate after midnight (per hour)" fieldKey="waiting_time_rate_after_midnight" value={settings.waiting_time_rate_after_midnight} onChange={handleChange} />
      <FieldRow label="Band after midnight rate (per hour)" fieldKey="band_after_midnight_rate" value={settings.band_after_midnight_rate} onChange={handleChange} />

      {/* Travel */}
      <div style={sectionHeaderStyle}>Travel</div>
      <FieldRow label="Additional driving rate" fieldKey="additional_driving_rate" value={settings.additional_driving_rate} onChange={handleChange} />

      {/* Location surcharges */}
      <div style={sectionHeaderStyle}>Location surcharges</div>
      <FieldRow label="Boat surcharge" fieldKey="location_surcharge_boat" value={settings.location_surcharge_boat} onChange={handleChange} />
      <FieldRow label="City centre surcharge" fieldKey="location_surcharge_city" value={settings.location_surcharge_city} onChange={handleChange} />
      <FieldRow label="Stadium surcharge" fieldKey="location_surcharge_stadium" value={settings.location_surcharge_stadium} onChange={handleChange} />
      <FieldRow label="Private house surcharge" fieldKey="location_surcharge_house" value={settings.location_surcharge_house} onChange={handleChange} />
      <FieldRow label="No-drive zone surcharge" fieldKey="location_surcharge_no_drive" value={settings.location_surcharge_no_drive} onChange={handleChange} />

      {/* ── Invoicing settings ── */}
      <div style={{ ...sectionHeaderStyle, marginTop: 40 }}>Invoicing</div>
      {invLoading ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</p>
      ) : (
        <>
          {/* VAT */}
          <div style={rowStyle}>
            <span style={labelStyle}>VAT registered</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!invSettings.vat_registered}
                onChange={e => handleInvChange('vat_registered', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {invSettings.vat_registered ? 'Yes' : 'No'}
              </span>
            </label>
          </div>
          {invSettings.vat_registered && (
            <div style={rowStyle}>
              <span style={labelStyle}>VAT number</span>
              <input
                type="text"
                style={inputStyle}
                value={invSettings.vat_number ?? ''}
                onChange={e => handleInvChange('vat_number', e.target.value || null)}
                placeholder="GB123456789"
              />
            </div>
          )}

          {/* Bank details */}
          <div style={{ ...sectionHeaderStyle, marginTop: 20, marginBottom: 8 }}>Bank details</div>
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
              <input
                type="text"
                style={inputStyle}
                value={(invSettings[key] as string | null) ?? ''}
                onChange={e => handleInvChange(key, e.target.value || null)}
                placeholder={placeholder}
              />
            </div>
          ))}

          {/* Logo + notes */}
          <div style={{ ...sectionHeaderStyle, marginTop: 20, marginBottom: 8 }}>PDF appearance</div>
          <div style={rowStyle}>
            <span style={labelStyle}>Logo URL <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(public image link)</span></span>
            <input
              type="text"
              style={{ ...inputStyle, width: 260 }}
              value={invSettings.logo_url ?? ''}
              onChange={e => handleInvChange('logo_url', e.target.value || null)}
              placeholder="https://…/logo.png"
            />
          </div>
          <div style={{ ...rowStyle, alignItems: 'flex-start', borderBottom: 'none' }}>
            <span style={{ ...labelStyle, paddingTop: 6 }}>Default notes</span>
            <textarea
              style={{
                ...inputStyle,
                width: 260,
                height: 72,
                resize: 'vertical',
                padding: '6px 10px',
                lineHeight: 1.5,
              }}
              value={invSettings.default_notes ?? ''}
              onChange={e => handleInvChange('default_notes', e.target.value || null)}
              placeholder="e.g. Payment terms, thank you note…"
            />
          </div>

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handleInvSave}
              disabled={invSaving}
              style={{
                padding: '9px 20px',
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontWeight: 500,
                fontFamily: 'var(--font)',
                cursor: invSaving ? 'not-allowed' : 'pointer',
                opacity: invSaving ? 0.7 : 1,
              }}
            >
              {invSaving ? 'Saving…' : 'Save invoice settings'}
            </button>
            {invMessage && (
              <span style={{ fontSize: 13, color: invMessage.type === 'success' ? '#166534' : '#b91c1c' }}>
                {invMessage.text}
              </span>
            )}
          </div>
        </>
      )}

      {/* Email monitoring */}
      <div style={{ ...sectionHeaderStyle, marginTop: 40 }}>Email monitoring</div>
      {monLoading ? (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</p>
      ) : (
        <>
          <div style={rowStyle}>
            <span style={labelStyle}>Alert email <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(gets notified of delivery issues)</span></span>
            <input
              type="email"
              style={{ ...inputStyle, width: 220 }}
              value={monSettings.alert_email ?? ''}
              onChange={e => { setMonSettings(prev => ({ ...prev, alert_email: e.target.value || undefined })); setMonMessage(null) }}
              placeholder="you@example.com"
            />
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Delivery alert threshold <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(minutes before flagging undelivered)</span></span>
            <input
              type="number"
              style={inputStyle}
              value={monSettings.delivery_threshold_minutes ?? 30}
              onChange={e => { setMonSettings(prev => ({ ...prev, delivery_threshold_minutes: parseInt(e.target.value) || 30 })); setMonMessage(null) }}
              min={5}
            />
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Email logs</span>
            <a
              href="/admin/email-logs"
              style={{
                padding: '6px 14px', fontSize: 13, fontWeight: 500,
                background: 'var(--bg)', color: 'var(--text)',
                border: '0.5px solid var(--border-hover)',
                borderRadius: 'var(--radius-sm)', textDecoration: 'none',
              }}
            >
              View logs
            </a>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handleMonSave}
              disabled={monSaving}
              style={{
                padding: '9px 20px', background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14,
                fontWeight: 500, fontFamily: 'var(--font)',
                cursor: monSaving ? 'not-allowed' : 'pointer', opacity: monSaving ? 0.7 : 1,
              }}
            >
              {monSaving ? 'Saving…' : 'Save monitoring settings'}
            </button>
            {monMessage && (
              <span style={{ fontSize: 13, color: monMessage.type === 'success' ? '#166534' : '#b91c1c' }}>
                {monMessage.text}
              </span>
            )}
          </div>
        </>
      )}

      {/* Add-ons */}
      <div style={sectionHeaderStyle}>Add-ons</div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>Manage add-ons</span>
        <a
          href="/admin/add-ons"
          style={{
            padding: '6px 14px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg)', color: 'var(--text)',
            border: '0.5px solid var(--border-hover)',
            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
          }}
        >
          Open
        </a>
      </div>

      {/* Exports */}
      <div style={sectionHeaderStyle}>Exports</div>
      <div style={{ ...rowStyle, borderBottom: 'none' }}>
        <span style={labelStyle}>Events CSV</span>
        <a
          href="/api/admin/export/events"
          download
          style={{
            padding: '6px 14px', fontSize: 13, fontWeight: 500,
            background: 'var(--bg)', color: 'var(--text)',
            border: '0.5px solid var(--border-hover)',
            borderRadius: 'var(--radius-sm)', textDecoration: 'none',
          }}
        >
          Download
        </a>
      </div>

      {/* Save */}
      <div style={{ marginTop: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '9px 20px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            fontWeight: 500,
            fontFamily: 'var(--font)',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {message && (
          <span style={{
            fontSize: 13,
            color: message.type === 'success' ? '#166534' : '#b91c1c',
          }}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
