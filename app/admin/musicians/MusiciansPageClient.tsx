'use client'

import React, { useState } from 'react'
import MusicianClient from './MusicianClient'
import BandBuilderClient from '../band-builder/BandBuilderClient'
import type { Musician, BandTemplate, BandTemplateSlot, CascadeTemplate, OnboardingToken, EventMusician } from '@/types/musicians'
import type { EventRecord } from '@/types/quote'

interface EventWithMusicians extends Pick<EventRecord, 'id' | 'agency_name' | 'agent_name' | 'event_date' | 'status'> {
  slots: EventMusician[]
}

interface Props {
  musicians: Musician[]
  templates: (BandTemplate & { slots: BandTemplateSlot[] })[]
  cascadeTemplates: CascadeTemplate[]
  onboardingTokens: OnboardingToken[]
  events: EventWithMusicians[]
}

type TopTab = 'musicians' | 'band-builder'

export default function MusiciansPageClient({ musicians, templates, cascadeTemplates, onboardingTokens, events }: Props) {
  const [tab, setTab] = useState<TopTab>('musicians')

  const tabItemStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 0',
    marginRight: 24,
    fontSize: 13.5,
    fontWeight: active ? 500 : 400,
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--text)' : '2px solid transparent',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: active ? 'var(--text)' : 'transparent',
    fontFamily: 'var(--font)',
  })

  return (
    <div>
      {/* Page header + top-level tabs */}
      <div style={{ padding: '32px 32px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 20px', color: 'var(--text)' }}>Musicians</h1>
        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
          <button style={tabItemStyle(tab === 'musicians')} onClick={() => setTab('musicians')}>
            Musicians
          </button>
          <button style={tabItemStyle(tab === 'band-builder')} onClick={() => setTab('band-builder')}>
            Band builder
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'musicians' ? (
        <MusicianClient
          musicians={musicians}
          templates={templates}
          cascadeTemplates={cascadeTemplates}
          onboardingTokens={onboardingTokens}
        />
      ) : (
        <div style={{ padding: '28px 32px' }}>
          <BandBuilderClient events={events} musicians={musicians} />
        </div>
      )}
    </div>
  )
}
