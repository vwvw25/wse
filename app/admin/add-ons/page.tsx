'use client'

import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import type { AddOn, PricingType } from '@/types/quote'

type AddOnRow = AddOn

const inputStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: 13,
  fontFamily: 'var(--font)',
  background: 'var(--bg)',
  color: 'var(--text)',
  outline: 'none',
}

const EMPTY_FORM: Omit<AddOnRow, 'id'> = {
  name: '',
  description: null,
  pricing_type: 'fixed',
  default_price: 0,
  price_editable: true,
  line_item_label: '',
  inclusion_text: null,
  requirement_text: null,
  sort_order: 0,
  is_active: true,
}

function AddOnForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Omit<AddOnRow, 'id'> & { id?: string }
  onSave: (data: Omit<AddOnRow, 'id'> & { id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const fieldRow: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 }
  const fieldLabel: React.CSSProperties = { fontSize: 12, color: 'var(--text-secondary)' }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: 'var(--bg-secondary)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={fieldRow}>
          <label style={fieldLabel}>Name *</label>
          <input style={{ ...inputStyle, width: '100%' }} value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div style={fieldRow}>
          <label style={fieldLabel}>Line item label</label>
          <input style={{ ...inputStyle, width: '100%' }} value={form.line_item_label} onChange={e => set('line_item_label', e.target.value)} />
        </div>
        <div style={fieldRow}>
          <label style={fieldLabel}>Pricing type</label>
          <select
            value={form.pricing_type}
            onChange={e => set('pricing_type', e.target.value as PricingType)}
            style={{ ...inputStyle, width: '100%' }}
          >
            <option value="fixed">Fixed</option>
            <option value="per_musician">Per musician</option>
          </select>
        </div>
        <div style={fieldRow}>
          <label style={fieldLabel}>Default price (£)</label>
          <input type="number" step="0.01" style={{ ...inputStyle, width: '100%' }} value={form.default_price}
            onChange={e => set('default_price', parseFloat(e.target.value) || 0)} />
        </div>
        <div style={fieldRow}>
          <label style={fieldLabel}>Sort order</label>
          <input type="number" step="1" style={{ ...inputStyle, width: '100%' }} value={form.sort_order}
            onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 18 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.price_editable} onChange={e => set('price_editable', e.target.checked)} />
            Price editable
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
            Active
          </label>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={fieldRow}>
          <label style={fieldLabel}>Description</label>
          <textarea
            rows={2}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' as const }}
            value={form.description ?? ''}
            onChange={e => set('description', e.target.value || null)}
          />
        </div>
        <div style={fieldRow}>
          <label style={fieldLabel}>Inclusion text</label>
          <textarea
            rows={2}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' as const }}
            value={form.inclusion_text ?? ''}
            onChange={e => set('inclusion_text', e.target.value || null)}
          />
        </div>
        <div style={fieldRow}>
          <label style={fieldLabel}>Requirement text</label>
          <textarea
            rows={2}
            style={{ ...inputStyle, width: '100%', resize: 'vertical' as const }}
            value={form.requirement_text ?? ''}
            onChange={e => set('requirement_text', e.target.value || null)}
          />
        </div>
      </div>
      {error && <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '8px 18px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font)',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 18px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function AddOnsPage() {
  const [addOns, setAddOns] = useState<AddOnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNewForm, setShowNewForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient()

  async function loadAddOns() {
    const { data, error: err } = await supabase
      .from('add_ons')
      .select('*')
      .order('sort_order', { ascending: true })
    if (err) { setError(err.message); return }
    setAddOns((data ?? []) as AddOnRow[])
  }

  useEffect(() => {
    loadAddOns().finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleToggleActive(addon: AddOnRow) {
    const { error: err } = await supabase
      .from('add_ons')
      .update({ is_active: !addon.is_active })
      .eq('id', addon.id)
    if (err) { setError(err.message); return }
    setAddOns(prev => prev.map(a => a.id === addon.id ? { ...a, is_active: !a.is_active } : a))
  }

  async function handleSaveEdit(data: Omit<AddOnRow, 'id'> & { id?: string }) {
    if (!data.id) return
    const { error: err } = await supabase
      .from('add_ons')
      .update({
        name: data.name,
        description: data.description,
        pricing_type: data.pricing_type,
        default_price: data.default_price,
        price_editable: data.price_editable,
        line_item_label: data.line_item_label,
        inclusion_text: data.inclusion_text,
        requirement_text: data.requirement_text,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
      .eq('id', data.id)
    if (err) throw new Error(err.message)
    await loadAddOns()
    setEditingId(null)
  }

  async function handleCreate(data: Omit<AddOnRow, 'id'> & { id?: string }) {
    const { error: err } = await supabase.from('add_ons').insert({
      name: data.name,
      description: data.description,
      pricing_type: data.pricing_type,
      default_price: data.default_price,
      price_editable: data.price_editable,
      line_item_label: data.line_item_label,
      inclusion_text: data.inclusion_text,
      requirement_text: data.requirement_text,
      sort_order: data.sort_order,
      is_active: data.is_active,
    })
    if (err) throw new Error(err.message)
    await loadAddOns()
    setShowNewForm(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this add-on? This cannot be undone.')) return
    const { error: err } = await supabase.from('add_ons').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setAddOns(prev => prev.filter(a => a.id !== id))
    if (editingId === id) setEditingId(null)
  }

  const th: React.CSSProperties = { padding: '8px 12px', fontWeight: 500, fontSize: 12, textAlign: 'left' as const }
  const td: React.CSSProperties = { padding: '10px 12px', verticalAlign: 'middle' as const, fontSize: 13 }

  if (loading) {
    return <div style={{ padding: '32px 32px', fontFamily: 'var(--font)', color: 'var(--text-secondary)' }}>Loading…</div>
  }

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text)' }}>Add-ons</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            {addOns.length} add-on{addOns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowNewForm(true); setEditingId(null) }}
          style={{
            padding: '8px 16px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font)',
            cursor: 'pointer',
          }}
        >
          + New add-on
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #f87171', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <th style={th}>Name</th>
              <th style={th}>Pricing type</th>
              <th style={th}>Default price</th>
              <th style={th}>Active</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {addOns.map(addon => (
              <React.Fragment key={addon.id}>
                <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 500 }}>{addon.name}</div>
                    {addon.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{addon.description}</div>
                    )}
                  </td>
                  <td style={td}>{addon.pricing_type === 'per_musician' ? 'Per musician' : 'Fixed'}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>£{addon.default_price.toLocaleString('en-GB')}</td>
                  <td style={td}>
                    <button
                      onClick={() => handleToggleActive(addon)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 99,
                        border: 'none',
                        fontSize: 12,
                        fontFamily: 'var(--font)',
                        cursor: 'pointer',
                        background: addon.is_active ? '#dcfce7' : 'var(--bg-secondary)',
                        color: addon.is_active ? '#166534' : 'var(--text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {addon.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{ ...td, textAlign: 'right' as const }}>
                    <button
                      onClick={() => { setEditingId(editingId === addon.id ? null : addon.id); setShowNewForm(false) }}
                      style={{
                        fontSize: 12,
                        color: 'var(--accent)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                        marginRight: 8,
                      }}
                    >
                      {editingId === addon.id ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDelete(addon.id)}
                      style={{
                        fontSize: 12,
                        color: '#b91c1c',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                {editingId === addon.id && (
                  <tr>
                    <td colSpan={5} style={{ padding: '0 12px 12px' }}>
                      <AddOnForm
                        initial={addon}
                        onSave={handleSaveEdit}
                        onCancel={() => setEditingId(null)}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {addOns.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, padding: 24, textAlign: 'center' }}>
            No add-ons yet. Click "+ New add-on" to create one.
          </p>
        )}
      </div>

      {/* New add-on form */}
      {showNewForm && (
        <AddOnForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onCancel={() => setShowNewForm(false)}
        />
      )}
    </div>
  )
}
