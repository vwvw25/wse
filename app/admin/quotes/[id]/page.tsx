import { createServiceClient } from '@/lib/supabase'
import { calculate } from '@/lib/calculations'
import type { QuoteRecord, QuoteCalculated, BookingType, PriceOption, QuoteInputs, Settings } from '@/types/quote'
import React from 'react'

const PKG_HOURS: Record<string, number> = { '2x45': 3, '3x45': 4, '4x45': 6, '5x45': 8 }
const PRE_START_STD = 1.0
const PRE_START_SE = 1.5

function tmins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

interface OptionLineItem { label: string; formula: string; value: number }

function optionLineItems(opt: PriceOption, inp: QuoteInputs, s: Settings, locationSurcharge: number): OptionLineItem[] {
  const items: OptionLineItem[] = []

  // Performance fee
  items.push({
    label: 'Performance fee',
    formula: `£${Math.round(opt.sum_musician_fees)} × ${(s as unknown as Record<string, number>)['set_multiplier_' + opt.set_config] ?? '?'} × ${s.business_margin}`,
    value: opt.performance_fee,
  })

  // PA cost (engineer)
  if (opt.has_extended_pa_engineer) {
    items.push({ label: 'Extended PA + sound engineer', formula: '', value: s.pa_sound_engineer_rate })
  }
  // PA deduction
  const paDeduction = inp.client_provides_pa
    ? (opt.has_extended_pa_engineer || ['quartet','five_piece','six_piece','seven_piece','eight_piece'].includes(opt.band_size)
        ? s.pa_deduction_extended_background_pa : s.pa_deduction_background_pa)
    : 0
  if (paDeduction !== 0) {
    items.push({ label: 'Client provides PA deduction', formula: '', value: paDeduction })
  }

  // PA hire before/after midnight
  const paHireBefore = s.pa_rate_before_midnight * inp.pa_hours_before_midnight
  const paHireAfter = s.pa_rate_after_midnight * inp.pa_hours_after_midnight
  if (paHireBefore) items.push({ label: 'PA hire before midnight', formula: `${inp.pa_hours_before_midnight}h @ £${s.pa_rate_before_midnight}/h`, value: paHireBefore })
  if (paHireAfter) items.push({ label: 'PA hire after midnight', formula: `${inp.pa_hours_after_midnight}h @ £${s.pa_rate_after_midnight}/h`, value: paHireAfter })

  // Waiting time
  const arrMins = inp.arrival_time ? tmins(inp.arrival_time) : null
  const loMins = inp.load_out_time ? tmins(inp.load_out_time) : null
  const midnight = 24 * 60
  let waitBefore = 0, waitAfter = 0
  if (arrMins !== null && loMins !== null) {
    const loAdj = loMins < arrMins ? loMins + 24 * 60 : loMins
    const preStart = opt.has_extended_pa_engineer ? PRE_START_SE : PRE_START_STD
    const pkgTotal = (PKG_HOURS[opt.set_config] ?? 3) + preStart
    const totalLoad = (loAdj - arrMins) / 60
    if (loAdj <= midnight) {
      waitBefore = Math.max(0, totalLoad - pkgTotal)
    } else {
      waitBefore = Math.max(0, (midnight - arrMins) / 60 - pkgTotal)
      waitAfter = (loAdj - midnight) / 60
    }
  }
  if (waitBefore > 0.001) {
    const cost = waitBefore * s.waiting_time_rate_before_midnight * opt.musician_count
    items.push({ label: 'Waiting time (before midnight)', formula: `${waitBefore.toFixed(2)}h @ £${s.waiting_time_rate_before_midnight}/h — ${opt.musician_count} musicians`, value: cost })
  }
  if (waitAfter > 0.001) {
    const cost = waitAfter * s.waiting_time_rate_after_midnight * opt.musician_count
    items.push({ label: 'Waiting time (after midnight)', formula: `${waitAfter.toFixed(2)}h @ £${s.waiting_time_rate_after_midnight}/h — ${opt.musician_count} musicians`, value: cost })
    const amCost = waitAfter * s.band_after_midnight_rate * opt.musician_count
    items.push({ label: 'After midnight performance', formula: `${waitAfter.toFixed(2)}h @ £${s.band_after_midnight_rate}/person — ${opt.musician_count} people`, value: amCost })
  }

  // Location surcharge
  if (locationSurcharge) items.push({ label: 'Location surcharge', formula: '', value: locationSurcharge })

  // Add-ons
  for (const a of inp.selected_add_ons ?? []) {
    const cost = a.pricing_type === 'per_musician' ? a.price * opt.musician_count : a.price
    if (cost) items.push({ label: a.name, formula: a.pricing_type === 'per_musician' ? `£${a.price} × ${opt.musician_count} musicians` : 'fixed', value: cost })
  }

  // Travel
  const isOvernight = inp.travel_type === 'domestic_overnight' || inp.travel_type === 'international'
  const isIntl = inp.travel_type === 'international'
  const travelHours = inp.travel_hours_from_london ?? 0
  if (travelHours > 2 && s.additional_driving_rate > 0) {
    const cost = s.additional_driving_rate * travelHours * opt.travel_person_count
    items.push({ label: 'Additional travel time', formula: `${travelHours}h @ £${s.additional_driving_rate}/h — ${opt.travel_person_count} people`, value: cost })
  }
  if (isOvernight) {
    if (inp.petrol_train_cost) items.push({ label: 'Petrol / train', formula: `£${inp.petrol_train_cost}/person — ${opt.travel_person_count} people`, value: inp.petrol_train_cost * opt.travel_person_count })
    if (inp.accommodation_cost) items.push({ label: 'Accommodation', formula: `${inp.accommodation_nights} night(s) @ £${inp.accommodation_cost}/night — ${opt.travel_person_count} people`, value: inp.accommodation_cost * opt.travel_person_count * inp.accommodation_nights })
    if (inp.per_diem_rate) items.push({ label: 'Per diem', formula: `${inp.performance_days} day(s) @ £${inp.per_diem_rate}/day — ${opt.travel_person_count} people`, value: inp.per_diem_rate * opt.travel_person_count * inp.performance_days })
    if (inp.travel_days > 0) items.push({ label: 'Travel days', formula: `${inp.travel_days} days @ £${inp.travel_day_rate}/day — ${opt.travel_person_count} people`, value: inp.travel_day_rate * opt.travel_person_count * inp.travel_days })
    if (inp.off_days > 0) items.push({ label: 'Off days', formula: `${inp.off_days} days @ £${inp.off_day_rate}/day — ${opt.travel_person_count} people`, value: inp.off_day_rate * opt.travel_person_count * inp.off_days })
  }
  if (isIntl) {
    if (inp.flight_cost) items.push({ label: 'Flights', formula: `£${inp.flight_cost}/person — ${opt.travel_person_count} people`, value: inp.flight_cost * opt.travel_person_count + inp.baggage_fee * inp.carry_on_items_required })
    if (inp.outgoing_uk_transfer_cost) items.push({ label: 'Outgoing UK transfer', formula: `${opt.travel_person_count} people`, value: inp.outgoing_uk_transfer_cost * opt.travel_person_count })
    if (inp.outgoing_dest_transfer_cost) items.push({ label: 'Outgoing dest transfer', formula: `${opt.travel_person_count} people`, value: inp.outgoing_dest_transfer_cost * opt.travel_person_count })
    if (inp.return_dest_transfer_cost) items.push({ label: 'Return dest transfer', formula: `${opt.travel_person_count} people`, value: inp.return_dest_transfer_cost * opt.travel_person_count })
    if (inp.return_uk_transfer_cost) items.push({ label: 'Return UK transfer', formula: `${opt.travel_person_count} people`, value: inp.return_uk_transfer_cost * opt.travel_person_count })
    if (inp.local_transport_cost) items.push({ label: 'Local transport', formula: `${opt.travel_person_count} people`, value: inp.local_transport_cost * opt.travel_person_count })
    if (inp.visa_cost) items.push({ label: 'Visas', formula: `${opt.travel_person_count} people`, value: inp.visa_cost * opt.travel_person_count })
    if (inp.vaccinations_cost) items.push({ label: 'Vaccinations', formula: `${opt.travel_person_count} people`, value: inp.vaccinations_cost * opt.travel_person_count })
    if (inp.car_hire_cost) items.push({ label: 'Car hire', formula: 'total', value: inp.car_hire_cost })
    if (inp.instrument_carriage_cost) items.push({ label: 'Instrument carriage', formula: 'total', value: inp.instrument_carriage_cost })
  }

  return items
}

export const dynamic = 'force-dynamic'

const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
const fmtD = (n: number) => n.toFixed(4).replace(/\.?0+$/, '')
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

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
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px', fontFamily: 'var(--font)' }}>

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
                    const multiplierKey = opt.set_config as '2x45' | '3x45' | '4x45' | '5x45'
                    const multiplierMap: Record<string, number> = {
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
