'use client'

import React, { useEffect, useState } from 'react'
import type { Settings } from '@/types/quote'
import type { InvoiceSettings } from '@/types/invoice'
import { createDressCodeTemplate, updateDressCodeTemplate, deleteDressCodeTemplate } from '../dress-codes/actions'
import type { DressCodeTemplate } from '../dress-codes/actions'

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

type Section = 'pricing' | 'invoicing' | 'email' | 'pages' | 'general' | 'dress-codes' | 'tools' | 'style'

const NAV_GROUPS: { heading: string; items: { key: Section; label: string }[] }[] = [
  {
    heading: 'Configuration',
    items: [
      { key: 'pricing',      label: 'Pricing' },
      { key: 'invoicing',    label: 'Invoicing' },
      { key: 'email',        label: 'Email' },
      { key: 'pages',        label: 'Pages' },
      { key: 'general',      label: 'General' },
      { key: 'dress-codes',  label: 'Dress codes' },
    ],
  },
  {
    heading: 'Developer',
    items: [
      { key: 'tools', label: 'Tools' },
      { key: 'style', label: 'Style guide' },
    ],
  },
]

// ── Style Guide ──────────────────────────────────────────────────────────────

const LIGHT_SWATCHES = [
  { name: '--bg', value: '#ffffff', label: 'Page background' },
  { name: '--bg-secondary', value: '#f7f6f3', label: 'Body background' },
  { name: '--bg-info', value: '#efeaff', label: 'Info background' },
  { name: '--text', value: '#1a1a1a', label: 'Primary text' },
  { name: '--text-secondary', value: '#6b6b6b', label: 'Secondary text' },
  { name: '--text-tertiary', value: '#9b9b9b', label: 'Tertiary text' },
  { name: '--text-info', value: '#5b3fa8', label: 'Info / active' },
  { name: '--accent', value: '#22e07a', label: 'Primary action' },
]

const DARK_SWATCHES = [
  { name: '--bg', value: '#1c1c1c', label: 'Page background' },
  { name: '--bg-secondary', value: '#252525', label: 'Body background' },
  { name: '--bg-info', value: '#2c2350', label: 'Info background' },
  { name: '--text', value: '#f0f0f0', label: 'Primary text' },
  { name: '--text-secondary', value: '#a0a0a0', label: 'Secondary text' },
  { name: '--text-tertiary', value: '#666666', label: 'Tertiary text' },
  { name: '--text-info', value: '#b9a6ff', label: 'Info / active' },
  { name: '--accent', value: '#22e07a', label: 'Primary action' },
]

const STATUS_BADGES = [
  { label: 'Enquiry',      bg: 'var(--pill-enquiry-bg)',    color: 'var(--pill-enquiry-text)' },
  { label: 'Quoted',       bg: 'var(--pill-quoted-bg)',     color: 'var(--pill-quoted-text)' },
  { label: 'Confirmed STC',bg: 'var(--pill-stc-bg)',        color: 'var(--pill-stc-text)' },
  { label: 'Contracted',   bg: 'var(--pill-contracted-bg)', color: 'var(--pill-contracted-text)' },
  { label: 'Paid',         bg: 'var(--pill-paid-bg)',       color: 'var(--pill-paid-text)' },
  { label: 'Outstanding',  bg: 'var(--pill-outstanding-bg)',color: 'var(--pill-outstanding-text)' },
  { label: 'Cancelled',    bg: 'var(--pill-cancelled-bg)',  color: 'var(--pill-cancelled-text)' },
  { label: 'Not invoiced', bg: 'var(--pill-uninvoiced-bg)', color: 'var(--pill-uninvoiced-text)' },
]

const TYPE_SCALE = [
  { size: 22, weight: 600, label: 'Page heading', sample: 'Events' },
  { size: 15, weight: 400, label: 'Body', sample: 'The quick brown fox jumps over the lazy dog' },
  { size: 13, weight: 500, label: 'UI label / button', sample: 'New from email' },
  { size: 13, weight: 400, label: 'Secondary', sample: 'Gray\'s Inn · London', secondary: true },
  { size: 12, weight: 500, label: 'Field label', sample: 'Venue name', tertiary: true },
  { size: 11, weight: 600, label: 'Column header', sample: 'DATE', caps: true, tertiary: true },
]

function StyleGuideSection() {
  const sgHead: React.CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)', margin: '28px 0 12px' }
  const swatchGrid: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 10 }

  return (
    <div style={{ paddingBottom: 48 }}>

      {/* Colours */}
      <div style={sgHead}>Colours — Light mode</div>
      <div style={swatchGrid}>
        {LIGHT_SWATCHES.map(s => (
          <div key={s.name} style={{ width: 140, borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ height: 56, background: s.value, borderBottom: '0.5px solid var(--border)' }} />
            <div style={{ padding: '8px 10px', background: 'var(--bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={sgHead}>Colours — Dark mode</div>
      <div style={swatchGrid}>
        {DARK_SWATCHES.map(s => (
          <div key={s.name} style={{ width: 140, borderRadius: 'var(--radius-md)', border: '0.5px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ height: 56, background: s.value, borderBottom: '0.5px solid var(--border)' }} />
            <div style={{ padding: '8px 10px', background: 'var(--bg)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Typography */}
      <div style={sgHead}>Typography — DM Sans</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TYPE_SCALE.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '10px 14px', background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace', whiteSpace: 'nowrap', minWidth: 100 }}>{t.size}px / {t.weight}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', minWidth: 120 }}>{t.label}</span>
            <span style={{
              fontSize: t.size, fontWeight: t.weight,
              color: t.tertiary ? 'var(--text-tertiary)' : t.secondary ? 'var(--text-secondary)' : 'var(--text)',
              textTransform: t.caps ? 'uppercase' : undefined,
              letterSpacing: t.caps ? '0.07em' : undefined,
            }}>{t.sample}</span>
          </div>
        ))}
      </div>

      {/* Border radius */}
      <div style={sgHead}>Border Radius</div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[{ name: '--radius-sm', value: '6px' }, { name: '--radius-md', value: '8px' }, { name: '--radius-lg', value: '12px' }].map(r => (
          <div key={r.name} style={{ width: 100, height: 72, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: r.value, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontFamily: 'monospace' }}>{r.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={sgHead}>Buttons</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', cursor: 'pointer' }}>Primary</button>
        <button style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', cursor: 'pointer' }}>Secondary</button>
        <button style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font)', cursor: 'pointer' }}>Ghost</button>
      </div>

      {/* Badges */}
      <div style={sgHead}>Status Badges</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {STATUS_BADGES.map(b => (
          <span key={b.label} style={{ display: 'inline-block', padding: '3px 8px', fontSize: 11, fontWeight: 500, borderRadius: 4, background: b.bg, color: b.color, whiteSpace: 'nowrap' }}>{b.label}</span>
        ))}
      </div>

      {/* Info state */}
      <div style={sgHead}>Info State</div>
      <div style={{ background: 'var(--bg-info)', border: '0.5px solid var(--border-info)', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: 13, color: 'var(--text-info)', maxWidth: 420 }}>
        Info message — uses <code style={{ fontFamily: 'monospace' }}>--bg-info</code>, <code style={{ fontFamily: 'monospace' }}>--text-info</code>, <code style={{ fontFamily: 'monospace' }}>--border-info</code>
      </div>

    </div>
  )
}

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

  // Dress codes state
  const [dressCodeTemplates, setDressCodeTemplates] = useState<DressCodeTemplate[]>([])
  const [dressCodesLoading, setDressCodesLoading] = useState(false)
  const [dressCodeEditing, setDressCodeEditing] = useState<string | null>(null)
  const [dressCodeCreating, setDressCodeCreating] = useState(false)

  // Booking sources state
  const [bookingSources, setBookingSources] = useState<string[]>([])
  const [newSource, setNewSource] = useState('')
  const [sourcesSaving, setSourcesSaving] = useState(false)
  const [sourcesMessage, setSourcesMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Users state
  type UserRow = { id: string; email: string | null; created_at: string; last_sign_in_at: string | null }
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [userCreating, setUserCreating] = useState(false)
  const [userDeleting, setUserDeleting] = useState<string | null>(null)
  const [usersMessage, setUsersMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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

  function loadDressCodes() {
    setDressCodesLoading(true)
    fetch('/api/admin/dress-code-templates')
      .then(r => r.json())
      .then(data => setDressCodeTemplates(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setDressCodesLoading(false))
  }

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

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (Array.isArray(data)) setUsers(data)
    } catch {}
    finally { setUsersLoading(false) }
  }

  async function createUser() {
    if (!newUserEmail.trim() || !newUserPassword) return
    setUserCreating(true)
    setUsersMessage(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail.trim(), password: newUserPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUsersMessage({ type: 'error', text: data.error ?? 'Failed to create user' })
      } else {
        setUsersMessage({ type: 'success', text: `Account created for ${newUserEmail.trim()}` })
        setNewUserEmail('')
        setNewUserPassword('')
        loadUsers()
      }
    } catch {
      setUsersMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setUserCreating(false)
    }
  }

  async function deleteUser(id: string, email: string | null) {
    if (!confirm(`Delete account for ${email ?? id}? This cannot be undone.`)) return
    setUserDeleting(id)
    setUsersMessage(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      })
      const data = await res.json()
      if (!res.ok) {
        setUsersMessage({ type: 'error', text: data.error ?? 'Failed to delete user' })
      } else {
        loadUsers()
      }
    } catch {
      setUsersMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setUserDeleting(null)
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
    padding: '6px 8px 6px 6px', fontSize: 13, fontFamily: 'var(--font)',
    background: active ? 'var(--bg-secondary)' : 'none',
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    fontWeight: active ? 500 : 400,
    border: 'none', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background 0.1s, color 0.1s',
  })

  const saveBtn = (onClick: () => void, disabled: boolean, label: string): React.CSSProperties => ({
    padding: '9px 20px', background: 'var(--accent)', color: 'var(--accent-text-on)',
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
    <div style={{ display: 'flex', minHeight: '100%', fontFamily: 'var(--font)' }}>

      {/* Left nav — full-height panel */}
      <nav style={{
        width: 212,
        flexShrink: 0,
        borderRight: '0.5px solid var(--border)',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 0',
        position: 'sticky',
        top: 0,
        alignSelf: 'flex-start',
        minHeight: 'calc(100vh - 52px)',
      }}>
        {/* "Settings" title — same left indent as nav items */}
        <div style={{ padding: '0 12px 16px', borderBottom: '0.5px solid var(--border)', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', paddingLeft: 6 }}>Settings</span>
        </div>

        {NAV_GROUPS.map((group, i) => (
          <React.Fragment key={group.heading}>
            {i > 0 && <div style={{ borderTop: '0.5px solid var(--border)', margin: '8px 0' }} />}
            <div style={{ padding: '8px 12px 0' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--text-tertiary)',
                padding: '0 6px', marginBottom: 4,
              }}>
                {group.heading}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.items.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => { setSection(key); if (key === 'general') loadUsers(); if (key === 'dress-codes') loadDressCodes() }}
                    style={navItemStyle(section === key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </nav>

        {/* Content */}
        <div style={{ flex: 1, maxWidth: 620, padding: '32px' }}>

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
                <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
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
                <span style={labelStyle}>Business name <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(shown on invoice)</span></span>
                <input type="text" style={{ ...inputStyle, width: 260 }} value={invSettings.business_name ?? ''} onChange={e => handleInvChange('business_name', e.target.value || null)} placeholder="Ward Smith Entertainment" />
              </div>
              <div style={rowStyle}>
                <span style={labelStyle}>Logo URL <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(replaces name if set)</span></span>
                <input type="text" style={{ ...inputStyle, width: 260 }} value={invSettings.logo_url ?? ''} onChange={e => handleInvChange('logo_url', e.target.value || null)} placeholder="https://…/logo.png" />
              </div>
              <div style={{ ...rowStyle, alignItems: 'flex-start' }}>
                <span style={{ ...labelStyle, paddingTop: 6 }}>Your address <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(shown on invoice)</span></span>
                <textarea style={{ ...inputStyle, width: 260, height: 80, resize: 'vertical', padding: '6px 10px', lineHeight: 1.5 }} value={invSettings.business_address ?? ''} onChange={e => handleInvChange('business_address', e.target.value || null)} placeholder={'123 High Street\nLondon\nW1A 1AA'} />
              </div>
              <div style={{ ...rowStyle, alignItems: 'flex-start', borderBottom: 'none' }}>
                <span style={{ ...labelStyle, paddingTop: 6 }}>Default notes</span>
                <textarea style={{ ...inputStyle, width: 260, height: 72, resize: 'vertical', padding: '6px 10px', lineHeight: 1.5 }} value={invSettings.default_notes ?? ''} onChange={e => handleInvChange('default_notes', e.target.value || null)} placeholder="e.g. Payment terms, thank you note…" />
              </div>

              <div style={sectionHeaderStyle}>Quote flow</div>
              <div style={{ ...rowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>Home postcode <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>(used to calculate travel distance in quote builder)</span></span>
                <input type="text" style={{ ...inputStyle, width: 140 }} value={invSettings.home_postcode ?? ''} onChange={e => handleInvChange('home_postcode', e.target.value || null)} placeholder="e.g. N3 1AA" />
              </div>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                <button onClick={handleInvSave} disabled={invSaving} style={{ padding: '9px 20px', background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: invSaving ? 'not-allowed' : 'pointer', opacity: invSaving ? 0.7 : 1 }}>
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
                <button onClick={handleMonSave} disabled={monSaving} style={{ padding: '9px 20px', background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: monSaving ? 'not-allowed' : 'pointer', opacity: monSaving ? 0.7 : 1 }}>
                  {monSaving ? 'Saving…' : 'Save email settings'}
                </button>
                {monMessage && <span style={{ fontSize: 13, color: monMessage.type === 'success' ? '#166534' : '#b91c1c' }}>{monMessage.text}</span>}
              </div>

              <div style={{ ...sectionHeaderStyle, marginTop: 32 }}>Gmail connection</div>
              <div style={{ ...rowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>
                  Renew email token
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Re-authorise Gmail access if emails stop coming through. Google expires this token periodically.</span>
                </span>
                <a
                  href="/api/gmail/auth"
                  style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                  Reconnect Gmail
                </a>
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
              <div style={sectionHeaderStyle}>User accounts</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
                Manage who can log in to the admin. Passwords must be at least 8 characters.
              </p>
              {usersLoading ? (
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 16 }}>
                  {users.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{u.email ?? '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          Last sign in: {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteUser(u.id, u.email)}
                        disabled={userDeleting === u.id}
                        title="Delete account"
                        style={{ background: 'none', border: 'none', cursor: userDeleting === u.id ? 'not-allowed' : 'pointer', padding: 4, color: '#9ca3af', opacity: userDeleting === u.id ? 0.4 : 1 }}
                      >
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none"><path d="M6 2h8M3 5h14M5 5l1 12h8l1-12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                  ))}
                  {users.length === 0 && !usersLoading && (
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No accounts yet.</p>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input
                  type="email"
                  placeholder="Email address"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  style={{ padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                />
                <input
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createUser() }}
                  style={{ padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'var(--font)', background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <button
                  onClick={createUser}
                  disabled={userCreating || !newUserEmail.trim() || newUserPassword.length < 8}
                  style={{ padding: '9px 20px', background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: userCreating || !newUserEmail.trim() || newUserPassword.length < 8 ? 'not-allowed' : 'pointer', opacity: userCreating || !newUserEmail.trim() || newUserPassword.length < 8 ? 0.6 : 1 }}
                >
                  {userCreating ? 'Creating…' : 'Create account'}
                </button>
                {usersMessage && <span style={{ fontSize: 13, color: usersMessage.type === 'success' ? '#166534' : '#b91c1c' }}>{usersMessage.text}</span>}
              </div>

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
                  style={{ padding: '9px 20px', background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)', cursor: sourcesSaving ? 'not-allowed' : 'pointer', opacity: sourcesSaving ? 0.7 : 1 }}
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
                <button onClick={addGif} disabled={gifAdding || !newGifUrl.trim()} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--accent)', color: 'var(--accent-text-on)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: gifAdding || !newGifUrl.trim() ? 'not-allowed' : 'pointer', opacity: gifAdding || !newGifUrl.trim() ? 0.6 : 1, fontFamily: 'var(--font)' }}>{gifAdding ? 'Adding…' : 'Add'}</button>
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


          {/* ── Pages ── */}
          {section === 'pages' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 24px', lineHeight: 1.6 }}>
                Preview the pages musicians see when they respond to a booking request. Open these periodically to make sure they look right and the messaging is current.
              </p>

              <div style={sectionHeaderStyle}>Musician response pages</div>
              {([
                {
                  key: 'accepted',
                  label: 'Accepted',
                  description: 'Shown when a musician confirms availability.',
                  href: '/availability/preview?state=yes',
                  color: '#16a34a',
                },
                {
                  key: 'declined',
                  label: 'Declined',
                  description: 'Shown when a musician says they\'re not available.',
                  href: '/availability/preview?state=no',
                  color: '#dc2626',
                },
                {
                  key: 'expired',
                  label: 'Response window closed',
                  description: 'Shown when a musician responds after their deadline has passed.',
                  href: '/availability/preview?state=expired',
                  color: '#d97706',
                },
              ]).map(({ key, label, description, href, color }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      {label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, paddingLeft: 16 }}>{description}</div>
                  </div>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', flexShrink: 0 }}
                  >
                    Preview ↗
                  </a>
                </div>
              ))}
            </>
          )}

          {/* ── Dress codes ── */}
          {section === 'dress-codes' && (() => {
            const dcInput: React.CSSProperties = { ...inputStyle, width: '100%', boxSizing: 'border-box' }

            function DcForm({ initial, onSubmit, onCancel, submitLabel }: { initial?: DressCodeTemplate; onSubmit: (fd: FormData) => void; onCancel?: () => void; submitLabel: string }) {
              return (
                <form action={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Template name</div>
                    <input name="name" defaultValue={initial?.name ?? ''} required placeholder="e.g. Black tie" style={dcInput} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Dress code</div>
                    <textarea name="description" defaultValue={initial?.description ?? ''} rows={3} style={{ ...dcInput, resize: 'vertical', lineHeight: 1.5 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>{submitLabel}</button>
                    {onCancel && <button type="button" onClick={onCancel} style={{ padding: '7px 16px', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--text-secondary)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancel</button>}
                  </div>
                </form>
              )
            }

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={sectionHeaderStyle}>Dress code templates</div>
                  {!dressCodeCreating && (
                    <button onClick={() => setDressCodeCreating(true)} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font)' }}>New template</button>
                  )}
                </div>
                {dressCodeCreating && (
                  <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 12 }}>
                    <DcForm
                      onSubmit={async fd => { await createDressCodeTemplate(fd); setDressCodeCreating(false); loadDressCodes() }}
                      onCancel={() => setDressCodeCreating(false)}
                      submitLabel="Create template"
                    />
                  </div>
                )}
                {dressCodesLoading ? (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading…</p>
                ) : dressCodeTemplates.length === 0 && !dressCodeCreating ? (
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No templates yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dressCodeTemplates.map(t => (
                      <div key={t.id} style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', background: 'var(--bg)' }}>
                        {dressCodeEditing === t.id ? (
                          <DcForm
                            initial={t}
                            onSubmit={async fd => { await updateDressCodeTemplate(t.id, fd); setDressCodeEditing(null); loadDressCodes() }}
                            onCancel={() => setDressCodeEditing(null)}
                            submitLabel="Save"
                          />

                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: t.description ? 4 : 0 }}>{t.name}</div>
                              {t.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.description}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button onClick={() => setDressCodeEditing(t.id)} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Edit</button>
                              <button onClick={async () => { if (confirm(`Delete "${t.name}"?`)) { await deleteDressCodeTemplate(t.id); loadDressCodes() } }} style={{ fontSize: 12, color: 'var(--text-danger)', background: 'none', border: '0.5px solid var(--border-danger)', borderRadius: 'var(--radius-sm)', padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Tools ── */}
          {section === 'tools' && (
            <>
              <div style={sectionHeaderStyle}>Logs</div>
              <div style={rowStyle}>
                <span style={labelStyle}>
                  Email logs
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>All outgoing emails sent from this platform</span>
                </span>
                <a href="/admin/email-logs" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', flexShrink: 0 }}>Open →</a>
              </div>

              <div style={{ ...sectionHeaderStyle, marginTop: 28 }}>Developer</div>
              <div style={{ ...rowStyle, borderBottom: 'none' }}>
                <span style={labelStyle}>
                  Parse evals
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Test and evaluate email parsing accuracy</span>
                </span>
                <a href="/admin/parse-evals" style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, background: 'var(--bg)', color: 'var(--text)', border: '0.5px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', textDecoration: 'none', flexShrink: 0 }}>Open →</a>
              </div>
            </>
          )}

          {section === 'style' && <StyleGuideSection />}

        </div>
    </div>
  )
}
