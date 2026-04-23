import { createServiceClient } from '@/lib/supabase'

// Renders the availability accepted/declined pages with fake data for preview purposes
export default async function AvailabilityPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>
}) {
  const { state } = await searchParams
  const confirmed = state === 'no' ? 'no' : 'yes'

  const supabase = createServiceClient()
  const { data: gifs } = await supabase.from('celebration_gifs').select('url')
  const gifUrls = (gifs ?? []).map((g: { url: string }) => g.url)
  const randomGif = gifUrls.length > 0 ? gifUrls[Math.floor(Math.random() * gifUrls.length)] : null

  if (confirmed === 'yes') {
    return (
      <div style={{ minHeight: '100vh', background: '#111827', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        {randomGif ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={randomGif} alt="Celebration" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8, display: 'block' }} />
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>You&apos;re booked in!</p>
          </div>
        )}
        <p style={{ marginTop: 16, fontSize: 12, color: '#4b5563' }}>Preview — accepted state</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', width: '100%', maxWidth: 480, overflow: 'hidden' }}>
        <div style={{ background: '#111827', padding: '24px 28px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Ward Smith Entertainment
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Availability request</div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <div style={{ padding: '14px 16px', borderRadius: 6, marginBottom: 20, background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: 14, fontWeight: 500 }}>
            ✗ You&apos;ve indicated you&apos;re not available. We&apos;ll be in touch if anything changes.
          </div>
          <p style={{ fontSize: 14, color: '#374151', margin: '0 0 20px' }}>
            Hi <strong>Jamie Wilson</strong>,
          </p>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '16px 20px', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {[
                ['Event', 'Sarah & Tom at Prestige Events'],
                ['Date', '13 September 2026'],
                ['Venue', 'The Grand Pavilion, Bristol'],
                ['Address', '42 Harbourside Way, Bristol, BS1 5UH'],
                ['Arrival', '17:30'],
                ['Start / Finish', '19:00 – 23:00'],
                ['Your role', 'Guitar'],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: '5px 0', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', width: 110, verticalAlign: 'top' }}>
                    {label}
                  </td>
                  <td style={{ padding: '5px 0', fontSize: 13, color: '#111827', fontWeight: label === 'Your role' ? 600 : 400 }}>
                    {value}
                  </td>
                </tr>
              ))}
            </table>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, textAlign: 'center' }}>Preview — declined state</p>
        </div>
      </div>
    </div>
  )
}
