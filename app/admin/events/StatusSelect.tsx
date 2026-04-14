'use client'

import { useTransition } from 'react'
import { EVENT_STATUSES } from '@/lib/event-statuses'
import type { EventStatus } from '@/lib/event-statuses'
import { updateEventStatus } from './actions'

export default function StatusSelect({ eventId, currentStatus }: { eventId: string; currentStatus: string }) {
  const [isPending, startTransition] = useTransition()

  const resolved = EVENT_STATUSES.find(s => s.value === currentStatus) ?? EVENT_STATUSES[0]

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as EventStatus
    startTransition(() => { updateEventStatus(eventId, next) })
  }

  return (
    <select
      value={resolved.value}
      onChange={handleChange}
      disabled={isPending}
      style={{
        padding: '6px 10px',
        fontSize: 13,
        fontWeight: 500,
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        background: resolved.bg,
        color: resolved.color,
        cursor: 'pointer',
        outline: 'none',
        opacity: isPending ? 0.6 : 1,
        fontFamily: 'var(--font)',
      }}
    >
      {EVENT_STATUSES.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  )
}
