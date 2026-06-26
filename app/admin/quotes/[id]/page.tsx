import { createServiceClient } from '@/lib/supabase'
import { calculate } from '@/lib/calculations'
import { optionLineItems } from '@/lib/option-line-items'
import type { QuoteRecord, QuoteCalculated, BookingType, Settings } from '@/types/quote'
import React from 'react'

export const dynamic = 'force-dynamic'

const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
const fmtD = (n: number) => n.toFixed(4).replace(/\.?0+$/, '')
const fmtDate = (iso: string) => {
  const dt = new Date(iso + 'T12:00:00')
  const day = dt.toLocaleDateString('en-GB', { weekday: 'long' })
  const date = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  return `${day}, ${date}`
}

const BAND_SIZE_LABELS: Record<string, string> = {
  duo: 'Duo', trio: 'Trio', quartet: 'Quartet', five_piece: 'Five-piece',
  six_piece: 'Six-piece', seven_piece: 'Seven-piece', eight_piece: 'Eight-piece',
}

const BOOKING_TYPE_LABELS: Record<BookingType, string> = {
  background: 'Background',
  dancing_under_40: 'Dancing <40',
  dancing_over_40: 'Dancing >40',
  wedding: 'Wedding',
}

function diffCalc(stored: QuoteCalculated, live: QuoteCalculated): Set<string> {
  const diffs = new Set<string>()
  for (const key of Object.keys(stored) as (keyof QuoteCalculated)[]) {
    if (key === 'price_options') {
      const s = stored.price_options
      const l = live.price_options
      if (s.length !== l.length) { diffs.add('price_options'); continue }
      for (let i = 0; i < s.length; i++) {
        if (Math.abs(s[i].total_price - l[i].total_price) > 0.01 ||
            Math.abs(s[i].performance_fee - l[i].performance_fee) > 0.01) {
          diffs.add('price_options')
          break
        }
      }
    } else {
      const sv = stored[key] as number
      const lv = live[key] as number
      if (Math.abs(sv - lv) > 0.01) diffs.add(key)
    }
  }
  return diffs
}

function Row({ label, value, formula, diff }: {
  label: string; value: number | string; formula?: string; diff?: boolean
}) {
  const isZero = typeof value === 'number' && value === 0
  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)', opacity: isZero ? 0.4 : 1 }}>
      <td style={{ padding: '7px 12px', fontSize: 12, color: 'var(--text-secondary)', width: 260 }}>{label}</td>
      <td style={{
        padding: '7px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 500,
        color: diff ? '#e53e3e' : typeof value === 'number' && value !== 0 ? 'var(--text)' : 'var(--text-tertiary)',
      }}>
        {typeof value === 'number' ? fmt(value) : value}
        {diff && <span style={{ marginLeft: 6, fontSize: 11, color: '#e53e3e' }}>⚠ mismatch</span>}
      </td>
      {formula && <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{formula}</td>}
    </tr>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 4,
      }}>{label}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-secondary)', borderRadius: 8 }}>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export default async function AdminAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()
  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single()

  if (error || !data) {
    return <div style={{ padding: 32, color: 'red' }}>Quote not found: {error?.message}</div>
  }

  const q = data as QuoteRecord
  const { inputs, calculated: stored, settings_snapshot: settings } = q

  const live = calculate(inputs, settings)
  const diffs = diffCalc(stored, live)

  const hasDiffs = diffs.size > 0
  const inp = inputs
  const c = stored

  const allBookingTypes = inp.booking_types?.length
    ? inp.booking_types
    : (inp.booking_type ? [inp.booking_type] : ['background' as BookingType])

  const hasMultipleTypes = allBookingTypes.length > 1

  return (
    <div style={{ padding: '32px 24px', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <a href="/admin/quotes" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← All quotes</a>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginTop: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {[inp.agency_name, inp.agent_name].filter(Boolean).join(' / ') || 'Unnamed quote'}
          </h1>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {inp.event_date ? fmtDate(inp.event_date) : 'No event date'}
          </span>
          <a href={`/quote/${id}`} style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none', marginLeft: 'auto' }}>
            View quote ↗
          </a>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0' }}>
          ID: {id} · Saved {fmtDate(q.created_at)}
        </p>
      </div>

      {/* Discrepancy banner */}
      {hasDiffs ? (
        <div style={{
          background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 8,
          padding: '12px 16px', marginBottom: 24, fontSize: 13,
        }}>
          <strong style={{ color: '#c53030' }}>⚠ Calculation mismatch detected</strong>
          <p style={{ margin: '4px 0 0', color: '#744210', fontSize: 12 }}>
            Re-running calculate() with the stored inputs and settings produces different numbers than what was saved.
            Affected fields: <strong>{[...diffs].join(', ')}</strong>
          </p>
        </div>
      ) : (
        <div style={{
          background: '#f0fff4', border: '1px solid #68d391', borderRadius: 8,
          padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#276749',
        }}>
          ✓ Re-calculation matches stored values exactly — no discrepancies
        </div>
      )}

      {/* Price options — grouped by booking type */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 4,
        }}>Price options</div>

        {allBookingTypes.map(bt => {
          const btOptions = c.price_options.filter(o => (o.booking_type ?? 'background') === bt)
          if (btOptions.length === 0) return null
          return (
            <div key={bt} style={{ marginBottom: hasMultipleTypes ? 20 : 0 }}>
              {hasMultipleTypes && (
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 4 }}>
                  {BOOKING_TYPE_LABELS[bt] ?? bt}
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Line-up</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Set config</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Musicians</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Musician fees</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Performance fee</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>PA cost</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Travel</th>
                    <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text)' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {btOptions.map((opt, i) => {
                    const liveOpts = live.price_options.filter(o => (o.booking_type ?? 'background') === bt)
                    const livOpt = liveOpts[i]
                    const priceDiff = livOpt && Math.abs(opt.total_price - livOpt.total_price) > 0.01
                    const multiplierKey = opt.set_config as '1x60' | '2x45' | '3x45' | '4x45' | '5x45'
                    const multiplierMap: Record<string, number> = {
                      '1x60': settings.set_multiplier_2x45,
                      '2x45': settings.set_multiplier_2x45,
                      '3x45': settings.set_multiplier_3x45,
                      '4x45': settings.set_multiplier_4x45,
                      '5x45': settings.set_multiplier_5x45,
                    }
                    const mult = multiplierMap[multiplierKey] ?? 1
                    return (
                      <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>
                          {opt.line_up}
                          {opt.has_extended_pa_engineer && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 6 }}>+ SE</span>}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{opt.set_config}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13 }}>{opt.travel_person_count ?? opt.musician_count}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmt(opt.sum_musician_fees)}</td>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                          {fmt(opt.performance_fee)}
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                            ×{fmtD(mult)} ×{fmtD(settings.business_margin)}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: opt.pa_cost !== 0 ? 'var(--text)' : 'var(--text-tertiary)' }}>
                          {fmt(opt.pa_cost ?? 0)}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums', color: (opt.travel_cost ?? 0) !== 0 ? 'var(--text)' : 'var(--text-tertiary)' }}>
                          {fmt(opt.travel_cost ?? 0)}
                        </td>
                        <td style={{
                          padding: '8px 12px', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
                          color: priceDiff ? '#e53e3e' : 'var(--text)',
                        }}>
                          {fmt(opt.total_price)}
                          {priceDiff && livOpt && (
                            <div style={{ fontSize: 11, color: '#e53e3e', fontWeight: 400 }}>
                              live: {fmt(livOpt.total_price)}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })}
      </div>

      {/* Per-option line item breakdown */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 4,
        }}>Line item breakdown</div>

        {allBookingTypes.map(bt => {
          const btOptions = c.price_options.filter(o => (o.booking_type ?? 'background') === bt)
          if (btOptions.length === 0) return null
          return (
            <div key={bt} style={{ marginBottom: hasMultipleTypes ? 24 : 0 }}>
              {hasMultipleTypes && (
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 6 }}>
                  {BOOKING_TYPE_LABELS[bt] ?? bt}
                </div>
              )}
              {btOptions.map((opt, i) => {
                const items = optionLineItems(opt, inp, settings, c.location_surcharge)
                const total = items.reduce((s, it) => s + it.value, 0)
                return (
                  <div key={i} style={{
                    background: 'var(--bg-secondary)', borderRadius: 8,
                    marginBottom: 10, overflow: 'hidden',
                  }}>
                    <div style={{
                      padding: '8px 12px', background: '#2a2a2a',
                      fontSize: 12, fontWeight: 600, color: '#fff',
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {BAND_SIZE_LABELS[opt.band_size] ?? opt.band_size} — {opt.line_up}{opt.has_extended_pa_engineer ? ' + Sound engineer' : ''} — {opt.set_config}
                    </div>
                    <div>
                      {items.map((item, j) => (
                        <div key={j} style={{
                          display: 'grid', gridTemplateColumns: '220px 1fr 100px',
                          borderBottom: '0.5px solid var(--border)',
                        }}>
                          <div style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</div>
                          <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{item.formula}</div>
                          <div style={{
                            padding: '6px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums',
                            textAlign: 'right', whiteSpace: 'nowrap',
                            color: item.value < 0 ? '#e53e3e' : 'var(--text)',
                          }}>{fmt(item.value)}</div>
                        </div>
                      ))}
                      <div style={{
                        display: 'grid', gridTemplateColumns: '220px 1fr 100px',
                        borderTop: '1px solid var(--border)',
                      }}>
                        <div style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600 }}>Total</div>
                        <div />
                        <div style={{
                          padding: '7px 12px', fontSize: 13, fontWeight: 700,
                          fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                          color: Math.abs(total - opt.total_price) > 1 ? '#e53e3e' : 'var(--text)',
                        }}>
                          {fmt(total)}
                          {Math.abs(total - opt.total_price) > 1 && (
                            <div style={{ fontSize: 10, color: '#e53e3e', fontWeight: 400 }}>
                              stored: {fmt(opt.total_price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Performance fee */}
      <Section label="Performance fee drivers">
        <Row label="Musician fees total" value={c.sum_musician_fees} diff={diffs.has('sum_musician_fees')} />
        <Row label="Musicians (top-level)" value={String(c.musician_count)} diff={diffs.has('musician_count')} />
        <Row label="Set multiplier (primary)" value={fmtD(c.set_multiplier)} diff={diffs.has('set_multiplier')}
          formula="from primary set config — see per-option multipliers in table above" />
        <Row label="Package hours" value={`${c.package_hours}h`} diff={diffs.has('package_hours')} />
        <Row label="Business margin" value={fmtD(settings.business_margin)} formula="from settings_snapshot" />
        <Row label="Base performance fee" value={c.base_performance_fee} diff={diffs.has('base_performance_fee')}
          formula="musician_fees × set_multiplier × margin" />
      </Section>

      {/* Times */}
      <Section label="Time">
        <Row label="Total hours (start → finish)" value={`${c.total_hours.toFixed(2)}h`} diff={diffs.has('total_hours')}
          formula={`${inp.start_time ?? '?'} – ${inp.finish_time ?? '?'}`} />
        <Row label="Waiting time before midnight" value={`${c.waiting_time_hours_before_midnight.toFixed(2)}h`}
          diff={diffs.has('waiting_time_hours_before_midnight')} />
        <Row label="Waiting time after midnight" value={`${c.waiting_time_hours_after_midnight.toFixed(2)}h`}
          diff={diffs.has('waiting_time_hours_after_midnight')} />
        <Row label="Performance hours after midnight" value={`${c.performance_hours_after_midnight.toFixed(2)}h`}
          diff={diffs.has('performance_hours_after_midnight')} />
        <Row label="Waiting time cost (before midnight)" value={c.waiting_time_cost_before_midnight}
          diff={diffs.has('waiting_time_cost_before_midnight')}
          formula={`${c.waiting_time_hours_before_midnight.toFixed(2)}h × £${settings.waiting_time_rate_before_midnight}/h × ${c.musician_count} musicians`} />
        <Row label="Waiting time cost (after midnight)" value={c.waiting_time_cost_after_midnight}
          diff={diffs.has('waiting_time_cost_after_midnight')}
          formula={`${c.waiting_time_hours_after_midnight.toFixed(2)}h × £${settings.waiting_time_rate_after_midnight}/h × ${c.musician_count} musicians`} />
        <Row label="After-midnight performance cost" value={c.band_hours_after_midnight_cost}
          diff={diffs.has('band_hours_after_midnight_cost')}
          formula={`${c.performance_hours_after_midnight.toFixed(2)}h × £${settings.band_after_midnight_rate}/h × ${c.musician_count} musicians`} />
      </Section>

      {/* PA */}
      <Section label="PA / Sound">
        <Row label="PA hire (top-level)" value={c.pa_hire_cost} diff={diffs.has('pa_hire_cost')}
          formula={`rate £${settings.pa_sound_engineer_rate} — per-option PA costs shown in table above`} />
        <Row label="Client-provides PA deduction (top-level)" value={c.pa_deduction} diff={diffs.has('pa_deduction')} />
        <Row label="PA hire (before midnight)" value={c.pa_hire_before_midnight_cost} diff={diffs.has('pa_hire_before_midnight_cost')}
          formula={`${inp.pa_hours_before_midnight}h × £${settings.pa_rate_before_midnight}`} />
        <Row label="PA hire (after midnight)" value={c.pa_hire_after_midnight_cost} diff={diffs.has('pa_hire_after_midnight_cost')}
          formula={`${inp.pa_hours_after_midnight}h × £${settings.pa_rate_after_midnight}`} />
      </Section>

      {/* Add-ons */}
      <Section label="Add-ons">
        {(inp.selected_add_ons ?? []).length === 0
          ? <Row label="No add-ons selected" value="—" />
          : (inp.selected_add_ons ?? []).map(a => (
            <Row key={a.id} label={a.name}
              value={a.pricing_type === 'per_musician' ? a.price * c.musician_count : a.price}
              formula={a.pricing_type === 'per_musician' ? `£${a.price} × ${c.musician_count} musicians` : 'fixed'} />
          ))
        }
        <Row label="Add-ons total" value={c.add_ons_total} diff={diffs.has('add_ons_total')} />
      </Section>

      {/* Location */}
      <Section label="Location surcharge">
        <Row label="Location surcharge" value={c.location_surcharge} diff={diffs.has('location_surcharge')}
          formula={[
            inp.is_boat && 'boat',
            inp.is_city_centre && 'city centre',
            inp.is_stadium && 'stadium',
            inp.is_private_house && 'private house',
            inp.is_no_drive_zone && 'no-drive zone',
          ].filter(Boolean).join(', ') || 'none'} />
      </Section>

      {/* Travel */}
      <Section label="Travel & accommodation">
        <Row label="Travel type" value={inp.travel_type ?? '—'} />
        <Row label="Petrol / train" value={c.total_petrol_train_cost} diff={diffs.has('total_petrol_train_cost')}
          formula={`£${inp.petrol_train_cost}/person × ${c.musician_count} (top-level; per-option travel shown in table)`} />
        <Row label="Accommodation" value={c.total_accommodation_cost} diff={diffs.has('total_accommodation_cost')}
          formula={`£${inp.accommodation_cost}/night × ${inp.accommodation_nights} nights × ${c.musician_count}`} />
        <Row label="Per diem" value={c.total_per_diem_cost} diff={diffs.has('total_per_diem_cost')}
          formula={`£${inp.per_diem_rate}/day × ${inp.performance_days} days × ${c.musician_count}`} />
        <Row label="Travel days" value={c.total_travel_day_cost} diff={diffs.has('total_travel_day_cost')}
          formula={`£${inp.travel_day_rate}/day × ${inp.travel_days} days × ${c.musician_count}`} />
        <Row label="Off days" value={c.total_off_day_cost} diff={diffs.has('total_off_day_cost')} />
        <Row label="Flights" value={c.total_flights_cost} diff={diffs.has('total_flights_cost')} />
        <Row label="Baggage" value={c.total_baggage_fees} diff={diffs.has('total_baggage_fees')} />
        <Row label="Outgoing UK transfers" value={c.total_outgoing_uk_transfer_cost} diff={diffs.has('total_outgoing_uk_transfer_cost')} />
        <Row label="Outgoing dest transfers" value={c.total_outgoing_dest_transfer_cost} diff={diffs.has('total_outgoing_dest_transfer_cost')} />
        <Row label="Return dest transfers" value={c.total_return_dest_transfer_cost} diff={diffs.has('total_return_dest_transfer_cost')} />
        <Row label="Return UK transfers" value={c.total_return_uk_transfer_cost} diff={diffs.has('total_return_uk_transfer_cost')} />
        <Row label="Local transport" value={c.total_local_transport_cost} diff={diffs.has('total_local_transport_cost')} />
        <Row label="Visas" value={c.total_visa_cost} diff={diffs.has('total_visa_cost')} />
        <Row label="Vaccinations" value={c.total_vaccinations_cost} diff={diffs.has('total_vaccinations_cost')} />
      </Section>

      {/* Settings snapshot */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 4,
        }}>Settings at time of quote</div>
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 24px', fontSize: 12,
        }}>
          {(Object.entries(settings) as [string, number][]).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{typeof v === 'number' && v < 10 ? fmtD(v) : v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Musician fees */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--text-secondary)', padding: '0 12px', marginBottom: 4,
        }}>Musician fees (inputs)</div>
        <div style={{
          background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px',
          display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 12,
        }}>
          {([
            ['Singer', inp.singer_fee], ['Guitarist', inp.guitarist_fee], ['Drummer', inp.drummer_fee],
            ['Bass', inp.bass_fee], ['Keys', inp.keys_fee], ['Sax', inp.sax_fee],
            ['Trombone', inp.trombone_fee], ['Trumpet', inp.trumpet_fee], ['Singer 2', inp.singer_2_fee],
          ] as [string, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
