'use client'

import { useState } from 'react'

export interface CalendarNotesData {
  date: string | null
  address: string | null
  bandSize: string | null
  numberOfSets: string | null
  arrival: string | null
  finish: string | null
  setList: string | null
  food: string | null
  dressCode: string | null
}

const FIELD_GROUPS: { label: string; key: keyof CalendarNotesData }[][] = [
  [
    { label: 'Date', key: 'date' },
    { label: 'Address', key: 'address' },
    { label: 'Band size', key: 'bandSize' },
    { label: 'Number of sets', key: 'numberOfSets' },
  ],
  [
    { label: 'Arrival', key: 'arrival' },
    { label: 'Finish', key: 'finish' },
    { label: 'Set List', key: 'setList' },
  ],
  [
    { label: 'Food', key: 'food' },
    { label: 'Dress code', key: 'dressCode' },
  ],
]

function buildText(data: CalendarNotesData): string {
  return FIELD_GROUPS
    .map(group => group.map(({ label, key }) => `${label}: ${data[key] ?? ''}`).join('\n'))
    .join('\n\n')
}

export default function CalendarNotesSection({ data }: { data: CalendarNotesData }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(buildText(data))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
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
          {copied ? '✓ Copied' : 'Copy for Calendar'}
        </button>
      </div>
      <div style={{
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '16px 20px', fontSize: 13, color: 'var(--text)', lineHeight: 1.8,
      }}>
        {FIELD_GROUPS.map((group, gi) => (
          <div key={gi} style={{ marginBottom: gi < FIELD_GROUPS.length - 1 ? 16 : 0 }}>
            {group.map(({ label, key }) => (
              <div key={key}>
                <strong>{label}:</strong> {data[key] ?? ''}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
