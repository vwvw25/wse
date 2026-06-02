import React from 'react'
import { createServiceClient } from '@/lib/supabase'

// Renders the availability response pages with fake data for preview purposes
export default async function AvailabilityPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams

  const supabase = createServiceClient()
  const { data: gifs } = await supabase.from('celebration_gifs').select('url')
  const gifUrls = (gifs ?? []).map((g: { url: string }) => g.url)
  const randomGif = gifUrls.length > 0 ? gifUrls[Math.floor(Math.random() * gifUrls.length)] : null

  const fakeDetails: [string, string][] = [
    ['Date', '13 September 2026'],
    ['Venue', 'The Grand Pavilion, Bristol'],
    ['Address', '42 Harbourside Way, Bristol, BS1 5UH'],
    ['Arrival', '17:30'],
    ['Start / Finish', '19:00 – 23:00'],
    ['Band', 'The Midnight Collective'],
    ['Food', 'Yes'],
    ['Your role', 'Guitar'],
    ['Fee', '£250.00'],
  ]

  const fakeExpiredDetails: [string, string][] = [
    ['Date', '13 September 2026'],
    ['Venue', 'The Grand Pavilion, Bristol'],
    ['Your role', 'Guitar'],
  ]

  const card = (content: React.ReactNode, label: string) => (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ background: '#111827', padding: '24px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Ward Smith Entertainment</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Booking request</div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {content}
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '16px 0 0', textAlign: 'center' }}>
            Preview — {label}
          </p>
        </div>
      </div>
    </div>
  )

  // Expired state
  if (state === 'expired') {
    return card(
      <>
        <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 6, padding: '14px 16px', marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#78350f', marginBottom: 4 }}>Response window closed</div>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>The deadline to respond to this booking request has passed.</p>
        </div>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 8px' }}>Hi <strong>Jamie Wilson</strong>,</p>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 24px' }}>
          If you&apos;re still interested in this gig, please reply to the original email and we&apos;ll let you know whether the booking is still available.
        </p>
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '16px 20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {fakeExpiredDetails.map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '5px 0', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 110, verticalAlign: 'top' }}>{label}</td>
                  <td style={{ padding: '5px 0', fontSize: 13, color: '#111827' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>,
      'response window closed'
    )
  }

  const confirmed = state === 'no' ? 'no' : 'yes'

  return card(
    <>
      {confirmed === 'yes' ? (
        <>
          <div style={{ padding: '14px 16px', borderRadius: 6, marginBottom: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#14532d', fontSize: 14, fontWeight: 500 }}>
            ✓ You&apos;re booked in! A confirmation email with a calendar invite is on its way to you.
          </div>
          {randomGif ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={randomGif} alt="Celebration" style={{ width: '100%', borderRadius: 6, display: 'block', marginBottom: 20 }} />
          ) : (
            <div style={{ textAlign: 'center', fontSize: 48, marginBottom: 20 }}>🎉</div>
          )}
        </>
      ) : (
        <div style={{ padding: '14px 16px', borderRadius: 6, marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 14, fontWeight: 500 }}>
          ✗ You&apos;ve indicated you&apos;re not available. We&apos;ll be in touch if anything changes.
        </div>
      )}
      <p style={{ fontSize: 14, color: '#374151', margin: '0 0 20px' }}>Hi <strong>Jamie Wilson</strong>,</p>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '16px 20px', marginBottom: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {fakeDetails.map(([label, value]) => (
              <tr key={label}>
                <td style={{ padding: '5px 0', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 110, verticalAlign: 'top' }}>{label}</td>
                <td style={{ padding: '5px 0', fontSize: 13, color: '#111827', fontWeight: label === 'Your role' ? 600 : 400 }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>,
    confirmed === 'yes' ? 'accepted' : 'declined'
  )
}
