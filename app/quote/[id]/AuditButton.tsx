'use client'
import { useState } from 'react'
import type { QuoteCalculated, QuoteInputs, Settings, BookingType } from '@/types/quote'
import { optionLineItems } from '@/lib/option-line-items'

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

export default function AuditButton({
  calculated,
  inputs,
  settings,
}: {
  calculated: QuoteCalculated
  inputs: QuoteInputs
  settings: Settings
}) {
  const [open, setOpen] = useState(false)

  const fmt = (n: number) => '£' + Math.round(n).toLocaleString('en-GB')
  const fmtD = (n: number) => n.toFixed(4).replace(/\.?0+$/, '')

  const c = calculated
  const inp = inputs
  const s = settings

  const allBookingTypes: BookingType[] = inp.booking_types?.length
    ? inp.booking_types
    : (inp.booking_type ? [inp.booking_type] : ['background' as BookingType])
  const hasMultipleTypes = allBookingTypes.length > 1

  const multiplierMap: Record<string, number> = {
    '1x60': s.set_multiplier_2x45,
    '2x45': s.set_multiplier_2x45,
    '3x45': s.set_multiplier_3x45,
    '4x45': s.set_multiplier_4x45,
    '5x45': s.set_multiplier_5x45,
  }

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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '1.5rem',
          }}
        >
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
            border: '0.5px solid var(--border)',
            width: '100%', maxWidth: 760,
            maxHeight: '90vh', overflowY: 'auto',
            padding: '1.5rem',
            fontFamily: 'var(--font)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>Price audit</h2>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>

            {/* Price options summary table */}
            <SectionLabel>Price options</SectionLabel>
            {allBookingTypes.map(bt => {
              const btOptions = c.price_options.filter(o => (o.booking_type ?? 'background') === bt)
              if (btOptions.length === 0) return null
              return (
                <div key={bt} style={{ marginBottom: hasMultipleTypes ? 16 : 0 }}>
                  {hasMultipleTypes && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      {BOOKING_TYPE_LABELS[bt] ?? bt}
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 20 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Line-up</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Config</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Musicians</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Musician fees</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Perf fee</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>PA</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500 }}>Travel</th>
                        <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 500, color: 'var(--text)' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {btOptions.map((opt, i) => {
                        const mult = multiplierMap[opt.set_config] ?? 1
                        return (
                          <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>
                              {opt.line_up}
                              {opt.has_extended_pa_engineer && <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>+ SE</span>}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{opt.set_config}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12 }}>{opt.travel_person_count ?? opt.musician_count}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{fmt(opt.sum_musician_fees)}</td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
                              {fmt(opt.performance_fee)}
                              <span style={{ fontSize: 10, color: 'var(--text-tertiary)', marginLeft: 4 }}>
                                ×{fmtD(mult)} ×{fmtD(s.business_margin)}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: opt.pa_cost !== 0 ? 'var(--text)' : 'var(--text-tertiary)' }}>
                              {fmt(opt.pa_cost ?? 0)}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 12, fontVariantNumeric: 'tabular-nums', color: (opt.travel_cost ?? 0) !== 0 ? 'var(--text)' : 'var(--text-tertiary)' }}>
                              {fmt(opt.travel_cost ?? 0)}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              {fmt(opt.total_price)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}

            {/* Per-option line item breakdowns */}
            <SectionLabel>Line item breakdown</SectionLabel>
            {allBookingTypes.map(bt => {
              const btOptions = c.price_options.filter(o => (o.booking_type ?? 'background') === bt)
              if (btOptions.length === 0) return null
              return (
                <div key={bt} style={{ marginBottom: hasMultipleTypes ? 24 : 0 }}>
                  {hasMultipleTypes && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                      {BOOKING_TYPE_LABELS[bt] ?? bt}
                    </div>
                  )}
                  {btOptions.map((opt, i) => {
                    const items = optionLineItems(opt, inp, s, c.location_surcharge)
                    const total = items.reduce((sum, it) => sum + it.value, 0)
                    return (
                      <div key={i} style={{ background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
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
                              display: 'grid', gridTemplateColumns: '200px 1fr 90px',
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
                          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 90px', borderTop: '1px solid var(--border)' }}>
                            <div style={{ padding: '7px 12px', fontSize: 12, fontWeight: 600 }}>Total</div>
                            <div />
                            <div style={{
                              padding: '7px 12px', fontSize: 13, fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums', textAlign: 'right',
                              color: Math.abs(total - opt.total_price) > 1 ? '#e53e3e' : 'var(--text)',
                            }}>
                              {fmt(total)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Musician fees */}
            <SectionLabel>Musician fees</SectionLabel>
            <div style={{
              background: 'var(--bg-secondary)', borderRadius: 8, padding: '12px 16px',
              display: 'flex', flexWrap: 'wrap', gap: '6px 24px', fontSize: 12, marginBottom: 20,
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
      )}
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
      color: 'var(--text-secondary)', marginBottom: 6,
    }}>{children}</div>
  )
}
