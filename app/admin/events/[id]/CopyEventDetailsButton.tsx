'use client'

import { useState } from 'react'

interface EventDetails {
  agencyName: string | null
  agentName: string | null
  eventDate: string | null
  venueName: string | null
  venueAddress: string | null
  location: string | null
  venuePostcode: string | null
  arrivalTime: string | null
  startTime: string | null
  finishTime: string | null
  loadOutTime: string | null
  guests: number | null
  bandSize: string | null
  sets: string | null
  specialRequirements: string | null
  soundRequirements: string | null
  notes: string | null
}

function formatDate(d: string | null) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function line(label: string, value: string | null | undefined) {
  return value ? `*${label}:* ${value}` : null
}

function buildText(e: EventDetails): string {
  const eventLabel = e.agencyName
    ? (e.agentName ? `${e.agentName} at ${e.agencyName}` : e.agencyName)
    : (e.agentName ?? 'Event')

  const venue = [e.venueName, e.location].filter(Boolean).join(', ')
  const address = [e.venueAddress, e.venuePostcode].filter(Boolean).join(', ')

  const parts = [
    `*${eventLabel}*`,
    '',
    line('Date', formatDate(e.eventDate)),
    venue ? line('Venue', venue) : null,
    address ? line('Address', address) : null,
    '',
    line('Arrival', e.arrivalTime),
    line('Start', e.startTime),
    line('Finish', e.finishTime),
    e.loadOutTime ? line('Load out', e.loadOutTime) : null,
    e.guests != null ? line('Guests', String(e.guests)) : null,
    '',
    e.bandSize ? line('Band size', e.bandSize) : null,
    e.sets ? line('Sets', e.sets) : null,
    e.specialRequirements ? line('Special requirements', e.specialRequirements) : null,
    e.soundRequirements ? line('Sound requirements', e.soundRequirements) : null,
    e.notes ? line('Notes', e.notes) : null,
  ]

  return parts
    .filter(p => p !== null)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export default function CopyEventDetailsButton({ event }: { event: EventDetails }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const text = buildText(event)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
        background: copied ? '#f0fdf4' : 'var(--bg-secondary)',
        color: copied ? '#16a34a' : 'var(--text)',
        border: `0.5px solid ${copied ? '#bbf7d0' : 'var(--border)'}`,
        borderRadius: 'var(--radius-sm)', cursor: 'pointer',
        fontFamily: 'var(--font)', transition: 'all 0.15s',
      }}
    >
      {copied ? '✓ Copied' : 'Copy details'}
    </button>
  )
}
