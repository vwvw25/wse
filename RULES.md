# WSE Quoting System — Business Rules

Last updated: 2026-04-07

This document captures all pricing logic, display rules, and quote generation behaviour built into the system. Update it whenever a rule changes.

---

## 1. Band Lineups

### Band types
- **Electric** — standard full-band setup with drums
- **Acoustic** — same as electric but without amplified sound
- **Roaming** — portable, no drum kit, upright bass
- **Jazz (keys)** — jazz with piano as lead instrument
- **Jazz (guitar)** — jazz with guitar as lead instrument

### Musician fee fields used per band type × size

| Size | Electric | Acoustic | Roaming | Jazz (keys) | Jazz (guitar) |
|---|---|---|---|---|---|
| Duo | Singer, Guitar | Singer, Guitar | — | Singer, Keys | Singer, Guitar |
| Trio | Singer, Guitar, Drums | Singer, Guitar, Drums | Singer, Guitar, Drums | Singer, Keys, Drums | Singer, Guitar, Drums |
| Quartet | Singer, Guitar, Drums, Bass | Singer, Guitar, Bass, Drums | Singer, Guitar, Bass, Drums | Singer, Keys, Bass, Drums | Singer, Guitar, Bass, Drums |
| Five piece | Singer, Guitar, Drums, Bass, Keys | Singer, Guitar, Bass, Keys, Drums | Singer, Guitar, Bass, Drums, Sax | Singer, Keys, Guitar, Bass, Drums | Singer, Guitar, Bass, Keys, Drums |
| Six piece | Singer, Guitar, Drums, Bass, Keys, Sax | Singer, Guitar, Bass, Keys, Drums, Sax | Singer, Guitar, Singer 2, Bass, Drums, Sax | Singer, Keys, Guitar, Bass, Drums, Sax | Singer, Guitar, Bass, Keys, Drums, Sax |
| Seven piece | Singer, Guitar, Drums, Bass, Keys, Sax, Trombone | — | — | — | — |
| Eight piece | Singer, Guitar, Drums, Bass, Keys, Sax, Trombone, Trumpet | — | — | — | — |

### Line-up labels shown on quote

| Size | Electric | Acoustic | Roaming | Jazz (keys) | Jazz (guitar) |
|---|---|---|---|---|---|
| Duo | Vocals, Guitar | Vocals, Guitar | — | Vocals, Piano | Vocals, Guitar |
| Trio | Vocals, Guitar, Drums | Vocals, Guitar, Drums or Bass | Vocals, Guitar, Drums | Vocals, Piano, Drums or Upright Bass | Vocals, Guitar, Drums or Upright Bass |
| Quartet | Vocals, Guitar, Bass, Drums | Vocals, Guitar, Bass, Drums | Vocals, Guitar, Upright Bass, Drums | Vocals, Piano, Upright Bass, Drums | Vocals, Guitar, Upright Bass, Drums |
| Five piece | Vocals, Guitar, Bass, Keys, Drums | Vocals, Guitar, Bass, Keys, Drums | Vocals, Guitar, Upright Bass, Drums, Sax | Vocals, Piano, Guitar, Upright Bass, Drums | Vocals, Guitar, Piano, Upright Bass, Drums |
| Six piece | Vocals, Guitar, Bass, Keys, Drums, Sax | Vocals, Guitar, Bass, Keys, Drums, Sax | Vocals, Guitar 1, Guitar 2, Upright Bass, Drums, Sax | Vocals, Piano, Guitar, Sax, Upright Bass, Drums | Vocals, Guitar, Piano, Sax, Upright Bass, Drums |
| Seven piece | Vocals, Guitar, Bass, Keys, Drums, Sax, Trumpet | — | — | — | — |
| Eight piece | Vocals, Guitar, Bass, Keys, Drums, Sax, Trumpet, Trombone | — | — | — | — |

---

## 2. Pricing Calculations

### Performance fee
```
performance_fee = sum_of_musician_fees × set_multiplier × business_margin
```
- Musician fees: any fee field > 0 counts as active. Sum of all active fees.
- Set multiplier: configurable in settings. Defaults: 2×45 = 1.00, 3×45 = 1.30, 4×45 = 1.60, 5×45 = 2.00
- Business margin: configurable in settings. Default: 1.30 (i.e. 30%)

### Package hours (included in price, no waiting time charged)
| Set config | Package hours | Pre-start (load-in) |
|---|---|---|
| 2×45 | 3h | 1h (1.5h if sound engineer) |
| 3×45 | 4h | 1h (1.5h if sound engineer) |
| 4×45 | 6h | 1h (1.5h if sound engineer) |
| 5×45 | 8h | 1h (1.5h if sound engineer) |

### Waiting time
Waiting time = total time on site (arrival → load-out) minus the included package hours.

- **Before midnight:** charged at waiting_time_rate_before_midnight × musician_count. Default: £40/h/person
- **After midnight:** charged at waiting_time_rate_after_midnight × musician_count. Default: £100/h/person
- Any performance time after midnight also incurs the band_after_midnight_rate. Default: £100/h/person

Waiting time is calculated per option (each band size × set config combination gets its own waiting time, since package hours differ).

### PA costs

**Background / Dancing under 40 guests:**
- Duo or trio: no PA cost (client provides or not needed)
- Quartet, five, six piece: "Extended Background PA" included — no extra charge to client, no sound engineer

**Dancing over 40 guests / Wedding:**
- Duo or trio: no PA cost
- Quartet or larger + client NOT providing PA: full Extended PA + Sound Engineer charged at pa_sound_engineer_rate. Default: £1,000. Sound engineer also counts as a travel person.
- Quartet or larger + client providing PA: PA deduction applied (negative cost). Extended deduction: default −£100

**Client provides PA:**
- Duo/trio: small PA deduction (background_pa deduction). Default: −£50
- Quartet or larger: extended PA deduction. Default: −£100

**PA hire by the hour (if applicable):**
- Before midnight: pa_rate_before_midnight × hours. Default: £50/h
- After midnight: pa_rate_after_midnight × hours. Default: £75/h

### Location surcharges
Applied as a flat addition to the total. All configurable in settings (all default to £0):
- Boat
- City centre
- Stadium
- Private house
- No-drive zone

Only one surcharge applies (first matching condition in the order above).

### Travel costs

**Travel type: London-based** — no travel costs added.

**Travel type: UK (not overnight)** — no petrol/train/accommodation added, but travel time fee may apply (see below).

**Travel type: Domestic overnight** — petrol/train + accommodation + per diem added, multiplied by musician count.
- Petrol / train: £X per person
- Accommodation: £X per person × number of nights
- Per diem: £X per person × number of performance days

**Travel type: International** — all domestic overnight costs plus:
- Flights: flight_cost × musician_count + baggage_fee × carry-on items
- Transfers: outgoing UK, outgoing destination, return destination, return UK — each × travel_person_count
- Local transport × travel_person_count
- Visas × travel_person_count
- Vaccinations × travel_person_count
- Car hire (flat total)
- Instrument carriage (flat total)

**Travel time fee (all UK gigs):**
- Only applies if travel_hours_from_london > 2
- Cost = additional_driving_rate × travel_hours × musician_count
- Default additional_driving_rate: £0 (i.e. currently inactive)

**Travel person count:**
- Normally = musician_count
- For Dancing/Wedding + quartet or larger + client not providing PA: musician_count + 1 (sound engineer travels too)

### Add-ons
Two pricing types:
- **Fixed:** flat price regardless of band size
- **Per musician:** price × musician_count for each option

Add-ons are recalculated per option using that option's musician_count (which varies by band size).

### Multi-day discount
```
full_engagement_fee = single_day_fee × number_of_days × (1 − per_day_discount)
per_day_saving = single_day_fee − (full_engagement_fee / number_of_days)
```
Only applies when is_multi_day is true and number_of_days > 1.

### Total fee composition
```
total = performance_fee
      + pa_cost (or pa_deduction)
      + pa_hire_before_midnight
      + pa_hire_after_midnight
      + waiting_time_cost
      + band_after_midnight_cost
      + location_surcharge
      + add_ons_total
      + travel_time_fee
      + all travel/accommodation costs
```

---

## 3. Quote Validity

| Condition | Validity text |
|---|---|
| International, event ≤ 45 days away | "This quote is valid for 7 days. After this time the main pricing variation may be due to flight and accommodation availability." |
| International, event > 45 days away | "This quote is valid for 14 days. After this time the main pricing variation may be due to flight and accommodation availability." |
| Event ≤ 7 days away | "This quote is valid for 24 hours." |
| Event ≤ 30 days away | "This quote is valid for 7 days." |
| All other cases | "This quote is valid for 30 days." |

International takes precedence over date-based rules. Days are calculated from the time the quote is viewed, not when it was created.

---

## 4. What's Included — Display Rules

These items appear in the "What's included" section on the quote. Each only shows when its condition is true.

| Item | Shows when |
|---|---|
| Background PA | Not extended PA + sound engineer, client NOT providing PA, booking type is Background or Dancing under 40 |
| Extended PA + sound engineer | Any option in this booking type has extended PA + sound engineer |
| Based on a finish of 11pm or earlier | No finish time provided |
| Music via iPad/PA during intervals | Not acoustic, not roaming, client not providing PA, no "Roaming set" add-on |
| Arrival one hour before performance start (1.5hrs if Extended PA + sound engineer) | Arrival time is NOT custom AND load-out does NOT differ from finish |
| Arrival: [time] | Arrival time is custom (manually overridden from the default start − 1h) |
| Start: [time] | Start time is provided |
| Finish: [time] | Finish time is provided |
| Load out: [time] | Load-out time is provided AND differs from finish time |
| Petrol / train travel | Domestic overnight or international, petrol/train cost > 0 |
| Accommodation (N nights) | Domestic overnight or international, accommodation cost > 0 |
| Per diem | Domestic overnight or international, per diem rate > 0 |
| Flights | International |
| Airport transfers | International, outgoing UK or destination transfer cost > 0 |
| Local transport | International, local transport cost > 0 |
| Visa costs | International, visa cost > 0 |
| If dancing and 40+ guests — book quartet or larger | Booking type is Dancing over 40 or Wedding |
| Does not include client use of mic… | Mic hire add-on NOT selected |
| Includes mic hire for use during agreed performance times… | Mic hire add-on IS selected |
| [Add-on inclusion text] | Add-on is selected and has inclusion_text set |

---

## 5. Requirements — Display Rules

Items appear in the "Requirements" section. The rider item always appears first when applicable.

| Item | Shows when |
|---|---|
| Client to provide full rider (link to Google Drive folder) | International OR client provides PA is ticked — **always shown first** |
| 2 × 13amp plug sockets (with powerless caveat) | NOT powerless AND NOT acoustic |
| Food clause (same menu or £20 buyout per performer) | Buyout add-on NOT selected |
| Lockable indoor exclusive green room | Always |
| Soft drinks and mineral water | Always |
| Being able to pack down at end of final set | Load-out does NOT differ from finish time |
| Full loading information required 2 weeks in advance | Always |
| Based on being able to park within 25 metres… | Always |
| If the venue isn't easily accessible by car… | Always |
| Client to hire drum kit locally if drummer is booked | International AND drummer_fee > 0 |
| Client to provide keyboard or piano on-site if pianist is booked | International AND keys_fee > 0 |
| Client to provide double bass on site if upright double bass is booked (alternatively bassist can bring electric bass) | International AND bass_fee > 0 AND band type is Roaming, Jazz (keys), or Jazz (guitar) |
| [Add-on requirement text] | Add-on is selected and has requirement_text set |

---

## 6. Booking Type Notes

### Background
- Suits events without a dance floor / no dancing expected
- Displayed with a note: "Suitable for events looking for background music, without a dance floor, where dancing isn't a key part of the event"
- Duo/trio: Background PA included (no charge)
- Quartet+: Extended Background PA included (no charge)

### Dancing under 40 guests
- Same PA rules as Background

### Dancing over 40 guests
- Duo and trio are automatically excluded from the price options
- Quartet+: Extended PA + Sound Engineer added and charged
- Displayed note: "If dancing and 40+ guests — book quartet or larger"

### Wedding
- Same rules as Dancing over 40 (duo/trio excluded, sound engineer added for quartet+)

---

## 7. Email Extraction (AI)

When an enquiry email is pasted, Claude (Haiku) extracts the following fields:

**Auto-filled directly onto the event record:**
- is_agency (true/false)
- agency_name
- agent_name (full name)
- agent_first_name
- agent_surname
- client_email (sender's email)
- event_date (YYYY-MM-DD)
- event_type (e.g. "Corporate Event", "Charity Ball", "Wedding")
- venue_name
- venue_postcode
- venue_address (full address if given)
- location (area/city when no full address)
- guests (integer)
- arrival_time (HH:MM 24hr — load-in / set-up time)
- start_time (HH:MM 24hr — performance start)
- finish_time (HH:MM 24hr — performance end)
- load_out_time (HH:MM 24hr — usually same as finish)
- booking_types (array: "background", "dancing_under_40", "dancing_over_40", "wedding")
- travel_type ("london_based", "uk", "domestic_overnight", "international")

**Stored as request details (shown for reference, not auto-filled into quote builder):**
- special_requirements (rooftop, boat, outdoor, no lift, arena, stadium, access issues)
- sound_requirements (acoustic only, db limiter, client providing PA, sound curfew)
- band_size_requested (e.g. "acoustic duo", "trio", "4 piece")
- sets_requested (e.g. "2 × 45 min", "3 sets of 45")
- notes (anything else relevant: urgency, charity rate request, specific artist request)

---

## 8. Email Template Placeholders

Auto-filled from the event record when generating an email from a template:

| Placeholder | Value |
|---|---|
| `{{agent_name}}` | Full agent name |
| `{{agent_first_name}}` | First name (from agent_first_name field, falls back to splitting agent_name) |
| `{{agent_surname}}` | Surname |
| `{{agency_name}}` | Agency name |
| `{{event_date}}` | Formatted date (e.g. "14 March 2026") |
| `{{venue_name}}` | Venue name |
| `{{location}}` | Location (falls back to venue_name if no location) |
| `{{start_time}}` | Performance start time |
| `{{finish_time}}` | Performance finish time |
| `{{guests}}` | Guest count |
| `{{event_type}}` | Event type |
| `{{name}}` / `{{NAME}}` | Alias for agent_first_name |
| `{{date}}` / `{{DATE}}` | Alias for event_date |

Any other `{{placeholder}}` in a template is prompted for manual entry when the template is used.

---

## 9. Settings (all configurable in admin)

| Setting | Default | Description |
|---|---|---|
| business_margin | 1.30 | Multiplier applied to musician fees (30% margin) |
| pa_sound_engineer_rate | £1,000 | Cost for Extended PA + sound engineer |
| pa_deduction_background_pa | −£50 | Deduction when client provides PA (duo/trio) |
| pa_deduction_extended_background_pa | −£100 | Deduction when client provides PA (quartet+) |
| pa_rate_before_midnight | £50/h | PA hire rate before midnight |
| pa_rate_after_midnight | £75/h | PA hire rate after midnight |
| waiting_time_rate_before_midnight | £40/h/person | Waiting time rate before midnight |
| waiting_time_rate_after_midnight | £100/h/person | Waiting time rate after midnight |
| band_after_midnight_rate | £100/h/person | Extra charge for performing after midnight |
| additional_driving_rate | £0/h/person | Travel time fee for journeys over 2h from London |
| set_multiplier_2x45 | 1.00 | Set multiplier for 2×45 config |
| set_multiplier_3x45 | 1.30 | Set multiplier for 3×45 config |
| set_multiplier_4x45 | 1.60 | Set multiplier for 4×45 config |
| set_multiplier_5x45 | 2.00 | Set multiplier for 5×45 config |
| location_surcharge_boat | £0 | Flat surcharge for boat venues |
| location_surcharge_city | £0 | Flat surcharge for city centre venues |
| location_surcharge_stadium | £0 | Flat surcharge for stadium venues |
| location_surcharge_house | £0 | Flat surcharge for private house venues |
| location_surcharge_no_drive | £0 | Flat surcharge for no-drive zones |
