import type { QuoteInputs, BookingType, PriceOption } from '@/types/quote'

export const RIDER_LINK = 'https://drive.google.com/drive/folders/1906sIEkcO5GTmLH395oRJuy6xtERE2QZ?usp=drive_link'

export type QuoteItem = {
  show: boolean
  text: string
  link?: { text: string; href: string }
  linkSuffix?: string
}

export function autoArrivalTime(start: string | null): string | null {
  if (!start) return null
  const [h, m] = start.split(':').map(Number)
  const mins = h * 60 + m - 60
  const hh = Math.floor(((mins % 1440) + 1440) % 1440 / 60)
  const mm = ((mins % 1440) + 1440) % 1440 % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

const fmt = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`

export function getQuoteItems(
  inputs: QuoteInputs,
  bt: BookingType,
  allBookingTypes: BookingType[],
  btOptions: PriceOption[],
  paEngineerRate = 0,
): { inclusions: QuoteItem[]; requirements: QuoteItem[] } {
  const isInternational = inputs.travel_type === 'international'
  const isDomesticOvernight = inputs.travel_type === 'domestic_overnight' || isInternational
  const loadOutDiffersFromFinish = !!inputs.load_out_time && !!inputs.finish_time && inputs.load_out_time !== inputs.finish_time
  const isCustomArrival = inputs.is_custom_arrival_time === true
    || (inputs.is_custom_arrival_time == null && !!inputs.arrival_time && inputs.arrival_time !== autoArrivalTime(inputs.start_time))
  const showSpecificTimes = isCustomArrival || loadOutDiffersFromFinish
  const hasBuyout = (inputs.selected_add_ons ?? []).some(a => a.name.toLowerCase().includes('buyout'))
  const hasMicHire = (inputs.selected_add_ons ?? []).some(a => a.name.toLowerCase().includes('mic hire'))

  const hasExtendedPaEngineer = btOptions.some(o => o.has_extended_pa_engineer)
  const hasExtendedBackgroundPA = !inputs.client_provides_pa
    && (bt === 'background' || bt === 'dancing_under_40')
    && btOptions.some(o => o.has_extended_background_pa)
  const hasRegularBackgroundPA = !hasExtendedPaEngineer && !inputs.client_provides_pa
    && (bt === 'background' || bt === 'dancing_under_40')
    && btOptions.some(o => !o.has_extended_background_pa && !o.has_extended_pa_engineer)
  const hasBackgroundInQuote = allBookingTypes.some(t => t === 'background' || t === 'dancing_under_40')

  const btBandType = (inputs.band_types_by_type as Record<string, string> | undefined)?.[bt] ?? inputs.band_type ?? 'electric'
  const isRoaming = btBandType === 'roaming'
  const showIpadMusic = !inputs.is_acoustic && !isRoaming && !inputs.client_provides_pa
    && !(inputs.selected_add_ons ?? []).some(a => a.name === 'Roaming set')

  const paNote: QuoteItem | null = hasExtendedPaEngineer
    ? {
        show: true,
        text: hasBackgroundInQuote
          ? 'If client is providing PA use background pricing and riders can be found '
          : 'If client is providing PA please ask for a requote as this will significantly lower the price. Riders can be found ',
        link: { text: 'here', href: RIDER_LINK },
      }
    : (hasRegularBackgroundPA || hasExtendedBackgroundPA)
      ? { show: true, text: 'If client is providing PA please ask for a requote as this will reduce the price. Riders can be found ', link: { text: 'here', href: RIDER_LINK } }
      : null

  const rawInclusions: QuoteItem[] = [
    { show: hasRegularBackgroundPA, text: 'Background PA' },
    { show: false, text: 'Extended Background PA' },
    { show: hasExtendedPaEngineer, text: 'Extended PA + sound engineer' },
    { show: bt === 'background' && !inputs.client_provides_pa && paEngineerRate > 0, text: `If dancefloor focus with more than 40 guests, full PA + sound engineer required — add ${fmt(paEngineerRate)}` },
    { show: !inputs.finish_time, text: 'Based on a finish of 11pm or earlier' },
    { show: showIpadMusic, text: 'Music via iPad/PA during intervals' },
    { show: !showSpecificTimes, text: 'Arrival one hour before performance start (1.5hrs if Extended PA + sound engineer)' },
    { show: !!inputs.is_load_out_at_finish, text: 'Based on being able to load out at finish time' },
    { show: isDomesticOvernight && (inputs.petrol_train_cost ?? 0) > 0, text: 'Petrol / train travel' },
    { show: isDomesticOvernight && (inputs.accommodation_cost ?? 0) > 0, text: `Accommodation (${inputs.accommodation_nights ?? 1} night${(inputs.accommodation_nights ?? 1) !== 1 ? 's' : ''})` },
    { show: isDomesticOvernight && (inputs.per_diem_rate ?? 0) > 0, text: 'Per diem' },
    { show: isInternational, text: 'Flights' },
    { show: isInternational && ((inputs.outgoing_uk_transfer_cost ?? 0) + (inputs.outgoing_dest_transfer_cost ?? 0)) > 0, text: 'Airport transfers' },
    { show: isInternational && (inputs.local_transport_cost ?? 0) > 0, text: 'Local transport' },
    { show: isInternational && (inputs.visa_cost ?? 0) > 0, text: 'Visa costs' },
    { show: !hasMicHire, text: 'Does not include client use of mic — please book mic hire option if client requires a mic for speeches' },
    { show: hasMicHire, text: 'Includes mic hire for use during agreed performance times (i.e. not during break)' },
  ]

  // Inject paNote immediately after the last visible PA-type item
  const paItems = new Set(['Background PA', 'Extended Background PA', 'Extended PA + sound engineer'])
  const inclusions: QuoteItem[] = []
  if (paNote) {
    let lastPaIdx = -1
    rawInclusions.forEach((item, i) => { if (item.show && paItems.has(item.text)) lastPaIdx = i })
    rawInclusions.forEach((item, i) => {
      inclusions.push(item)
      if (i === lastPaIdx) inclusions.push(paNote)
    })
  } else {
    inclusions.push(...rawInclusions)
  }

  const requirements: QuoteItem[] = [
    { show: isInternational || !!inputs.client_provides_pa, text: 'Client to provide full rider (for riders please see ', link: { text: 'this folder', href: RIDER_LINK }, linkSuffix: ')' },
    { show: !inputs.is_powerless && !inputs.is_acoustic, text: '2 x 13amp plug sockets (although powerless set-ups can be provided — please ask for a quote)' },
    { show: !hasBuyout, text: 'For bookings of 2×45 or more the following needs to be stated on the contract: same main choices as guests, choice from a menu or a buyout of £20 per performer' },
    { show: true, text: 'A lockable, indoor green room that is exclusive to the band and not shared with any other artists, suppliers or staff' },
    { show: true, text: 'Soft drinks and mineral water' },
    { show: !loadOutDiffersFromFinish, text: 'Being able to pack down/load out at the end of the final set' },
    { show: true, text: 'Full loading information required 2 weeks in advance' },
    { show: true, text: 'Based on being able to park within 25 metres of an entrance to load. Please advise of any loading restrictions at the venue' },
    { show: true, text: "If the venue isn't easily accessible by car then this may impact the quote and the equipment we're able to supply" },
    { show: isInternational && (inputs.drummer_fee ?? 0) > 0, text: 'Client to hire drum kit locally if drummer is booked' },
    { show: isInternational && (inputs.keys_fee ?? 0) > 0, text: 'Client to provide keyboard or piano on-site if pianist is booked' },
    { show: isInternational && (inputs.bass_fee ?? 0) > 0 && ['roaming', 'jazz_keys', 'jazz_guitar'].includes(btBandType), text: 'Client to provide double bass on site if upright double bass is booked (alternatively bassist can bring electric bass)' },
  ]

  return { inclusions, requirements }
}
