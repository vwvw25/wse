'use client'

import React from 'react'
import MusicianClient from './MusicianClient'
import type { Musician, CascadeTemplate, OnboardingToken } from '@/types/musicians'

interface Props {
  musicians: Musician[]
  cascadeTemplates: CascadeTemplate[]
  onboardingTokens: OnboardingToken[]
}

export default function MusiciansPageClient({ musicians, cascadeTemplates, onboardingTokens }: Props) {
  return (
    <div>
      <div style={{ padding: '32px 32px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 20px', color: 'var(--text)' }}>Musicians</h1>
      </div>

      <MusicianClient
        musicians={musicians}
        cascadeTemplates={cascadeTemplates}
        onboardingTokens={onboardingTokens}
      />
    </div>
  )
}
