import { createServiceClient } from '@/lib/supabase'
import type { Musician, CascadeTemplate, CascadeTemplateMusicianEntry, OnboardingToken } from '@/types/musicians'
import MusiciansPageClient from './MusiciansPageClient'

export default async function MusiciansPage() {
  const supabase = createServiceClient()

  const [
    { data: musiciansData },
    { data: cascadeTemplatesData },
    { data: cascadeMusiciansData },
    { data: tokensData },
  ] = await Promise.all([
    supabase.from('musicians').select('*').order('first_name').order('last_name'),
    supabase.from('cascade_templates').select('*').order('instrument').order('name'),
    supabase.from('cascade_template_musicians').select('*, musician:musicians(*)').order('rank'),
    supabase.from('musician_onboarding_tokens').select('*, musician:musicians(id,first_name,last_name,email)').order('created_at', { ascending: false }),
  ])

  const musicians = (musiciansData ?? []) as Musician[]
  const rawCascadeTemplates = (cascadeTemplatesData ?? []) as CascadeTemplate[]
  const rawCascadeMusicians = (cascadeMusiciansData ?? []) as CascadeTemplateMusicianEntry[]
  const onboardingTokens = (tokensData ?? []) as OnboardingToken[]

  const cascadeTemplates: CascadeTemplate[] = rawCascadeTemplates.map(t => ({
    ...t,
    musicians: rawCascadeMusicians.filter(m => m.template_id === t.id),
  }))

  return (
    <MusiciansPageClient
      musicians={musicians}
      cascadeTemplates={cascadeTemplates}
      onboardingTokens={onboardingTokens}
    />
  )
}
