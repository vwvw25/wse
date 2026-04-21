import { createServiceClient } from '@/lib/supabase'
import type { Musician, OnboardingType } from '@/types/musicians'
import OnboardingForm from './OnboardingForm'

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: tokenRow } = await supabase
    .from('musician_onboarding_tokens')
    .select('*, musician:musicians(*)')
    .eq('token', token)
    .single()

  if (!tokenRow) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>
          <div style={{ background: '#111827', padding: '24px 28px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ward Smith Entertainment</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Onboarding</div>
          </div>
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Link not found</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              This onboarding link is invalid or has expired. Please contact Ward Smith Entertainment if you believe this is an error.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (tokenRow.completed_at) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif' }}>
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 600, overflow: 'hidden' }}>
          <div style={{ background: '#111827', padding: '24px 28px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ward Smith Entertainment</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Onboarding</div>
          </div>
          <div style={{ padding: '32px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>✓</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 12px' }}>Already submitted</h2>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              You've already completed this form. Thank you — we have your details on file.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const musician = tokenRow.musician as Musician

  return (
    <OnboardingForm
      token={token}
      musician={musician}
      type={tokenRow.type as OnboardingType}
      fieldsRequested={tokenRow.fields_requested as string[]}
    />
  )
}
