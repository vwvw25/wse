import type { PriceOption, QuoteInputs, Settings } from '@/types/quote'

const PKG_HOURS: Record<string, number> = { '2x45': 3, '3x45': 4, '4x45': 6, '5x45': 8 }
const PRE_START_STD = 1.0
const PRE_START_SE = 1.5

function tmins(t: string) { const [h, m] = t.split(':').map(Number); return h * 60 + m }

export interface OptionLineItem { label: string; formula: string; value: number }

export function optionLineItems(opt: PriceOption, inp: QuoteInputs, s: Settings, locationSurcharge: number): OptionLineItem[] {
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
