import type { QuoteInputs, Settings, QuoteCalculated, BandSize, SetConfig, PriceOption, BookingType } from '@/types/quote'
import { MUSICIAN_FEE_KEYS, LINE_UP_LABELS, BAND_SIZES_ORDERED } from './lineups'
import type { BandType } from './lineups'

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

function getSumFees(inputs: QuoteInputs, bandType: BandType, bandSize: BandSize): number {
  const keys = MUSICIAN_FEE_KEYS[bandType]?.[bandSize] ?? []
  return keys.reduce((sum, k) => sum + ((inputs[k] as number) ?? 0), 0)
}

function getMusicianCount(bandType: BandType, bandSize: BandSize): number {
  return MUSICIAN_FEE_KEYS[bandType]?.[bandSize]?.length ?? 0
}

// Pre-start time: hours before the set start built into each package for load-in / setup
const PRE_START_STANDARD = 1.0     // standard load-in
const PRE_START_PA_ENGINEER = 1.5  // extended PA + sound engineer needs extra setup time

const packageHoursMap: Record<SetConfig, number> = {
  '1x60': 3, '2x45': 3, '3x45': 4, '4x45': 6, '5x45': 8,
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

  // --- Set multiplier & package hours (primary config — for audit summary) ---
  const setMultiplierMap: Record<SetConfig, number> = {
    '1x60': settings.set_multiplier_2x45,
    '2x45': settings.set_multiplier_2x45,
    '3x45': settings.set_multiplier_3x45,
    '4x45': settings.set_multiplier_4x45,
    '5x45': settings.set_multiplier_5x45,
  }
  const primarySetConfig = inputs.set_configs?.[0] ?? inputs.set_config ?? null
  const set_multiplier = primarySetConfig ? setMultiplierMap[primarySetConfig] : 1.0
  const package_hours = primarySetConfig ? packageHoursMap[primarySetConfig] : 3
  const pre_start_time = PRE_START_STANDARD

  // --- Time calculations ---
  const startMins = inputs.start_time ? timeToMinutes(inputs.start_time) : 0
  const finishMins = inputs.finish_time ? timeToMinutes(inputs.finish_time) : timeToMinutes('23:00')
  const midnightMins = 24 * 60
  const finishAdjusted = finishMins < startMins ? finishMins + 24 * 60 : finishMins
  const total_hours = inputs.start_time && inputs.finish_time
    ? minutesToHours(finishAdjusted - startMins) : 0

  // Arrival time and load-out time — required for waiting time calculation
  // arrival_time is always set by the form (auto-computed as start − 1h if not custom)
  // load_out_time is always set by the form (= finish_time when "load out at finish" is checked)
  const arrivalMins = inputs.arrival_time ? timeToMinutes(inputs.arrival_time) : null
  const loadOutMins = inputs.load_out_time ? timeToMinutes(inputs.load_out_time) : null
  const hasWaitingTimes = arrivalMins !== null && loadOutMins !== null
  const loadOutAdjusted = hasWaitingTimes
    ? (loadOutMins! < arrivalMins! ? loadOutMins! + 24 * 60 : loadOutMins!)
    : 0

  // Top-level waiting time — uses standard pre_start_time (for audit summary)
  let waiting_time_hours_before_midnight = 0
  let waiting_time_hours_after_midnight = 0
  let performance_hours_after_midnight = 0

  if (hasWaitingTimes) {
    const totalLoadHours = minutesToHours(loadOutAdjusted - arrivalMins!)
    const totalPackageHours = package_hours + PRE_START_STANDARD
    if (loadOutAdjusted <= midnightMins) {
      waiting_time_hours_before_midnight = Math.max(0, totalLoadHours - totalPackageHours)
    } else {
      const hoursBeforeMidnight = minutesToHours(midnightMins - arrivalMins!)
      waiting_time_hours_before_midnight = Math.max(0, hoursBeforeMidnight - totalPackageHours)
      waiting_time_hours_after_midnight = minutesToHours(loadOutAdjusted - midnightMins)
      performance_hours_after_midnight = waiting_time_hours_after_midnight
    }
  }

  // --- Base performance fee ---
  const base_performance_fee = sum_musician_fees * set_multiplier * settings.business_margin

  // --- PA costs (top-level audit summary) ---
  const primaryBandSize = inputs.band_sizes?.[0] ?? inputs.band_size ?? null
  const isLargeEnoughForPA = isQuartetOrLarger(primaryBandSize)
  const pa_hire_cost = isLargeEnoughForPA && !inputs.client_provides_pa
    ? settings.pa_sound_engineer_rate : 0
  const pa_deduction = inputs.client_provides_pa && isLargeEnoughForPA
    ? (settings.pa_deduction_extended_background_pa ?? 0) : 0
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
  // Travel time fee: applies automatically when journey is over 2h from London (calculated from postcode)
  const travel_hours = inputs.travel_hours_from_london ?? 0
  const travel_time_rate_per_person = travel_hours > 2
    ? settings.additional_driving_rate * travel_hours : 0

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
  const total_travel_time_cost = travel_time_rate_per_person * musician_count

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
    total_travel_time_cost +
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

  // --- Price matrix ---
  const SET_MULTIPLIER_MAP: Record<SetConfig, number> = {
    '1x60': settings.set_multiplier_2x45,
    '2x45': settings.set_multiplier_2x45,
    '3x45': settings.set_multiplier_3x45,
    '4x45': settings.set_multiplier_4x45,
    '5x45': settings.set_multiplier_5x45,
  }

  // Helper: compute total travel cost for a given person count
  function computeTravelCost(person_count: number): number {
    let cost = 0
    // Travel time fee (UK gigs over 2h from London)
    cost += travel_time_rate_per_person * person_count
    if (is_overnight) {
      cost += inputs.petrol_train_cost * person_count
      cost += inputs.accommodation_cost * person_count * inputs.accommodation_nights
      cost += inputs.per_diem_rate * person_count * inputs.performance_days
    }
    if (inputs.travel_days > 0) cost += inputs.travel_day_rate * person_count * inputs.travel_days
    if (inputs.off_days > 0) cost += inputs.off_day_rate * person_count * inputs.off_days
    if (is_international) {
      cost += (inputs.flight_cost * person_count) + (inputs.baggage_fee * inputs.carry_on_items_required)
      cost += inputs.outgoing_uk_transfer_cost * person_count
      cost += inputs.outgoing_dest_transfer_cost * person_count
      cost += inputs.return_dest_transfer_cost * person_count
      cost += inputs.return_uk_transfer_cost * person_count
      cost += inputs.local_transport_cost * person_count
      cost += inputs.visa_cost * person_count
      cost += inputs.vaccinations_cost * person_count
      cost += (inputs.car_hire_cost ?? 0)
      cost += (inputs.instrument_carriage_cost ?? 0)
    }
    return cost
  }

  // fixed_costs_total = everything except base_performance_fee, using primary musician count
  const fixed_costs_total =
    pa_hire_cost + pa_deduction + pa_hire_before_midnight_cost + pa_hire_after_midnight_cost +
    add_ons_total + waiting_time_cost + band_hours_after_midnight_cost + location_surcharge +
    total_travel_time_cost +
    total_petrol_train_cost + total_accommodation_cost + total_per_diem_cost +
    total_travel_day_cost + total_off_day_cost + total_flights_cost +
    total_outgoing_uk_transfer_cost + total_outgoing_dest_transfer_cost +
    total_return_dest_transfer_cost + total_return_uk_transfer_cost +
    total_local_transport_cost + total_visa_cost + total_vaccinations_cost +
    (is_international ? inputs.car_hire_cost ?? 0 : 0) +
    (is_international ? inputs.instrument_carriage_cost ?? 0 : 0)

  // Active booking types — new field with legacy fallback
  const activeBookingTypes: BookingType[] = inputs.booking_types?.length
    ? inputs.booking_types
    : (inputs.booking_type ? [inputs.booking_type] : ['background' as BookingType])

  const DANCING_OVER_40_EXCLUDED_SIZES = new Set<BandSize>(['duo', 'trio'])
  const EXTENDED_BG_PA_SIZES = new Set<BandSize>(['quartet', 'five_piece', 'six_piece'])

  const price_options: PriceOption[] = []

  for (const bookingType of activeBookingTypes) {
    const isDancingOver40 = bookingType === 'dancing_over_40'
    const bandType: BandType = inputs.band_types_by_type?.[bookingType] ?? inputs.band_type ?? 'electric'

    const rawSizes: BandSize[] = inputs.band_sizes_by_type?.[bookingType]?.length
      ? inputs.band_sizes_by_type[bookingType]!
      : (inputs.band_sizes?.length ? inputs.band_sizes : (inputs.band_size ? [inputs.band_size] : ['quartet' as BandSize]))

    const rawConfigs: SetConfig[] = inputs.set_configs_by_type?.[bookingType]?.length
      ? inputs.set_configs_by_type[bookingType]!
      : (inputs.set_configs?.length ? inputs.set_configs : (inputs.set_config ? [inputs.set_config] : ['3x45' as SetConfig]))

    const filteredSizes = isDancingOver40
      ? rawSizes.filter(s => !DANCING_OVER_40_EXCLUDED_SIZES.has(s))
      : rawSizes

    const orderedSizes = BAND_SIZES_ORDERED.filter(s => filteredSizes.includes(s))

    for (const size of orderedSizes) {
      const count = getMusicianCount(bandType, size)
      if (count === 0) continue
      const sumFees = getSumFees(inputs, bandType, size)
      const lineUp = LINE_UP_LABELS[bandType]?.[size] ?? ''

      const is_large_enough = isQuartetOrLarger(size)

      // PA classification
      const has_extended_background_pa = (bookingType === 'background' || bookingType === 'dancing_under_40')
        && EXTENDED_BG_PA_SIZES.has(size)

      const needsEngineer = bookingType === 'dancing_over_40' || bookingType === 'wedding'
      const has_extended_pa_engineer = needsEngineer && is_large_enough && !inputs.client_provides_pa

      // Sound engineer travels with the band
      const travel_person_count = has_extended_pa_engineer ? count + 1 : count

      // PA cost
      const opt_pa_cost = has_extended_pa_engineer ? settings.pa_sound_engineer_rate : 0

      // PA deduction when client provides PA
      const opt_pa_deduction = inputs.client_provides_pa
        ? (is_large_enough
            ? (settings.pa_deduction_extended_background_pa ?? 0)
            : (settings.pa_deduction_background_pa ?? 0))
        : 0

      // Per-option travel
      const opt_travel = computeTravelCost(travel_person_count)

      const SET_CONFIG_ORDER: SetConfig[] = ['1x60', '2x45', '3x45', '4x45', '5x45']
      const orderedConfigs = SET_CONFIG_ORDER.filter(cfg => rawConfigs.includes(cfg))
      for (const cfg of orderedConfigs) {
        const mult = SET_MULTIPLIER_MAP[cfg]
        const perf_fee = sumFees * mult * settings.business_margin

        // Per-option waiting time:
        // total_package_hours = this option's package hours + pre_start_time
        // waiting = max(0, (load_out − arrival) − total_package_hours)
        const opt_package_hours = packageHoursMap[cfg]
        const opt_pre_start = has_extended_pa_engineer ? PRE_START_PA_ENGINEER : PRE_START_STANDARD
        const opt_total_package_hours = opt_package_hours + opt_pre_start
        let opt_waiting_before = 0, opt_waiting_after = 0
        if (hasWaitingTimes) {
          const totalLoadHours = minutesToHours(loadOutAdjusted - arrivalMins!)
          if (loadOutAdjusted <= midnightMins) {
            opt_waiting_before = Math.max(0, totalLoadHours - opt_total_package_hours)
          } else {
            const hoursBeforeMidnight = minutesToHours(midnightMins - arrivalMins!)
            opt_waiting_before = Math.max(0, hoursBeforeMidnight - opt_total_package_hours)
            opt_waiting_after = minutesToHours(loadOutAdjusted - midnightMins)
          }
        }
        const opt_band_after_midnight = opt_waiting_after * settings.band_after_midnight_rate * count
        const opt_waiting = opt_waiting_before * settings.waiting_time_rate_before_midnight * count
          + opt_waiting_after * settings.waiting_time_rate_after_midnight * count

        // Per-option add-ons
        const opt_add_ons = (inputs.selected_add_ons ?? []).reduce((sum, addon) => {
          return sum + (addon.pricing_type === 'per_musician' ? addon.price * count : addon.price)
        }, 0)

        const opt_waiting_total = opt_waiting + opt_band_after_midnight

        const total = perf_fee
          + opt_pa_cost + opt_pa_deduction
          + pa_hire_before_midnight_cost + pa_hire_after_midnight_cost
          + opt_waiting_total
          + location_surcharge
          + opt_add_ons
          + opt_travel

        const standard_total = total - opt_waiting_total

        price_options.push({
          booking_type: bookingType,
          band_size: size,
          set_config: cfg,
          musician_count: count,
          travel_person_count,
          has_extended_background_pa,
          has_extended_pa_engineer,
          sum_musician_fees: sumFees,
          performance_fee: perf_fee,
          pa_cost: opt_pa_cost + opt_pa_deduction,
          travel_cost: opt_travel,
          total_price: total,
          standard_total_price: standard_total,
          waiting_cost: opt_waiting_total,
          line_up: lineUp,
        })
      }
    }
  }

  // --- Multi-day ---
  const single_day_fee = total_fee
  const full_engagement_fee = inputs.is_multi_day && inputs.number_of_days > 1
    ? single_day_fee * inputs.number_of_days * (1 - inputs.per_day_discount)
    : single_day_fee
  const per_day_saving = inputs.is_multi_day && inputs.number_of_days > 1
    ? single_day_fee - (full_engagement_fee / inputs.number_of_days)
    : 0

  return {
    musician_count, sum_musician_fees, set_multiplier, package_hours, pre_start_time, total_hours,
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
    price_options, fixed_costs_total,
  }
}

export function quoteValidityText(eventDate: string | null, isInternational: boolean): string {
  const daysUntil = eventDate
    ? Math.ceil((new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  if (isInternational) {
    const days = daysUntil !== null && daysUntil <= 45 ? 7 : 14
    return `This quote is valid for ${days} days. After this time the main pricing variation may be due to flight and accommodation availability.`
  }
  if (daysUntil !== null && daysUntil <= 7) return 'This quote is valid for 24 hours.'
  if (daysUntil !== null && daysUntil <= 30) return 'This quote is valid for 7 days.'
  return 'This quote is valid for 30 days.'
}

export const DEFAULT_SETTINGS: Settings = {
  business_margin: 1.30,
  pa_sound_engineer_rate: 1000,
  pa_deduction_background_pa: -50,
  pa_deduction_extended_background_pa: -100,
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
