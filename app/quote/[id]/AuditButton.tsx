'use client'
import { useState } from 'react'
import type { QuoteCalculated } from '@/types/quote'

function Row({ label, value, sub }: { label: string; value: string; sub?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '6px 0', borderBottom: '0.5px solid var(--border)',
      paddingLeft: sub ? 16 : 0,
    }}>
      <span style={{ fontSize: 13, color: sub ? 'var(--text-secondary)' : 'var(--text)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: sub ? 400 : 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', marginLeft: 24 }}>{value}</span>
    </div>
  )
}

function Section({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 20, marginBottom: 4 }}>
      {label}
    </div>
  )
}

export default function AuditButton({ calculated }: { calculated: QuoteCalculated }) {
  const [open, setOpen] = useState(false)
  const fmt = (n: number | null | undefined) => n == null || isNaN(n) ? '—' : `£${Math.round(n).toLocaleString('en-GB')}`
  const fmtH = (n: number | null | undefined) => n == null || isNaN(n) || n === 0 ? null : `${n.toFixed(2).replace(/\.?0+$/, '')}h`

  const c = calculated

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontSize: 12, fontWeight: 500, padding: '6px 14px',
          background: 'var(--bg)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', color: 'var(--text)',
          cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '-0.01em',
        }}
      >
        Audit
      </button>

      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1rem',
          }}
        >
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--border)',
            width: '100%', maxWidth: 520,
            maxHeight: '85vh', overflowY: 'auto',
            padding: '1.5rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Price audit</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>

            <Section label="Performance" />
            <Row label="Sum of musician fees" value={fmt(c.sum_musician_fees)} />
            <Row label={`Set multiplier`} value={`×${c.set_multiplier?.toFixed(2) ?? '—'}`} sub />
            <Row label="Base performance fee" value={fmt(c.base_performance_fee)} />

            {(c.pa_hire_cost ?? 0) !== 0 && (
              <>
                <Section label="PA" />
                <Row label="PA + sound engineer hire" value={fmt(c.pa_hire_cost)} />
              </>
            )}
            {(c.pa_deduction ?? 0) !== 0 && (
              <>
                <Section label="PA" />
                <Row label="PA deduction (client provides PA)" value={fmt(c.pa_deduction)} />
              </>
            )}
            {(c.pa_hire_before_midnight_cost ?? 0) !== 0 && (
              <Row label="PA extra hours (before midnight)" value={fmt(c.pa_hire_before_midnight_cost)} sub />
            )}
            {(c.pa_hire_after_midnight_cost ?? 0) !== 0 && (
              <Row label="PA extra hours (after midnight)" value={fmt(c.pa_hire_after_midnight_cost)} sub />
            )}

            {(c.waiting_time_cost ?? 0) !== 0 && (
              <>
                <Section label="Waiting time" />
                {fmtH(c.waiting_time_hours_before_midnight) && (
                  <Row label={`Waiting time before midnight (${fmtH(c.waiting_time_hours_before_midnight)})`} value={fmt(c.waiting_time_cost_before_midnight)} sub />
                )}
                {fmtH(c.waiting_time_hours_after_midnight) && (
                  <Row label={`Waiting time after midnight (${fmtH(c.waiting_time_hours_after_midnight)})`} value={fmt(c.waiting_time_cost_after_midnight)} sub />
                )}
                <Row label="Waiting time total" value={fmt(c.waiting_time_cost)} />
              </>
            )}

            {(c.band_hours_after_midnight_cost ?? 0) !== 0 && (
              <>
                <Section label="After midnight" />
                <Row label="Band performance after midnight" value={fmt(c.band_hours_after_midnight_cost)} />
              </>
            )}

            {(c.add_ons_total ?? 0) !== 0 && (
              <>
                <Section label="Add-ons" />
                <Row label="Add-ons total" value={fmt(c.add_ons_total)} />
              </>
            )}

            {(c.location_surcharge ?? 0) !== 0 && (
              <>
                <Section label="Location" />
                <Row label="Location surcharge" value={fmt(c.location_surcharge)} />
              </>
            )}

            {((c.total_petrol_train_cost ?? 0) + (c.total_accommodation_cost ?? 0) + (c.total_per_diem_cost ?? 0) +
              (c.total_flights_cost ?? 0) + (c.total_travel_day_cost ?? 0) + (c.total_off_day_cost ?? 0)) !== 0 && (
              <>
                <Section label="Travel" />
                {(c.total_petrol_train_cost ?? 0) !== 0 && <Row label="Petrol / train" value={fmt(c.total_petrol_train_cost)} sub />}
                {(c.total_accommodation_cost ?? 0) !== 0 && <Row label="Accommodation" value={fmt(c.total_accommodation_cost)} sub />}
                {(c.total_per_diem_cost ?? 0) !== 0 && <Row label="Per diem" value={fmt(c.total_per_diem_cost)} sub />}
                {(c.total_flights_cost ?? 0) !== 0 && <Row label="Flights" value={fmt(c.total_flights_cost)} sub />}
                {(c.total_travel_day_cost ?? 0) !== 0 && <Row label="Travel days" value={fmt(c.total_travel_day_cost)} sub />}
                {(c.total_off_day_cost ?? 0) !== 0 && <Row label="Off days" value={fmt(c.total_off_day_cost)} sub />}
                {(c.total_outgoing_uk_transfer_cost ?? 0) !== 0 && <Row label="Outgoing UK transfer" value={fmt(c.total_outgoing_uk_transfer_cost)} sub />}
                {(c.total_outgoing_dest_transfer_cost ?? 0) !== 0 && <Row label="Outgoing destination transfer" value={fmt(c.total_outgoing_dest_transfer_cost)} sub />}
                {(c.total_return_dest_transfer_cost ?? 0) !== 0 && <Row label="Return destination transfer" value={fmt(c.total_return_dest_transfer_cost)} sub />}
                {(c.total_return_uk_transfer_cost ?? 0) !== 0 && <Row label="Return UK transfer" value={fmt(c.total_return_uk_transfer_cost)} sub />}
                {(c.total_local_transport_cost ?? 0) !== 0 && <Row label="Local transport" value={fmt(c.total_local_transport_cost)} sub />}
                {(c.total_visa_cost ?? 0) !== 0 && <Row label="Visas" value={fmt(c.total_visa_cost)} sub />}
                {(c.total_vaccinations_cost ?? 0) !== 0 && <Row label="Vaccinations" value={fmt(c.total_vaccinations_cost)} sub />}
              </>
            )}

            <div style={{ marginTop: 20, borderTop: '2px solid var(--border)', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Total fee (single day / primary config)</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.total_fee)}</span>
              </div>
              {c.full_engagement_fee !== c.total_fee && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Full engagement fee (multi-day)</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.full_engagement_fee)}</span>
                </div>
              )}
              {(c.per_day_saving ?? 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Saving per day</span>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{fmt(c.per_day_saving)}</span>
                </div>
              )}
            </div>

            {c.price_options && c.price_options.length > 0 && (
              <>
                <Section label="Per-option breakdown" />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Fixed costs: {fmt(c.fixed_costs_total)} · Each option = perf fee (by size/config) + fixed costs
                </div>
                {c.price_options.map((opt, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '5px 0', borderBottom: '0.5px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {opt.booking_type?.replace(/_/g, ' ')} · {opt.band_size?.replace(/_/g, ' ')} · {opt.set_config}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginLeft: 16 }}>{fmt(opt.total_price)}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
