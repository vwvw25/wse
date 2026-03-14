import type { QuoteInputs, Settings, QuoteCalculated, BandSize, SetConfig } from '@/types/quote'

const BAND_SIZE_ORDER: BandSize[] = [
  'duo', 'trio', 'quartet', 'five_piece', 'six_piece', 'seven_piece', 'eight_piece'
]

function isQuartetOrLarger(size: BandSize | null): boolean {
  if (!size) return false
  return BAND_SIZE_ORDER.indexOf(size) >= BAND_SIZE_ORDER.indexOf('quartet')
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function minutesToHours(mins: number): number {
  return mins / 60
}

export function calculate(inputs: QuoteInputs, settings: Settings): QuoteCalculated {
  // --- Musician count & fees ---
  const musicianFees = [
    inputs.singer_fee, inputs.guitarist_fee, inputs.drummer_fee,
    inputs.bass_fee, inputs.keys_fee, inputs.sax_fee,
    inputs.trombone_fee, inputs.trumpet_fee, inputs.singer_2_fee,
  ]
  const activeFees = musicianFees.filter(f => f > 0)
  const musician_count = activeFees.length
  const sum_musician_fees = activeFees.reduce((s, f) => s + f, 0)

  // --- Set multiplier & package hours ---
  const setMultiplierMap: Record<SetConfig, number> = {
    '2x45': settings.set_multiplier_2x45,
    '3x45': settings.set_multiplier_3x45,
    '4x45': settings.set_multiplier_4x45,
    '5x45': settings.set_multiplier_5x45,
  }
  const packageHoursMap: Record<SetConfig, number> = {
    '2x45': 3, '3x45': 4, '4x45': 6, '5x45': 8,
  }
  const set_multiplier = inputs.set_config ? setMultiplierMap[inputs.set_config] : 1.0
  const package_hours = inputs.set_config ? packageHoursMap[inputs.set_config] : 3

  // --- Time calculations ---
  const startMins = inputs.start_time ? timeToMinutes(inputs.start_time) : 0
  const finishMins = inputs.finish_time ? timeToMinutes(inputs.finish_time) : timeToMinutes('23:00')
  const midnightMins = 24 * 60
  const finishAdjusted = finishMins < startMins ? finishMins + 24 * 60 : finishMins
  const total_hours = inputs.start_time && inputs.finish_time
    ? minutesToHours(finishAdjusted - startMins) : 0

  let waiting_time_hours_before_midnight = 0
  let waiting_time_hours_after_midnight = 0
  let performance_hours_after_midnight = 0

  if (inputs.start_time && inputs.finish_time) {
    if (finishAdjusted <= midnightMins) {
      waiting_time_hours_before_midnight = Math.max(0, total_hours - package_hours)
    } else {
      const hoursBeforeMidnight = minutesToHours(midnightMins - startMins)
      waiting_time_hours_before_midnight = Math.max(0, hoursBeforeMidnight - package_hours)
      waiting_time_hours_after_midnight = minutesToHours(finishAdjusted - midnightMins)
      performance_hours_after_midnight = waiting_time_hours_after_midnight
    }
  }

  // --- Base performance fee ---
  const base_performance_fee = sum_musician_fees * set_multiplier * settings.business_margin

  // --- PA costs ---
  const isLargeEnoughForPA = isQuartetOrLarger(inputs.band_size)
  const pa_hire_cost = isLargeEnoughForPA && !inputs.client_provides_pa
    ? settings.pa_sound_engineer_rate : 0
  const pa_deduction = inputs.client_provides_pa && isLargeEnoughForPA
    ? settings.pa_deduction_rate : 0
  const pa_hire_before_midnight_cost = settings.pa_rate_before_midnight * inputs.pa_hours_before_midnight
  const pa_hire_after_midnight_cost = settings.pa_rate_after_midnight * inputs.pa_hours_after_midnight

  // --- Add-ons (data-driven) ---
  const add_ons_total = (inputs.selected_add_ons ?? []).reduce((sum, addon) => {
    const price = addon.pricing_type === 'per_musician'
      ? addon.price * musician_count
      : addon.price
    return sum + price
  }, 0)

  // --- Waiting time & after midnight ---
  const waiting_time_cost_before_midnight = waiting_time_hours_before_midnight * settings.waiting_time_rate_before_midnight * musician_count
  const waiting_time_cost_after_midnight = waiting_time_hours_after_midnight * settings.waiting_time_rate_after_midnight * musician_count
  const waiting_time_cost = waiting_time_cost_before_midnight + waiting_time_cost_after_midnight
  const band_hours_after_midnight_cost = performance_hours_after_midnight * settings.band_after_midnight_rate * musician_count

  // --- Location surcharge ---
  let location_surcharge = 0
  if (inputs.is_boat) location_surcharge = settings.location_surcharge_boat
  else if (inputs.is_city_centre) location_surcharge = settings.location_surcharge_city
  else if (inputs.is_stadium) location_surcharge = settings.location_surcharge_stadium
  else if (inputs.is_private_house) location_surcharge = settings.location_surcharge_house
  else if (inputs.is_no_drive_zone) location_surcharge = settings.location_surcharge_no_drive

  // --- Travel costs ---
  const is_overnight = inputs.travel_type === 'domestic_overnight' || inputs.travel_type === 'international'
  const is_international = inputs.travel_type === 'international'

  const total_petrol_train_cost = is_overnight ? inputs.petrol_train_cost * musician_count : 0
  const total_accommodation_cost = is_overnight ? inputs.accommodation_cost * musician_count * inputs.accommodation_nights : 0
  const total_per_diem_cost = is_overnight ? inputs.per_diem_rate * musician_count * inputs.performance_days : 0
  const total_travel_day_cost = inputs.travel_days > 0 ? inputs.travel_day_rate * musician_count * inputs.travel_days : 0
  const total_off_day_cost = inputs.off_days > 0 ? inputs.off_day_rate * musician_count * inputs.off_days : 0
  const total_baggage_fees = is_international ? inputs.baggage_fee * inputs.carry_on_items_required : 0
  const total_flights_cost = is_international ? (inputs.flight_cost * musician_count) + total_baggage_fees : 0
  const total_outgoing_uk_transfer_cost = is_international ? inputs.outgoing_uk_transfer_cost * musician_count : 0
  const total_outgoing_dest_transfer_cost = is_international ? inputs.outgoing_dest_transfer_cost * musician_count : 0
  const total_return_dest_transfer_cost = is_international ? inputs.return_dest_transfer_cost * musician_count : 0
  const total_return_uk_transfer_cost = is_international ? inputs.return_uk_transfer_cost * musician_count : 0
  const total_local_transport_cost = is_international ? inputs.local_transport_cost * musician_count : 0
  const total_visa_cost = is_international ? inputs.visa_cost * musician_count : 0
  const total_vaccinations_cost = is_international ? inputs.vaccinations_cost * musician_count : 0

  // --- Total ---
  const total_fee =
    base_performance_fee +
    pa_hire_cost +
    pa_deduction +
    pa_hire_before_midnight_cost +
    pa_hire_after_midnight_cost +
    add_ons_total +
    waiting_time_cost +
    band_hours_after_midnight_cost +
    location_surcharge +
    total_petrol_train_cost +
    total_accommodation_cost +
    total_per_diem_cost +
    total_travel_day_cost +
    total_off_day_cost +
    total_flights_cost +
    total_outgoing_uk_transfer_cost +
    total_outgoing_dest_transfer_cost +
    total_return_dest_transfer_cost +
    total_return_uk_transfer_cost +
    total_local_transport_cost +
    total_visa_cost +
    total_vaccinations_cost +
    (is_international ? inputs.car_hire_cost : 0) +
    (is_international ? inputs.instrument_carriage_cost : 0)

  // --- Multi-day ---
  const single_day_fee = total_fee
  const full_engagement_fee = inputs.is_multi_day && inputs.number_of_days > 1
    ? single_day_fee * inputs.number_of_days * (1 - inputs.per_day_discount)
    : single_day_fee
  const per_day_saving = inputs.is_multi_day && inputs.number_of_days > 1
    ? single_day_fee - (full_engagement_fee / inputs.number_of_days)
    : 0

  return {
    musician_count, sum_musician_fees, set_multiplier, package_hours, total_hours,
    waiting_time_hours_before_midnight, waiting_time_hours_after_midnight, performance_hours_after_midnight,
    base_performance_fee, pa_hire_cost, pa_deduction, pa_hire_before_midnight_cost, pa_hire_after_midnight_cost,
    add_ons_total,
    waiting_time_cost_before_midnight, waiting_time_cost_after_midnight, waiting_time_cost,
    band_hours_after_midnight_cost, location_surcharge,
    total_petrol_train_cost, total_accommodation_cost, total_per_diem_cost,
    total_travel_day_cost, total_off_day_cost, total_baggage_fees, total_flights_cost,
    total_outgoing_uk_transfer_cost, total_outgoing_dest_transfer_cost,
    total_return_dest_transfer_cost, total_return_uk_transfer_cost,
    total_local_transport_cost, total_visa_cost, total_vaccinations_cost,
    total_fee, single_day_fee, full_engagement_fee, per_day_saving,
  }
}

export const DEFAULT_SETTINGS: Settings = {
  business_margin: 1.30,
  pa_sound_engineer_rate: 1000,
  pa_deduction_rate: -50,
  pa_rate_before_midnight: 50,
  pa_rate_after_midnight: 75,
  waiting_time_rate_before_midnight: 40,
  waiting_time_rate_after_midnight: 100,
  band_after_midnight_rate: 100,
  additional_driving_rate: 0,
  solo_rate_multiple: 1,
  location_surcharge_boat: 0,
  location_surcharge_city: 0,
  location_surcharge_stadium: 0,
  location_surcharge_house: 0,
  location_surcharge_no_drive: 0,
  set_multiplier_2x45: 1.00,
  set_multiplier_3x45: 1.30,
  set_multiplier_4x45: 1.60,
  set_multiplier_5x45: 2.00,
}
