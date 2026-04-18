export type BookingType = 'background' | 'dancing_under_40' | 'dancing_over_40' | 'wedding'
export type TravelType = 'london_based' | 'uk' | 'domestic_overnight' | 'international'
export type SetConfig = '2x45' | '3x45' | '4x45' | '5x45'
export type BandSize = 'duo' | 'trio' | 'quartet' | 'five_piece' | 'six_piece' | 'seven_piece' | 'eight_piece'
export type BandType = 'electric' | 'acoustic' | 'roaming' | 'jazz_keys' | 'jazz_guitar'
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
  booking_type: BookingType | null         // legacy single value
  booking_types: BookingType[]             // multi-type (new)
  travel_type: TravelType | null
  is_multi_day: boolean
  number_of_days: number

  // Step 2 — Time
  start_time: string | null
  finish_time: string | null
  arrival_time: string | null
  load_out_time: string | null

  // Step 2 — Band
  band_size: BandSize | null
  set_config: SetConfig | null
  band_sizes: BandSize[]                   // legacy shared
  set_configs: SetConfig[]                 // legacy shared
  band_sizes_by_type: Partial<Record<BookingType, BandSize[]>>   // per-type (new)
  set_configs_by_type: Partial<Record<BookingType, SetConfig[]>> // per-type (new)
  band_types_by_type: Partial<Record<BookingType, BandType>>     // per-type (new)
  band_type: BandType | null

  // Event / request info (from email extraction or manual entry)
  location: string | null
  band_size_requested: string | null
  sets_requested: string | null

  // Checkbox states — saved so quote page can read them directly
  is_custom_arrival_time: boolean
  is_load_out_at_finish: boolean

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

  // Travel
  travel_hours_from_london: number          // one-way hours; drives travel time fee when > 2h

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
  venue_name_tbc: boolean
  event_date: string | null
  agency_name: string | null
  agent_name: string | null
  client_email: string | null
}

export interface Settings {
  business_margin: number
  pa_sound_engineer_rate: number
  pa_deduction_background_pa: number          // duo / trio — client provides PA (Background PA)
  pa_deduction_extended_background_pa: number // quartet / five / six — client provides PA (Extended Background PA)
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

export interface PriceOption {
  booking_type: BookingType
  band_size: BandSize
  set_config: SetConfig
  musician_count: number
  travel_person_count: number
  has_extended_background_pa: boolean   // background + quartet/five/six — no extra cost to client
  has_extended_pa_engineer: boolean     // dancing/wedding + quartet+ + client not providing PA — costs pa_sound_engineer_rate
  sum_musician_fees: number
  performance_fee: number
  pa_cost: number
  travel_cost: number
  total_price: number
  line_up: string
}

export interface QuoteCalculated {
  musician_count: number
  sum_musician_fees: number
  set_multiplier: number
  package_hours: number
  pre_start_time: number
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
  price_options: PriceOption[]
  fixed_costs_total: number
}

export interface RequestDetails {
  special_requirements: string | null
  sound_requirements: string | null
  band_size_requested: string | null
  sets_requested: string | null
  notes: string | null
}

export interface ContractFlag {
  field: string
  label: string
  contract_value: string
  event_value: string
}

export interface ContractData {
  parsed: Record<string, string | number | null>
  flags: ContractFlag[]
  uploaded_at: string
  file_path?: string
  file_name?: string
  file_size?: number
}

export interface EventRecord {
  id: string
  created_at: string
  agency_name: string | null
  agent_name: string | null
  agent_first_name: string | null
  agent_surname: string | null
  client_email: string | null
  is_agency: boolean
  event_date: string | null
  event_type: string | null
  venue_name: string | null
  venue_postcode: string | null
  venue_address: string | null
  location: string | null
  guests: number | null
  arrival_time: string | null
  start_time: string | null
  finish_time: string | null
  load_out_time: string | null
  request_details: RequestDetails | null
  raw_email: string | null
  status: 'enquiry' | 'quoted' | 'pencil_hold' | 'client_declined' | 'cancelled' | 'confirmed_stc' | 'contracted' | 'pending' | 'confirmed'
  contract: ContractData | null
}

export interface EmailTemplate {
  id: string
  created_at: string
  updated_at: string
  name: string
  subject: string | null
  body: string
}

export interface QuoteRecord {
  id: string
  created_at: string
  inputs: QuoteInputs
  calculated: QuoteCalculated
  settings_snapshot: Settings
  is_draft?: boolean
  request_details?: RequestDetails | null
  event_id?: string | null
}
