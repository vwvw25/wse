'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { calculate, DEFAULT_SETTINGS } from '@/lib/calculations'
import type { QuoteInputs, Settings, SetConfig, AddOn, SelectedAddOn, BookingType } from '@/types/quote'
import { BAND_SIZES_ORDERED, BAND_SIZE_LABELS, LINE_UP_LABELS, BAND_TYPE_LABELS } from '@/lib/lineups'
import type { BandType } from '@/lib/lineups'

// ── Timeline constants ─────────────────────────────────────────────────────
const T_MIN = 7 * 60    // 07:00
const T_MAX = 26 * 60   // 02:00 next day
const T_RANGE = T_MAX - T_MIN

// Vertical layout (px) — all relative to the outer slider container
const LABEL_H = 30          // height of one label block
const ROW_TOP: Record<0|1, number> = { 0: 36, 1: 0 }   // row 0 near track, row 1 raised
const LABEL_AREA_H = 64     // total above-track space
const TRACK_GAP = 8
const TRACK_TOP = LABEL_AREA_H + TRACK_GAP  // 72
const TRACK_H = 6
const HANDLE_Y = TRACK_TOP + TRACK_H / 2   // 75 — centre of track
const TICK_TOP = TRACK_TOP + TRACK_H + 6   // 84
const TOTAL_H = TICK_TOP + 18              // 102

function snap(mins: number, step = 15) { return Math.round(mins / step) * step }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function hhmm(mins: number) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
function parseMins(t: string | null | undefined): number {
  if (!t) return 19 * 60
  const [h, m] = t.split(':').map(Number)
  const total = h * 60 + m
  return total < T_MIN ? total + 24 * 60 : total
}

// ── Quote constants ────────────────────────────────────────────────────────
const SET_CONFIGS: SetConfig[] = ['2x45', '3x45', '4x45', '5x45']
const SET_CONFIG_LABELS: Record<SetConfig, string> = {
  '2x45': '2×45', '3x45': '3×45', '4x45': '4×45', '5x45': '5×45',
}
const PERF_TYPES: { value: BookingType; label: string }[] = [
  { value: 'background', label: 'Background' },
  { value: 'dancing_under_40', label: 'Dancing < 40 guests' },
  { value: 'dancing_over_40', label: 'Dancing > 40 guests' },
]

const BLANK_INPUTS: QuoteInputs = {
  booking_type: null, travel_type: 'london_based', is_multi_day: false, number_of_days: 1,
  start_time: '19:00', finish_time: '23:00', arrival_time: '18:00', load_out_time: '23:00',
  band_size: 'quartet', set_config: '3x45', band_sizes: ['quartet'], set_configs: ['3x45'],
  booking_types: [], band_sizes_by_type: {}, set_configs_by_type: {}, band_types_by_type: {},
  band_type: 'electric',
  is_boat: false, is_city_centre: false, is_stadium: false, is_private_house: false,
  has_secure_loading_bay: false, is_no_drive_zone: false, is_outdoor: false,
  client_provides_pa: false, is_powerless: false, has_limiter: false,
  is_acoustic: false, client_third_party_sound: false,
  pa_hours_before_midnight: 0, pa_hours_after_midnight: 0,
  selected_add_ons: [], is_prestige: false,
  singer_fee: 400, guitarist_fee: 300, drummer_fee: 300, bass_fee: 300,
  keys_fee: 300, sax_fee: 300, trombone_fee: 300, trumpet_fee: 300, singer_2_fee: 300,
  travel_hours_from_london: 0,
  petrol_train_cost: 0, accommodation_cost: 0, accommodation_nights: 1,
  per_diem_rate: 0, performance_days: 1, travel_day_rate: 0, travel_days: 0,
  off_day_rate: 0, off_days: 0, flight_cost: 0, baggage_fee: 0,
  carry_on_items_required: 0, outgoing_uk_transfer_cost: 0,
  outgoing_dest_transfer_cost: 0, return_dest_transfer_cost: 0,
  return_uk_transfer_cost: 0, local_transport_cost: 0,
  visa_cost: 0, vaccinations_cost: 0, car_hire_cost: 0, instrument_carriage_cost: 0,
  per_day_discount: 0,
  venue_postcode: null, venue_name: null, venue_name_tbc: false,
  event_date: null, agency_name: null, agent_name: null, client_email: null,
  location: null, band_size_requested: null, sets_requested: null,
  is_custom_arrival_time: false, is_load_out_at_finish: true,
}

interface SavedQuote { id: string; label: string; price: number }

// ── Timeline types ─────────────────────────────────────────────────────────
type Handle = 'arrival' | 'start' | 'finish' | 'loadOut'
interface TimelineState { arrival: number; start: number; finish: number; loadOut: number }

const HANDLE_COLOR: Record<Handle, string> = {
  arrival: '#94a3b8', start: '#34d399', finish: '#f59e0b', loadOut: '#94a3b8',
}

// ── Timeline slider ────────────────────────────────────────────────────────
function TimelineSlider({
  value, onChange, arrivalLinked, loadOutLinked,
}: {
  value: TimelineState
  onChange: (v: TimelineState) => void
  arrivalLinked: boolean
  loadOutLinked: boolean
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<Handle | null>(null)

  const toPct = (mins: number) => ((mins - T_MIN) / T_RANGE) * 100

  const minsFromClientX = useCallback((clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return snap(clamp((clientX - rect.left) / rect.width, 0, 1) * T_RANGE + T_MIN)
  }, [])

  const applyDrag = useCallback((handle: Handle, raw: number, cur: TimelineState): TimelineState => {
    const m = snap(raw)
    const next = { ...cur }
    if (handle === 'arrival') {
      next.arrival = clamp(m, T_MIN, cur.start)
    } else if (handle === 'start') {
      next.start = clamp(m, arrivalLinked ? T_MIN : cur.arrival, cur.finish)
      if (arrivalLinked) next.arrival = next.start - 60
    } else if (handle === 'finish') {
      next.finish = clamp(m, cur.start, loadOutLinked ? T_MAX : cur.loadOut)
      if (loadOutLinked) next.loadOut = next.finish
    } else {
      next.loadOut = clamp(m, cur.finish, T_MAX)
    }
    return next
  }, [arrivalLinked, loadOutLinked])

  const onPMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return
    onChange(applyDrag(dragging.current, minsFromClientX(e.clientX), value))
  }, [value, minsFromClientX, applyDrag, onChange])

  const onPUp = useCallback(() => { dragging.current = null }, [])

  useEffect(() => {
    window.addEventListener('pointermove', onPMove)
    window.addEventListener('pointerup', onPUp)
    return () => {
      window.removeEventListener('pointermove', onPMove)
      window.removeEventListener('pointerup', onPUp)
    }
  }, [onPMove, onPUp])

  // ── Build visible label items (merge when linked) ──
  type LabelItem = { handle: Handle; pct: number; lines: string[]; timeStr: string; color: string }
  const items: LabelItem[] = []

  if (arrivalLinked) {
    items.push({
      handle: 'start', pct: toPct(value.start), color: HANDLE_COLOR.start,
      lines: [`Arrival  ${hhmm(value.arrival)}`, 'Start'],
      timeStr: hhmm(value.start),
    })
  } else {
    items.push({ handle: 'arrival', pct: toPct(value.arrival), color: HANDLE_COLOR.arrival, lines: ['Arrival'], timeStr: hhmm(value.arrival) })
    items.push({ handle: 'start',   pct: toPct(value.start),   color: HANDLE_COLOR.start,   lines: ['Start'],   timeStr: hhmm(value.start) })
  }
  if (loadOutLinked) {
    items.push({
      handle: 'finish', pct: toPct(value.finish), color: HANDLE_COLOR.finish,
      lines: ['Finish / Load out'], timeStr: hhmm(value.finish),
    })
  } else {
    items.push({ handle: 'finish',  pct: toPct(value.finish),  color: HANDLE_COLOR.finish,  lines: ['Finish'],   timeStr: hhmm(value.finish) })
    items.push({ handle: 'loadOut', pct: toPct(value.loadOut), color: HANDLE_COLOR.loadOut, lines: ['Load out'], timeStr: hhmm(value.loadOut) })
  }

  // ── Assign stagger rows — greedy left-to-right, threshold 10% ──
  const THRESH = 10
  const rowOf = new Map<Handle, 0|1>()
  const lastPct: [number, number] = [-Infinity, -Infinity]
  for (const item of [...items].sort((a, b) => a.pct - b.pct)) {
    if (item.pct - lastPct[0] >= THRESH) {
      rowOf.set(item.handle, 0); lastPct[0] = item.pct
    } else if (item.pct - lastPct[1] >= THRESH) {
      rowOf.set(item.handle, 1); lastPct[1] = item.pct
    } else {
      rowOf.set(item.handle, 0); lastPct[0] = item.pct
    }
  }

  // ── Draggable handle circles (unlinked ones only) ──
  const circles: { handle: Handle; pct: number; color: string }[] = []
  if (!arrivalLinked) circles.push({ handle: 'arrival', pct: toPct(value.arrival), color: HANDLE_COLOR.arrival })
  circles.push({ handle: 'start',  pct: toPct(value.start),  color: HANDLE_COLOR.start })
  circles.push({ handle: 'finish', pct: toPct(value.finish), color: HANDLE_COLOR.finish })
  if (!loadOutLinked) circles.push({ handle: 'loadOut', pct: toPct(value.loadOut), color: HANDLE_COLOR.loadOut })

  // ── Ghost markers for linked handles (non-draggable position indicators) ──
  const ghosts: { pct: number }[] = []
  if (arrivalLinked) ghosts.push({ pct: toPct(value.arrival) })

  // Track segments
  const segments = [
    { left: toPct(value.arrival), width: toPct(value.start)  - toPct(value.arrival), color: '#e2e8f0' },
    { left: toPct(value.start),   width: toPct(value.finish) - toPct(value.start),   color: '#d1fae5' },
    { left: toPct(value.finish),  width: toPct(value.loadOut)- toPct(value.finish),  color: '#fef3c7' },
  ]

  // Hour ticks every 2h
  const ticks: { mins: number; label: string }[] = []
  for (let h = 7; h <= 26; h += 2) {
    const disp = h >= 24 ? String(h - 24).padStart(2, '0') : String(h).padStart(2, '0')
    ticks.push({ mins: h * 60, label: `${disp}:00` })
  }

  return (
    <div style={{ position: 'relative', height: TOTAL_H, userSelect: 'none' }}>

      {/* Labels + connector lines — in outer container so pct% is track-aligned */}
      {items.map(item => {
        const row = rowOf.get(item.handle) ?? 0
        const labelTop = ROW_TOP[row]
        const labelBottom = labelTop + LABEL_H
        const connectorH = TRACK_TOP - labelBottom
        return (
          <div key={item.handle}>
            {/* Label */}
            <div style={{
              position: 'absolute', top: labelTop, left: `${item.pct}%`,
              transform: 'translateX(-50%)', textAlign: 'center',
              pointerEvents: 'none', minWidth: 56,
            }}>
              {item.lines.map((line, i) => (
                <div key={i} style={{
                  fontSize: 10, color: 'var(--text-tertiary)',
                  lineHeight: 1.4, whiteSpace: 'nowrap',
                }}>
                  {line}
                </div>
              ))}
              <div style={{
                fontSize: 14, fontWeight: 700, color: item.color,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}>
                {item.timeStr}
              </div>
            </div>
            {/* Connector line */}
            {connectorH > 0 && (
              <div style={{
                position: 'absolute', top: labelBottom, left: `${item.pct}%`,
                width: 1, height: connectorH,
                background: item.color, opacity: 0.35,
                transform: 'translateX(-50%)', pointerEvents: 'none',
              }} />
            )}
          </div>
        )
      })}

      {/* Track background + coloured segments */}
      <div
        ref={trackRef}
        style={{
          position: 'absolute', top: TRACK_TOP, left: 0, right: 0,
          height: TRACK_H, background: 'var(--border)', borderRadius: 3,
        }}
      >
        {segments.map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${s.left}%`, width: `${Math.max(0, s.width)}%`,
            background: s.color, borderRadius: 3,
          }} />
        ))}
      </div>

      {/* Ghost markers for linked handles — non-draggable position indicators */}
      {ghosts.map(({ pct }, i) => (
        <div key={`ghost-${i}`} style={{
          position: 'absolute',
          top: HANDLE_Y,
          left: `${pct}%`,
          width: 10, height: 10,
          transform: 'translate(-50%, -50%)',
          background: 'var(--text-tertiary)',
          borderRadius: '50%',
          pointerEvents: 'none',
          zIndex: 15,
          opacity: 0.45,
        }} />
      ))}

      {/* Handle circles — in outer container (not nested in track) so left:pct% is unambiguous */}
      {circles.map(({ handle, pct, color }) => (
        <div
          key={handle}
          onPointerDown={e => { e.preventDefault(); dragging.current = handle }}
          style={{
            position: 'absolute',
            top: HANDLE_Y,
            left: `${pct}%`,
            width: 18, height: 18,
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg)',
            border: `2.5px solid ${color}`,
            borderRadius: '50%',
            cursor: 'grab',
            zIndex: 20,
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
            touchAction: 'none',
          }}
        />
      ))}

      {/* Hour ticks */}
      <div style={{ position: 'absolute', top: TICK_TOP, left: 0, right: 0 }}>
        {ticks.map(({ mins, label }) => (
          <div key={mins} style={{
            position: 'absolute', left: `${toPct(mins)}%`,
            transform: 'translateX(-50%)',
            fontSize: 10, color: 'var(--text-tertiary)',
          }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main builder ───────────────────────────────────────────────────────────
function BuilderForm() {
  const searchParams = useSearchParams()
  const prefillId = searchParams.get('prefill')

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [inputs, setInputs] = useState<QuoteInputs>(BLANK_INPUTS)
  const [bandType, setBandType] = useState<BandType>('electric')
  const [sizeIndex, setSizeIndex] = useState(2)
  const [setConfig, setSetConfig] = useState<SetConfig>('3x45')
  const [addOns, setAddOns] = useState<AddOn[]>([])
  const [selectedAddOns, setSelectedAddOns] = useState<Map<string, SelectedAddOn>>(new Map())
  const [saving, setSaving] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([])

  const [arrivalLinked, setArrivalLinked] = useState(true)
  const [loadOutLinked, setLoadOutLinked] = useState(true)

  const [timeline, setTimeline] = useState<TimelineState>({
    arrival: 18 * 60, start: 19 * 60, finish: 23 * 60, loadOut: 23 * 60,
  })

  const availableSizes = BAND_SIZES_ORDERED.filter(s => LINE_UP_LABELS[bandType]?.[s])
  const clampedIndex = Math.min(sizeIndex, availableSizes.length - 1)
  const currentSize = availableSizes[clampedIndex]
  const lineUp = LINE_UP_LABELS[bandType]?.[currentSize] ?? ''

  const set = useCallback((key: keyof QuoteInputs, value: unknown) =>
    setInputs(prev => ({ ...prev, [key]: value })), [])
  const toggleBool = useCallback((key: keyof QuoteInputs) =>
    setInputs(prev => ({ ...prev, [key]: !prev[key] })), [])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.from('settings').select('*').eq('id', 1).single()
      .then(({ data }) => { if (data) setSettings({ ...DEFAULT_SETTINGS, ...data }) })
    supabase.from('add_ons').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setAddOns(data ?? []))
  }, [])

  useEffect(() => {
    if (!prefillId) return
    createBrowserClient().from('quotes').select('inputs').eq('id', prefillId).single()
      .then(({ data }) => {
        if (!data?.inputs) return
        const inp = data.inputs as QuoteInputs
        setInputs(inp)
        if (inp.band_type) setBandType(inp.band_type)
        if (inp.band_sizes?.[0]) {
          const sizes = BAND_SIZES_ORDERED.filter(s => LINE_UP_LABELS[inp.band_type ?? 'electric']?.[s])
          const idx = sizes.indexOf(inp.band_sizes[0])
          if (idx >= 0) setSizeIndex(idx)
        }
        if (inp.set_configs?.[0]) setSetConfig(inp.set_configs[0])
        const legacyArrival = (inp as unknown as Record<string, unknown>).load_in_time as string | null | undefined
        const arrMins = parseMins((inp.arrival_time ?? legacyArrival) as string | null | undefined)
        const startMins = parseMins(inp.start_time)
        const finMins = parseMins(inp.finish_time)
        const loMins = parseMins(inp.load_out_time)
        setTimeline({ arrival: arrMins, start: startMins, finish: finMins, loadOut: loMins })
        setArrivalLinked(arrMins === startMins - 60)
        setLoadOutLinked(loMins === finMins)
        if (inp.selected_add_ons?.length) {
          const map = new Map<string, SelectedAddOn>()
          inp.selected_add_ons.forEach(a => map.set(a.id, a))
          setSelectedAddOns(map)
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillId])

  function toggleAddOn(addon: AddOn) {
    setSelectedAddOns(prev => {
      const next = new Map(prev)
      if (next.has(addon.id)) {
        next.delete(addon.id)
      } else {
        next.set(addon.id, {
          id: addon.id, name: addon.name, pricing_type: addon.pricing_type,
          price: addon.default_price, line_item_label: addon.line_item_label,
          inclusion_text: addon.inclusion_text, requirement_text: addon.requirement_text,
        })
      }
      return next
    })
  }

  const liveInputs: QuoteInputs = useMemo(() => ({
    ...inputs,
    band_type: bandType,
    band_size: currentSize, band_sizes: [currentSize],
    set_config: setConfig, set_configs: [setConfig],
    arrival_time: hhmm(timeline.arrival),
    start_time: hhmm(timeline.start),
    finish_time: hhmm(timeline.finish),
    load_out_time: hhmm(timeline.loadOut),
    selected_add_ons: Array.from(selectedAddOns.values()),
  }), [inputs, bandType, currentSize, setConfig, timeline, selectedAddOns])

  const calculated = useMemo(() => calculate(liveInputs, settings), [liveInputs, settings])
  const price = calculated.price_options?.[0]?.total_price ?? calculated.total_fee
  const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

  // ── Summary text for header ──
  const soundFlags = [
    liveInputs.client_provides_pa && 'Client PA',
    liveInputs.is_acoustic && 'Acoustic',
    liveInputs.is_powerless && 'Powerless',
    liveInputs.has_limiter && 'Limiter',
  ].filter(Boolean) as string[]
  const addOnCount = selectedAddOns.size
  const summaryText = [
    BAND_TYPE_LABELS[bandType],
    BAND_SIZE_LABELS[currentSize],
    `${SET_CONFIG_LABELS[setConfig]} min sets`,
    `${hhmm(timeline.start)}–${hhmm(timeline.finish)}`,
    ...soundFlags,
    addOnCount > 0 ? `${addOnCount} add-on${addOnCount > 1 ? 's' : ''}` : null,
  ].filter(Boolean).join(' · ')

  // ── Inclusions / requirements (live from liveInputs) ──
  const hasBuyout = liveInputs.selected_add_ons.some(a => a.name.toLowerCase().includes('buyout'))
  const hasMicHire = liveInputs.selected_add_ons.some(a => a.name.toLowerCase().includes('mic hire'))
  const loadOutDiffersFromFinish = liveInputs.load_out_time !== liveInputs.finish_time

  const inclusions: { text: string; show: boolean }[] = [
    { text: 'All equipment for our use', show: !liveInputs.client_provides_pa },
    { text: 'Based on a finish of 11pm or earlier', show: !liveInputs.finish_time || liveInputs.finish_time <= '23:00' },
    { text: 'Music via iPad/PA during intervals', show: !liveInputs.selected_add_ons.some(a => a.name === 'Roaming set') },
    { text: 'Arrival one hour before performance start (1.5hrs if full PA)', show: true },
    { text: 'Travel and expenses included', show: true },
    { text: 'If dancing and 40+ guests — book quartet or larger', show: liveInputs.booking_type === 'dancing_over_40' },
    { text: 'Does not include use of mic — please book mic hire option if any use of mic is required', show: !hasMicHire },
    { text: 'Includes mic hire for use during agreed performance times (i.e. not during break)', show: hasMicHire },
  ]

  const requirements: { text: string; show: boolean }[] = [
    { text: '2 × 13amp plug sockets', show: !liveInputs.is_powerless && !liveInputs.is_acoustic },
    { text: 'Food clause — same menu choices as guests, or £20 per musician buyout', show: !hasBuyout },
    { text: 'Lockable indoor exclusive green room', show: true },
    { text: 'Soft drinks and mineral water', show: true },
    { text: 'Able to pack down at end of final set', show: !loadOutDiffersFromFinish },
    { text: 'Full loading information required 2 weeks in advance', show: true },
    { text: 'Please advise of any accessibility considerations at the venue', show: true },
  ]

  async function handleSend() {
    setSaving(true)
    setSendError(null)
    try {
      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: liveInputs }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 207) {
        setSendError(data.error ?? 'Something went wrong')
        return
      }
      if (data.emailError) {
        setSendError(`Quote saved but email failed: ${data.emailError}`)
      }
      if (data.id) {
        setSavedQuotes(prev => [...prev, {
          id: data.id,
          label: `${BAND_SIZE_LABELS[currentSize]} · ${SET_CONFIG_LABELS[setConfig]} · ${hhmm(timeline.start)}–${hhmm(timeline.finish)}`,
          price,
        }])
      }
    } catch (e) {
      setSendError('Network error — please try again')
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-secondary)' }}>

      {/* Sticky price header — 3 columns: label | centred price | save button */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--bg)', borderBottom: '0.5px solid var(--border)',
        padding: '0.85rem 1.5rem',
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12,
      }}>
        {/* Left: branding label */}
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Ward Smith Entertainment
        </div>

        {/* Centre: price + summary */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {fmt(price)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, letterSpacing: '-0.01em' }}>
            {summaryText}
          </div>
          {lineUp && (
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{lineUp}</div>
          )}
        </div>

        {/* Right: send button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            onClick={handleSend}
            disabled={saving || !inputs.client_email}
            title={!inputs.client_email ? 'Add an email address in the Context section' : undefined}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 500,
              background: saving || !inputs.client_email ? 'var(--border)' : 'var(--text)',
              color: saving || !inputs.client_email ? 'var(--text-tertiary)' : 'var(--bg)',
              border: 'none', borderRadius: 'var(--radius-md)',
              cursor: saving || !inputs.client_email ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em', whiteSpace: 'nowrap',
              opacity: !inputs.client_email ? 0.6 : 1,
            }}
          >
            {saving ? 'Sending…' : 'Send me this quote →'}
          </button>
          {sendError && (
            <div style={{ fontSize: 11, color: '#ef4444', maxWidth: 220, textAlign: 'right', lineHeight: 1.4 }}>
              {sendError}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Timeline */}
        <Section label="Timeline">
          <TimelineSlider
            value={timeline}
            onChange={setTimeline}
            arrivalLinked={arrivalLinked}
            loadOutLinked={loadOutLinked}
          />
          <div style={{ display: 'flex', gap: 24, marginTop: 20, paddingTop: 16, borderTop: '0.5px solid var(--border)' }}>
            <Toggle
              label="Arrival 1 hour before start"
              checked={arrivalLinked}
              onChange={v => {
                setArrivalLinked(v)
                setTimeline(t => ({ ...t, arrival: v ? t.start - 60 : t.start - 60 }))
              }}
            />
            <Toggle
              label="Finish and load out at same time"
              checked={loadOutLinked}
              onChange={v => {
                setLoadOutLinked(v)
                // when unticking: auto-set load out to 1 hour after finish
                setTimeline(t => ({ ...t, loadOut: v ? t.finish : t.finish + 60 }))
              }}
            />
          </div>
        </Section>

        {/* Band type */}
        <Section label="Band type">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(BAND_TYPE_LABELS) as BandType[]).map(bt => (
              <Chip key={bt} label={BAND_TYPE_LABELS[bt]} active={bandType === bt}
                onClick={() => { setBandType(bt); setSizeIndex(0) }} />
            ))}
          </div>
        </Section>

        {/* Band size */}
        <Section label="Band size">
          <input
            type="range" min={0} max={availableSizes.length - 1} value={clampedIndex}
            onChange={e => setSizeIndex(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--text)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {availableSizes.map((s, i) => (
              <span key={s} onClick={() => setSizeIndex(i)} style={{
                fontSize: 11, color: i === clampedIndex ? 'var(--text)' : 'var(--text-tertiary)',
                fontWeight: i === clampedIndex ? 600 : 400, cursor: 'pointer', userSelect: 'none',
              }}>
                {BAND_SIZE_LABELS[s]}
              </span>
            ))}
          </div>
          {lineUp && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10 }}>{lineUp}</div>}
        </Section>

        {/* Set config */}
        <Section label="Number of sets">
          <div style={{ display: 'flex', gap: 6 }}>
            {SET_CONFIGS.map(cfg => (
              <Chip key={cfg} label={`${SET_CONFIG_LABELS[cfg]} min sets`}
                active={setConfig === cfg} onClick={() => setSetConfig(cfg)} />
            ))}
          </div>
        </Section>

        {/* Type of performance */}
        <Section label="Type of performance">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERF_TYPES.map(({ value, label }) => (
              <Chip key={value} label={label}
                active={inputs.booking_type === value}
                onClick={() => set('booking_type', inputs.booking_type === value ? null : value)} />
            ))}
          </div>
        </Section>

        {/* Sound */}
        <Section label="Sound">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              { label: 'Client provides PA', key: 'client_provides_pa' },
              { label: 'Acoustic / no PA', key: 'is_acoustic' },
              { label: 'Powerless venue', key: 'is_powerless' },
              { label: 'Has limiter', key: 'has_limiter' },
            ] as { label: string; key: keyof QuoteInputs }[]).map(({ label, key }) => (
              <Chip key={key} label={label}
                active={!!(inputs as unknown as Record<string, boolean>)[key]}
                onClick={() => toggleBool(key)} />
            ))}
          </div>
        </Section>

        {/* Add-ons */}
        {addOns.length > 0 && (
          <Section label="Add-ons">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {addOns.map((addon, i) => {
                const selected = selectedAddOns.has(addon.id)
                const dispPrice = addon.pricing_type === 'per_musician'
                  ? `£${addon.default_price} p/musician` : `£${addon.default_price}`
                return (
                  <div key={addon.id} onClick={() => toggleAddOn(addon)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', cursor: 'pointer',
                    borderBottom: i < addOns.length - 1 ? '0.5px solid var(--border)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `1.5px solid ${selected ? 'var(--text-info)' : 'var(--border-hover)'}`,
                        background: selected ? 'var(--text-info)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {selected && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{addon.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dispPrice}</span>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* Context */}
        <Section label="Context">
          {/* Email — required to send */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 5 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Send quote to (email)</div>
              {!inputs.client_email && (
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>required to send</div>
              )}
            </div>
            <input
              type="email"
              value={inputs.client_email ?? ''}
              placeholder="agent@example.com"
              onChange={e => set('client_email', e.target.value || null)}
              style={inputStyle}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5 }}>Agency / client name</div>
              <input type="text" value={inputs.agency_name ?? ''} placeholder="e.g. Perfect Venue"
                onChange={e => set('agency_name', e.target.value || null)} style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5 }}>Event date</div>
              <DateInput value={inputs.event_date ?? ''} onChange={v => set('event_date', v || null)} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 5 }}>Agent name</div>
              <input type="text" value={inputs.agent_name ?? ''} placeholder="e.g. Sarah"
                onChange={e => set('agent_name', e.target.value || null)} style={inputStyle} />
            </div>
          </div>
        </Section>

        {/* What's included */}
        <Section label="What's included">
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0 }}>
            {inclusions.filter(i => i.show).map(item => (
              <li key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-info)', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
              </li>
            ))}
            {liveInputs.selected_add_ons.filter(a => a.inclusion_text).map(addon => (
              <li key={addon.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-info)', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{addon.inclusion_text}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Requirements */}
        <Section label="Requirements">
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0 }}>
            {requirements.filter(r => r.show).map(item => (
              <li key={item.text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 1 }}>·</span>
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
              </li>
            ))}
            {liveInputs.selected_add_ons.filter(a => a.requirement_text).map(addon => (
              <li key={addon.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text-secondary)', flexShrink: 0, marginTop: 1 }}>·</span>
                <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{addon.requirement_text}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Saved quotes */}
        {savedQuotes.length > 0 && (
          <div style={{
            background: 'var(--bg)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginTop: '1.5rem',
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
              Saved quotes
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {savedQuotes.map((q, i) => (
                <div key={q.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < savedQuotes.length - 1 ? '0.5px solid var(--border)' : 'none',
                }}>
                  <div>
                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{q.label}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 16 }}>{fmt(q.price)}</span>
                  </div>
                  <a href={`/quote/${q.id}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: 'var(--text)', textDecoration: 'underline' }}>
                    View →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Subcomponents ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '1rem',
    }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', fontSize: 13, fontWeight: active ? 500 : 400,
      background: active ? 'var(--text)' : 'var(--bg-secondary)',
      color: active ? 'var(--bg)' : 'var(--text)',
      border: `0.5px solid ${active ? 'var(--text)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)', cursor: 'pointer',
      transition: 'all 0.1s', letterSpacing: '-0.01em',
    }}>
      {label}
    </button>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${checked ? 'var(--text-info)' : 'var(--border-hover)'}`,
        background: checked ? 'var(--text-info)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {checked && <span style={{ color: 'white', fontSize: 10, lineHeight: 1 }}>✓</span>}
      </div>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
  borderRadius: 'var(--radius-md)', color: 'var(--text)', boxSizing: 'border-box',
}

// Accepts/displays DD/MM/YYYY, stores YYYY-MM-DD internally
function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function toDisplay(iso: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    return `${d}/${m}/${y}`
  }
  const [display, setDisplay] = React.useState(() => toDisplay(value))
  React.useEffect(() => { setDisplay(toDisplay(value)) }, [value])

  function handleChange(raw: string) {
    let v = raw.replace(/[^\d]/g, '')
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2)
    if (v.length > 5) v = v.slice(0, 5) + '/' + v.slice(5)
    if (v.length > 10) v = v.slice(0, 10)
    setDisplay(v)
    const match = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      onChange(`${y}-${m}-${d}`)
    } else if (!v) {
      onChange('')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      const el = e.currentTarget
      const pos = el.selectionStart ?? display.length
      if (pos > 0 && display[pos - 1] === '/') {
        e.preventDefault()
        const next = display.slice(0, pos - 2) + display.slice(pos)
        setDisplay(next)
        setTimeout(() => el.setSelectionRange(pos - 2, pos - 2), 0)
      }
    }
  }

  return (
    <input
      type="text"
      value={display}
      onChange={e => handleChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="DD/MM/YYYY"
      maxLength={10}
      inputMode="numeric"
      style={inputStyle}
    />
  )
}

export default function BuilderPage() {
  return <Suspense><BuilderForm /></Suspense>
}
