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
  const musicianRoles: [number, boolean][] = [
    [inputs.singer_fee, inputs.singer_fee > 0],
    [inputs.guitarist_fee, inputs.guitarist_fee > 0],
    [inputs.drummer_fee, inputs.drummer_fee > 0],
    [inputs.bass_fee, inputs.bass_fee > 0],
    [inputs.keys_fee, inputs.keys_fee > 0],
    [inputs.sax_fee, inputs.sax_fee > 0],
    [inputs.trombone_fee, inputs.trombone_fee > 0],
    [inputs.trumpet_fee, inputs.trumpet_fee > 0],
    [inputs.singer_2_fee, inputs.singer_2_fee > 0],
  ]
  const musician_count = musicianRoles.filter(([, active]) => active).length
  const sum_musician_fees = musicianRoles.filter(([, active]) => active).reduce((sum, [fee]) => sum + fee, 0)

  // --- Set multiplier & package hours ---
  const setMultiplierMap: Record<SetConfig, number> = {
    '2x45': settings.set_multiplier_2x45,
    '3x45': settings.set_multiplier_3x45,
    '4x45': settings.set_multiplier_4x45,
    '5x45': settings.set_multiplier_5x45,
  }
  const packageHoursMap: Record<SetConfig, number> = {
    '2x45': 3,
    '3x45': 4,
    '4x45': 6,
    '5x45': 8,
  }
  const set_multiplier = inputs.set_config ? setMultiplierMap[inputs.set_config] : 1.0
  const package_hours = inputs.set_config ? packageHoursMap[inputs.set_config] : 3

  // --- Time calculations ---
  const startMins = inputs.start_time ? timeToMinutes(inputs.start_time) : 0
  const finishMins = inputs.finish_time ? timeToMinutes(inputs.finish_time) : timeToMinutes('23:00')
  const midnightMins = 24 * 60

  // Handle finish after midnight (e.g. 01:00 = 25:00)
  const finishAdjusted = finishMins < startMins ? finishMins + 24 * 60 : finishMins
  const total_hours = inputs.start_time && inputs.finish_time
    ? minutesToHours(finishAdjusted - startMins)
    : 0

  let waiting_time_hours_before_midnight = 0
  let waiting_time_hours_after_midnight = 0
  let performance_hours_after_midnight = 0

  if (inputs.start_time && inputs.finish_time) {
    if (finishAdjusted <= midnightMins) {
      // Entirely before midnight
      waiting_time_hours_before_midnight = Math.max(0, total_hours - package_hours)
    } else {
      // Crosses midnight
      const hoursBeforeMidnight = minutesToHours(midnightMins - startMins)
      waiting_time_hours_before_midnight = Math.max(0, hoursBeforeMidnight - package_hours)
      waiting_time_hours_after_midnight = minutesToHours(finishAdjusted - midnightMins)
      performance_hours_after_midnight = Math.min(
        waiting_time_hours_after_midnight,
        minutesToHours(finishAdjusted - midnightMins)
      )
    }
  }

  // --- Base performance fee ---
  const base_performance_fee = sum_musician_fees * set_multiplier * settings.business_margin

  // --- PA costs ---
  const isLargeEnoughForPA = isQuartetOrLarger(inputs.band_size)
  const pa_hire_cost = isLargeEnoughForPA && !inputs.client_provides_pa
    ? settings.pa_sound_engineer_rate
    : 0
  const pa_deduction = inputs.client_provides_pa && isLargeEnoughForPA
    ? settings.pa_deduction_rate  // negative value
    : 0
  const pa_hire_before_midnight_cost = settings.pa_rate_before_midnight * inputs.pa_hours_before_midnight
  const pa_hire_after_midnight_cost = settings.pa_rate_after_midnight * inputs.pa_hours_after_midnight

  // --- Other costs ---
  const mic_hire_cost = inputs.mic_hire_required ? settings.mic_hire_rate : 0
  const buyout_cost = inputs.buyout_required ? settings.buyout_rate * musician_count : 0
  const waiting_time_cost_before_midnight = waiting_time_hours_before_midnight * settings.waiting_time_rate_before_midnight * musician_count
  const waiting_time_cost_after_midnight = waiting_time_hours_after_midnight * settings.waiting_time_rate_after_midnight * musician_count
  const waiting_time_cost = waiting_time_cost_before_midnight + waiting_time_cost_after_midnight
  const band_hours_after_midnight_cost = performance_hours_after_midnight * settings.band_after_midnight_rate * musician_count

  const roaming_set_cost = 0 // fee not stored separately — flagged on quote
  const move_between_sets_cost = inputs.is_move_between_sets ? inputs.move_between_sets_fee : 0
  const second_pa_cost = inputs.is_second_pa ? inputs.second_pa_fee : 0
  const costume_upgrade_cost = inputs.is_costume_upgrade ? inputs.costume_upgrade_fee * musician_count : 0

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
  const total_accommodation_cost = is_overnight
    ? inputs.accommodation_cost * musician_count * inputs.accommodation_nights
    : 0
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
    mic_hire_cost +
    buyout_cost +
    waiting_time_cost +
    band_hours_after_midnight_cost +
    (inputs.is_roaming ? 0 : 0) + // roaming_set_cost TBC
    move_between_sets_cost +
    second_pa_cost +
    costume_upgrade_cost +
    (inputs.is_charity_jukebox ? inputs.charity_jukebox_fee : 0) +
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
    musician_count,
    sum_musician_fees,
    set_multiplier,
    package_hours,
    total_hours,
    waiting_time_hours_before_midnight,
    waiting_time_hours_after_midnight,
    performance_hours_after_midnight,
    base_performance_fee,
    pa_hire_cost,
    pa_deduction,
    pa_hire_before_midnight_cost,
    pa_hire_after_midnight_cost,
    mic_hire_cost,
    buyout_cost,
    waiting_time_cost_before_midnight,
    waiting_time_cost_after_midnight,
    waiting_time_cost,
    band_hours_after_midnight_cost,
    roaming_set_cost,
    move_between_sets_cost,
    second_pa_cost,
    costume_upgrade_cost,
    location_surcharge,
    total_petrol_train_cost,
    total_accommodation_cost,
    total_per_diem_cost,
    total_travel_day_cost,
    total_off_day_cost,
    total_baggage_fees,
    total_flights_cost,
    total_outgoing_uk_transfer_cost,
    total_outgoing_dest_transfer_cost,
    total_return_dest_transfer_cost,
    total_return_uk_transfer_cost,
    total_local_transport_cost,
    total_visa_cost,
    total_vaccinations_cost,
    total_fee,
    single_day_fee,
    full_engagement_fee,
    per_day_saving,
  }
}

export const DEFAULT_SETTINGS: Settings = {
  business_margin: 1.30,
  pa_sound_engineer_rate: 1000,
  pa_deduction_rate: -50,
  pa_rate_before_midnight: 50,
  pa_rate_after_midnight: 75,
  mic_hire_rate: 50,
  buyout_rate: 20,
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
