'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { TravelExpense } from '@/types/travel'
import { travelExpensesTotal } from '@/types/travel'
import { upsertTravelExpense, deleteTravelExpense } from './travel-actions'

const inputStyle: React.CSSProperties = {
  height: 30, padding: '0 8px', fontSize: 12,
  background: 'var(--bg)', color: 'var(--text)',
  border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

function fmt(n: number) {
  return `£${n.toFixed(2)}`
}

function TravelExpenseRow({
  item,
  eventId,
  onDelete,
}: {
  item: TravelExpense
  eventId: string
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [desc, setDesc] = useState(item.description)
  const [amount, setAmount] = useState(String(item.amount))
  const [, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      await upsertTravelExpense(eventId, {
        id: item.id,
        event_id: item.event_id,
        description: desc,
        amount: parseFloat(amount) || 0,
      })
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
      <td style={{ padding: '7px 8px 7px 0' }}>
        {editing ? <input style={{ ...inputStyle, width: '100%' }} value={desc} onChange={e => setDesc(e.target.value)} /> : <span style={{ fontSize: 13 }}>{item.description}</span>}
      </td>
      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
        {editing ? <input style={{ ...inputStyle, width: 80, textAlign: 'right' }} type="number" value={amount} onChange={e => setAmount(e.target.value)} /> : <span style={{ fontSize: 13 }}>{fmt(item.amount)}</span>}
      </td>
      <td style={{ padding: '7px 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {editing
          ? <>
              <button onClick={save} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Save</button>
              <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Cancel</button>
            </>
          : <>
              <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Edit</button>
              <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-danger)', fontFamily: 'var(--font)', padding: '2px 6px' }}>✕</button>
            </>
        }
      </td>
    </tr>
  )
}

export default function TravelExpensesTable({
  eventId,
  initialExpenses,
}: {
  eventId: string
  initialExpenses: TravelExpense[]
}) {
  const router = useRouter()
  const [addingItem, setAddingItem] = useState(false)
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [, startTransition] = useTransition()

  const total = travelExpensesTotal(initialExpenses)

  function addItem() {
    if (!newDesc.trim()) return
    startTransition(async () => {
      await upsertTravelExpense(eventId, {
        event_id: eventId,
        description: newDesc.trim(),
        amount: parseFloat(newAmount) || 0,
      })
      setNewDesc('')
      setNewAmount('')
      setAddingItem(false)
      router.refresh()
    })
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ textAlign: 'left', padding: '5px 8px 5px 0', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Description</th>
            <th style={{ textAlign: 'right', padding: '5px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {initialExpenses.map(item => (
            <TravelExpenseRow
              key={item.id}
              item={item}
              eventId={eventId}
              onDelete={() => startTransition(async () => { await deleteTravelExpense(item.id, eventId); router.refresh() })}
            />
          ))}
          {addingItem && (
            <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
              <td style={{ padding: '6px 8px 6px 0' }}>
                <input style={{ ...inputStyle, width: '100%' }} placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} autoFocus />
              </td>
              <td style={{ padding: '6px 8px' }}>
                <input style={{ ...inputStyle, width: 80, textAlign: 'right' }} type="number" placeholder="0.00" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
              </td>
              <td style={{ padding: '6px 0', whiteSpace: 'nowrap' }}>
                <button onClick={addItem} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Add</button>
                <button onClick={() => setAddingItem(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font)', padding: '2px 6px' }}>Cancel</button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setAddingItem(true)}
          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}
        >
          + Add item
        </button>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Total: {fmt(total)}</div>
      </div>
    </div>
  )
}
