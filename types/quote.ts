export type BookingType = 'background' | 'dancing_under_40' | 'dancing_over_40' | 'wedding'
export type TravelType = 'london' | 'uk_under_2h' | 'uk_over_2h' | 'domestic_overnight' | 'international'
export type SetConfig = '2x45' | '3x45' | '4x45' | '5x45'
export type BandSize = 'duo' | 'trio' | 'quartet' | 'five_piece' | 'six_piece' | 'seven_piece' | 'eight_piece'
export type PricingType = 'fixed' | 'per_musician'

export interface AddOn {
  id: string
  name: string
  description: string | null
  pricing_type: PricingType
  default_price: number
  price_editable: boolean
  line_item_label: string
  inclusion_text: string | null
  requirement_text: string | null
  sort_order: number
  is_active: boolean
}

export interface SelectedAddOn {
  id: string
  name: string
  pricing_type: PricingType
  price: number
  line_item_label: string
  inclusion_text: string | null
  requirement_text: string | null
}

export interface QuoteInputs {
  // Step 1
  booking_type: BookingType | null
  travel_type: TravelType | null
  is_multi_day: boolean
  number_of_days: number

  // Step 2 — Time
  start_time: string | null
  finish_time: string | null
  load_in_time: string | null
  load_out_time: string | null

  // Step 2 — Band
  band_size: BandSize | null
  set_config: SetConfig | null

  // Step 2 — Venue constraints
  is_boat: boolean
  is_city_centre: boolean
  is_stadium: boolean
  is_private_house: boolean
  has_secure_loading_bay: boolean
  is_no_drive_zone: boolean
  is_outdoor: boolean

  // Step 2 — Sound
  client_provides_pa: boolean
  is_powerless: boolean
  has_limiter: boolean
  is_acoustic: boolean
  client_third_party_sound: boolean
  pa_hours_before_midnight: number
  pa_hours_after_midnight: number

  // Add-ons (data-driven)
  selected_add_ons: SelectedAddOn[]
  is_prestige: boolean  // kept separate — affects rider text rendering

  // Musician fees
  singer_fee: number
  guitarist_fee: number
  drummer_fee: number
  bass_fee: number
  keys_fee: number
  sax_fee: number
  trombone_fee: number
  trumpet_fee: number
  singer_2_fee: number

  // Travel / accommodation costs (per person unless noted)
  petrol_train_cost: number
  accommodation_cost: number
  accommodation_nights: number
  per_diem_rate: number
  performance_days: number
  travel_day_rate: number
  travel_days: number
  off_day_rate: number
  off_days: number
  flight_cost: number
  baggage_fee: number
  carry_on_items_required: number
  outgoing_uk_transfer_cost: number
  outgoing_dest_transfer_cost: number
  return_dest_transfer_cost: number
  return_uk_transfer_cost: number
  local_transport_cost: number
  visa_cost: number
  vaccinations_cost: number
  car_hire_cost: number
  instrument_carriage_cost: number

  // Multi-day
  per_day_discount: number

  // Venue
  venue_postcode: string | null
  venue_name: string | null
  event_date: string | null
  client_name: string | null
  client_email: string | null
}

export interface Settings {
  business_margin: number
  pa_sound_engineer_rate: number
  pa_deduction_rate: number
  pa_rate_before_midnight: number
  pa_rate_after_midnight: number
  waiting_time_rate_before_midnight: number
  waiting_time_rate_after_midnight: number
  band_after_midnight_rate: number
  additional_driving_rate: number
  solo_rate_multiple: number
  location_surcharge_boat: number
  location_surcharge_city: number
  location_surcharge_stadium: number
  location_surcharge_house: number
  location_surcharge_no_drive: number
  set_multiplier_2x45: number
  set_multiplier_3x45: number
  set_multiplier_4x45: number
  set_multiplier_5x45: number
}

export interface QuoteCalculated {
  musician_count: number
  sum_musician_fees: number
  set_multiplier: number
  package_hours: number
  total_hours: number
  waiting_time_hours_before_midnight: number
  waiting_time_hours_after_midnight: number
  performance_hours_after_midnight: number
  base_performance_fee: number
  pa_hire_cost: number
  pa_deduction: number
  pa_hire_before_midnight_cost: number
  pa_hire_after_midnight_cost: number
  add_ons_total: number
  waiting_time_cost_before_midnight: number
  waiting_time_cost_after_midnight: number
  waiting_time_cost: number
  band_hours_after_midnight_cost: number
  location_surcharge: number
  total_petrol_train_cost: number
  total_accommodation_cost: number
  total_per_diem_cost: number
  total_travel_day_cost: number
  total_off_day_cost: number
  total_baggage_fees: number
  total_flights_cost: number
  total_outgoing_uk_transfer_cost: number
  total_outgoing_dest_transfer_cost: number
  total_return_dest_transfer_cost: number
  total_return_uk_transfer_cost: number
  total_local_transport_cost: number
  total_visa_cost: number
  total_vaccinations_cost: number
  total_fee: number
  single_day_fee: number
  full_engagement_fee: number
  per_day_saving: number
}

export interface QuoteRecord {
  id: string
  created_at: string
  inputs: QuoteInputs
  calculated: QuoteCalculated
  settings_snapshot: Settings
}
