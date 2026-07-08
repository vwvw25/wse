import { createServiceClient } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { EventRecord, QuoteRecord } from '@/types/quote'
import type { EventMusician, Musician, BandTemplate, BandTemplateSlot } from '@/types/musicians'
import { musicianFullName } from '@/types/musicians'
import type { Invoice, InvoiceLineItem, InvoiceSettings, Client } from '@/types/invoice'
import StatusSelect from '../StatusSelect'
import EventMusiciansClient from './musicians/EventMusiciansClient'
import CopyEventDetailsButton from './CopyEventDetailsButton'
import ContractSection from './ContractSection'
import BookingDetailsSection from './BookingDetailsSection'
import InvoiceSection from './InvoiceSection'
import ClientLinkSection from './ClientLinkSection'
import EventQuotesClient from './EventQuotesClient'
import RequestsSection from './RequestsSection'
import CommentsSection from './CommentsSection'
import CalendarNotesSection from './CalendarNotesSection'
import TravelDetailsForm from './TravelDetailsForm'
import JourneyDetailsCard from './JourneyDetailsCard'
import TravelExpensesTable from './TravelExpensesTable'
import type { TravelExpense } from '@/types/travel'
import SetListEditor from '@/app/admin/set-lists/[id]/SetListEditor'
import type { EventRequest } from '@/types/event-request'
import type { SetList, SetListSong, Song, TagOption } from '@/types/set-list'

function ordinalDay(n: number): string {
  const v = n % 100
  const s = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'
  return `${n}${s}`
}

function formatOrdinalDate(d: string): string {
  const dt = new Date(d)
  const day = dt.getUTCDate()
  const month = dt.toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' })
  const year = dt.getUTCFullYear()
  return `${ordinalDay(day)} ${month} ${year}`
}

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCreated(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function resolveDressCode(
  dressCode: string | null | undefined,
  template: { name: string; description: string | null } | null | undefined
): string | null {
  if (dressCode) return dressCode
  if (template) return template.description ? `${template.name} — ${template.description}` : template.name
  return null
}

function Cell({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? 'var(--text)' : 'var(--text-tertiary)' }}>{value || '—'}</div>
    </div>
  )
}

function FullRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{value}</div>
    </div>
  )
}

type Tab = 'information' | 'musicians' | 'quotes' | 'requests' | 'set-lists' | 'contract' | 'invoices' | 'calendar' | 'travel' | 'activity' | 'comments'

type ActivityEntry = {
  id: string
  type: string
  field: string | null
  field_label: string | null
  old_value: string | null
  new_value: string | null
  summary: string | null
  note: string | null
  actor: string
  source: string
  changed_at: string
}

const ACTIVITY_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'communication', label: 'Communication' },
  { value: 'field_change', label: 'Field changes' },
  { value: 'status_change', label: 'Status' },
  { value: 'musician_change', label: 'Musicians' },
  { value: 'quote_change', label: 'Quotes' },
  { value: 'invoice_change', label: 'Invoices' },
  { value: 'request_change', label: 'Requests' },
  { value: 'set_list_change', label: 'Set lists' },
  { value: 'contract_change', label: 'Contract' },
  { value: 'comment', label: 'Comments' },
]

const ACTIVITY_TYPE_META: Record<string, { label: string; bg: string; color: string }> = {
  field_change: { label: 'Field change', bg: 'var(--pill-enquiry-bg)', color: 'var(--pill-enquiry-text)' },
  status_change: { label: 'Status', bg: 'var(--pill-stc-bg)', color: 'var(--pill-stc-text)' },
  musician_change: { label: 'Musicians', bg: 'var(--pill-quoted-bg)', color: 'var(--pill-quoted-text)' },
  quote_change: { label: 'Quote', bg: 'var(--pill-contracted-bg)', color: 'var(--pill-contracted-text)' },
  invoice_change: { label: 'Invoice', bg: 'var(--pill-paid-bg)', color: 'var(--pill-paid-text)' },
  request_change: { label: 'Request', bg: 'var(--pill-outstanding-bg)', color: 'var(--pill-outstanding-text)' },
  set_list_change: { label: 'Set list', bg: 'var(--pill-uninvoiced-bg)', color: 'var(--pill-uninvoiced-text)' },
  contract_change: { label: 'Contract', bg: 'var(--pill-contract-received-bg)', color: 'var(--pill-contract-received-text)' },
  ai_agent_action: { label: 'Agent', bg: 'var(--pill-cancelled-bg)', color: 'var(--pill-cancelled-text)' },
  comment: { label: 'Comment', bg: 'var(--pill-enquiry-bg)', color: 'var(--pill-enquiry-text)' },
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; activityType?: string }>
}) {
  const { id } = await params
  const { tab: tabParam, activityType: activityTypeParam } = await searchParams
  const tab: Tab = tabParam === 'musicians' ? 'musicians' : tabParam === 'quotes' ? 'quotes' : tabParam === 'requests' ? 'requests' : tabParam === 'set-lists' ? 'set-lists' : tabParam === 'contract' ? 'contract' : tabParam === 'invoices' ? 'invoices' : tabParam === 'calendar' ? 'calendar' : tabParam === 'travel' ? 'travel' : tabParam === 'activity' ? 'activity' : tabParam === 'comments' ? 'comments' : 'information'
  const activityType = activityTypeParam ?? 'all'

  const supabase = createServiceClient()

  const [{ data: eventData }, { data: quotesData }, { data: invoicesData }, { data: invoiceSettingsData }, { data: allClientsData }, { data: monitoringData }] = await Promise.all([
    supabase.from('events').select('*, booked_template:band_templates!booked_band_template_id(name), dress_code_template:dress_code_templates!dress_code_template_id(name, description)').eq('id', id).single(),
    supabase.from('quotes').select('id, created_at, inputs, calculated, version, status, accepted_option').eq('event_id', id).order('version', { ascending: false }),
    supabase.from('invoices').select('*, line_items:invoice_line_items(*)').eq('event_id', id).order('created_at'),
    supabase.from('invoice_settings').select('*').single(),
    supabase.from('clients').select('*').order('name'),
    supabase.from('monitoring_settings').select('reply_to_email').eq('id', 1).single(),
  ])

  if (!eventData) notFound()

  const event = eventData as EventRecord
  const quotes = (quotesData ?? []) as (Pick<QuoteRecord, 'id' | 'created_at' | 'inputs' | 'calculated'> & { version: number; status: string; accepted_option: string | null })[]
  const invoices = (invoicesData ?? []) as (Invoice & { line_items: InvoiceLineItem[] })[]
  const invoiceSettings = (invoiceSettingsData ?? null) as InvoiceSettings | null
  const allClients = (allClientsData ?? []) as Client[]
  const linkedClient = allClients.find(c => c.id === event.client_id) ?? null
  const adminEmail = (monitoringData as { reply_to_email?: string | null } | null)?.reply_to_email ?? null
  const dressCode = resolveDressCode(
    (event as unknown as { dress_code?: string | null }).dress_code,
    (event as unknown as { dress_code_template?: { name: string; description: string | null } | null }).dress_code_template
  )
  const rd = event.request_details
  const quotePrice: number | null = quotes[0]?.calculated?.total_fee ?? null

  // Prefill invoice line items from booking details
  const prefillItems: { description: string; cost: number }[] = (() => {
    const fee = event.booked_fee
    if (!fee) return []
    const parts = [event.booked_band_size, event.booked_sets].filter(Boolean)
    const description = parts.length > 0 ? parts.join(' – ') : 'Band performance'
    return [{ description, cost: fee }]
  })()

  const title = event.is_agency
    ? (event.agency_name
        ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
        : (event.agent_name ?? 'Unknown'))
    : ([event.agent_first_name, event.agent_surname].filter(Boolean).join(' ') || event.client_email || 'Direct booking')

  // Fetch musicians data when on the musicians tab
  let slots: EventMusician[] = []
  let musicians: Musician[] = []
  let templates: (BandTemplate & { slots: BandTemplateSlot[] })[] = []

  if (tab === 'musicians') {
    const [{ data: slotsData }, { data: musiciansData }, { data: templatesData }, { data: templateSlotsData }] = await Promise.all([
      supabase.from('event_musicians').select('*, invites:musician_invites(*)').eq('event_id', id).order('date_added').order('id'),
      supabase.from('musicians').select('*').order('first_name').order('last_name'),
      supabase.from('band_templates').select('*').order('name'),
      supabase.from('band_template_slots').select('*').order('sort_order'),
    ])

    slots = (slotsData ?? []) as EventMusician[]
    musicians = (musiciansData ?? []) as Musician[]
    const rawTemplates = (templatesData ?? []) as BandTemplate[]
    const templateSlots = (templateSlotsData ?? []) as BandTemplateSlot[]
    templates = rawTemplates.map(t => ({ ...t, slots: templateSlots.filter(s => s.template_id === t.id) }))

    // Enrich slots with musician data + latest invite for current musician
    slots = slots.map(s => {
      const allInvites = ((s as unknown as { invites?: import('@/types/musicians').MusicianInvite[] }).invites ?? [])
      const forCurrentMusician = s.musician_id
        ? allInvites.filter(i => i.musician_id === s.musician_id)
        : []
      const latestInvite = forCurrentMusician.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0] ?? null
      return {
        ...s,
        musician: s.musician_id ? (musicians.find(m => m.id === s.musician_id) ?? null) : null,
        latest_invite: latestInvite,
      }
    })
  }

  // Fetch set list data when on the set-lists tab (auto-create if none exists)
  let setListEditorData: {
    setList: SetList
    setListSongs: SetListSong[]
    allSongs: Song[]
    templates: { id: string; name: string }[]
    tagOptions: TagOption[]
    setListRequests: EventRequest[]
  } | null = null

  if (tab === 'set-lists') {
    // Find existing set list for this event
    const { data: existing } = await supabase
      .from('set_lists')
      .select('id')
      .eq('event_id', id)
      .eq('is_template', false)
      .order('created_at')
      .limit(1)
      .maybeSingle()

    let setListId = existing?.id

    // Auto-create if none exists
    if (!setListId) {
      const name = event.event_date ? formatOrdinalDate(event.event_date) : 'Set list'
      const { data: created } = await supabase
        .from('set_lists')
        .insert({ name, event_id: id, is_template: false })
        .select('id')
        .single()
      setListId = created?.id
    }

    if (setListId) {
      const [
        { data: slFull },
        { data: slSongs },
        { data: allSongsData },
        { data: tagOptionsData },
        { data: templatesData },
        { data: slRequestsData },
      ] = await Promise.all([
        supabase.from('set_lists').select('*, event:events(id, event_date, venue_name, start_time, finish_time, request_details)').eq('id', setListId).single(),
        supabase.from('set_list_songs').select('*, song:songs(*)').eq('set_list_id', setListId).order('set_number', { ascending: true, nullsFirst: false }).order('position', { ascending: true }),
        supabase.from('songs').select('*').order('title'),
        supabase.from('tag_options').select('*').order('category').order('sort_order'),
        supabase.from('set_lists').select('id, name').eq('is_template', true).order('name'),
        supabase.from('event_requests').select('*').eq('event_id', id).neq('status', 'declined').not('song_id', 'is', null).order('created_at'),
      ])

      if (slFull) {
        setListEditorData = {
          setList: slFull as SetList,
          setListSongs: (slSongs ?? []) as SetListSong[],
          allSongs: (allSongsData ?? []) as Song[],
          templates: (templatesData ?? []) as { id: string; name: string }[],
          tagOptions: (tagOptionsData ?? []) as TagOption[],
          setListRequests: (slRequestsData ?? []) as EventRequest[],
        }
      }
    }
  }

  // Fetch requests data when on the requests tab
  let eventRequests: EventRequest[] = []
  let allSongs: Song[] = []

  if (tab === 'requests') {
    const [{ data: requestsData }, { data: songsData }] = await Promise.all([
      supabase.from('event_requests').select('*').eq('event_id', id).order('created_at'),
      supabase.from('songs').select('*').order('title'),
    ])
    eventRequests = (requestsData ?? []) as EventRequest[]
    allSongs = (songsData ?? []) as Song[]
  }

  // Fetch set list song titles when on the calendar tab
  let calendarSetListText: string | null = null

  if (tab === 'calendar') {
    const { data: existingSetList } = await supabase
      .from('set_lists')
      .select('id')
      .eq('event_id', id)
      .eq('is_template', false)
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (existingSetList?.id) {
      const { data: slSongs } = await supabase
        .from('set_list_songs')
        .select('*, song:songs(title)')
        .eq('set_list_id', existingSetList.id)
        .order('set_number', { ascending: true, nullsFirst: false })
        .order('position', { ascending: true })

      const songs = (slSongs ?? []) as (SetListSong & { song?: { title: string } })[]
      if (songs.length > 0) {
        const setNumbers = Array.from(new Set(songs.map(s => s.set_number ?? 1)))
        calendarSetListText = setNumbers.length > 1
          ? setNumbers
              .map(sn => `Set ${sn}: ${songs.filter(s => (s.set_number ?? 1) === sn).map(s => s.song?.title).filter(Boolean).join(', ')}`)
              .join(' | ')
          : songs.map(s => s.song?.title).filter(Boolean).join(', ')
      }
    }
  }

  const calendarNotesData = {
    date: event.event_date ? formatOrdinalDate(event.event_date) : null,
    address: [event.venue_name, event.venue_address, event.venue_postcode].filter(Boolean).join(', ') || null,
    bandSize: event.booked_band_size ?? rd?.band_size_requested ?? null,
    numberOfSets: event.booked_sets ?? rd?.sets_requested ?? null,
    arrival: event.arrival_time,
    finish: event.finish_time,
    setList: calendarSetListText,
    food: event.food === 'yes' ? 'Yes' : event.food === 'no' ? 'No' : event.food === 'tbc' ? 'TBC' : null,
    dressCode,
  }

  // Fetch travel expenses when on the travel tab
  let travelExpenses: TravelExpense[] = []

  if (tab === 'travel') {
    const { data: travelExpensesData } = await supabase
      .from('event_travel_expenses')
      .select('*')
      .eq('event_id', id)
      .order('sort_order')
    travelExpenses = (travelExpensesData ?? []) as TravelExpense[]
  }

  // Fetch activity log when on the activity tab, filtered server-side
  let activityLog: ActivityEntry[] = []

  if (tab === 'activity') {
    let activityQuery = supabase.from('event_activity_log').select('*').eq('event_id', id).order('changed_at', { ascending: false })
    if (activityType === 'communication') {
      activityQuery = activityQuery.or('type.eq.request_change,type.eq.contract_change,and(type.eq.field_change,source.eq.contract_review)')
    } else if (activityType !== 'all') {
      activityQuery = activityQuery.eq('type', activityType)
    }
    const { data: activityLogData } = await activityQuery
    activityLog = (activityLogData ?? []) as ActivityEntry[]
  }

  // Fetch comments when on the comments tab
  let comments: ActivityEntry[] = []

  if (tab === 'comments') {
    const { data: commentsData } = await supabase
      .from('event_activity_log')
      .select('*')
      .eq('event_id', id)
      .eq('type', 'comment')
      .order('changed_at', { ascending: false })
    comments = (commentsData ?? []) as ActivityEntry[]
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: active ? 500 : 400,
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    textDecoration: 'none', cursor: 'pointer',
  })

  return (
    <div className="admin-page" style={{ fontFamily: 'var(--font)' }}>
      <a href="/admin/events" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Events</a>

      {/* Header */}
      <div className="page-header" style={{ margin: '16px 0 20px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {formatDate(event.event_date)}
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            Saved {formatCreated(event.created_at)}
          </p>
        </div>
        <div className="page-header-actions">
          <StatusSelect eventId={event.id} currentStatus={event.status} />
          <CopyEventDetailsButton event={{
            agencyName: event.agency_name,
            agentName: event.agent_name,
            eventDate: event.event_date,
            venueName: event.venue_name,
            venueAddress: event.venue_address,
            location: event.location,
            venuePostcode: event.venue_postcode,
            arrivalTime: event.arrival_time,
            startTime: event.start_time,
            finishTime: event.finish_time,
            loadOutTime: event.load_out_time,
            guests: event.guests,
            bandSize: rd?.band_size_requested ?? null,
            sets: rd?.sets_requested ?? null,
            specialRequirements: rd?.special_requirements ?? null,
            soundRequirements: rd?.sound_requirements ?? null,
            notes: rd?.notes ?? null,
          }} />
          <a
            href={`/admin/events/${event.id}/edit`}
            style={{
              display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            }}
          >
            Edit
          </a>
          <a
            href={`/admin/events/${event.id}/email`}
            style={{
              display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
              background: 'var(--bg-secondary)', color: 'var(--text)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            }}
          >
            Generate email
          </a>
          <a
            href={`/quote/new?event=${event.id}`}
            style={{
              display: 'inline-block', padding: '8px 18px', fontSize: 13, fontWeight: 500,
              background: 'var(--accent)', color: 'var(--accent-text-on)', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            }}
          >
            Generate quote →
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <a href={`/admin/events/${id}`} style={tabStyle(tab === 'information')}>Information</a>
        <a href={`/admin/events/${id}?tab=musicians`} style={tabStyle(tab === 'musicians')}>Musicians</a>
        <a href={`/admin/events/${id}?tab=quotes`} style={tabStyle(tab === 'quotes')}>
          Quotes{quotes.length > 0 ? ` (${quotes.length})` : ''}
        </a>
        <a href={`/admin/events/${id}?tab=requests`} style={tabStyle(tab === 'requests')}>Requests</a>
        <a href={`/admin/events/${id}?tab=set-lists`} style={tabStyle(tab === 'set-lists')}>Set lists</a>
        <a href={`/admin/events/${id}?tab=invoices`} style={tabStyle(tab === 'invoices')}>
          Invoices{invoices.length > 0 ? ` (${invoices.length})` : ''}
        </a>
        <a href={`/admin/events/${id}?tab=contract`} style={tabStyle(tab === 'contract')}>
          Contract{event.contract ? ' ✓' : ''}
        </a>
        <a href={`/admin/events/${id}?tab=calendar`} style={tabStyle(tab === 'calendar')}>Calendar</a>
        <a href={`/admin/events/${id}?tab=travel`} style={tabStyle(tab === 'travel')}>Travel expenses</a>
        <a href={`/admin/events/${id}?tab=activity`} style={tabStyle(tab === 'activity')}>Activity</a>
        <a href={`/admin/events/${id}?tab=comments`} style={tabStyle(tab === 'comments')}>Comments</a>
      </div>

      {/* ── Information tab ── */}
      {tab === 'information' && (
        <>
          <Section label="Event details">
            <PairGrid>
              {event.is_agency ? (
                <>
                  <Cell label="Agency" value={event.agency_name} />
                  <Cell label="Agent" value={event.agent_name} />
                  <Cell label="Date" value={formatDate(event.event_date)} />
                  <Cell label="Email" value={event.client_email} />
                </>
              ) : (
                <>
                  <Cell label="First name" value={event.agent_first_name} />
                  <Cell label="Surname" value={event.agent_surname} />
                  <Cell label="Date" value={formatDate(event.event_date)} />
                  <Cell label="Email" value={event.client_email} />
                  <Cell label="Telephone" value={(event as unknown as { client_phone?: string | null }).client_phone} />
                  <Cell label="Source" value={(event as unknown as { source?: string | null }).source} />
                </>
              )}
              {event.is_agency && (
                <Cell label="Source" value={(event as unknown as { source?: string | null }).source} />
              )}
              <Cell label="Arrival" value={event.arrival_time} />
              <Cell label="Start" value={event.start_time} />
              <Cell label="Finish" value={event.finish_time} />
              <Cell label="Load out" value={event.load_out_time} />
            </PairGrid>
            {(event as unknown as { source_job_url?: string | null }).source_job_url && (
              <div style={{ padding: '10px 0', borderTop: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 3, letterSpacing: '0.02em' }}>Job reference</div>
                <a
                  href={(event as unknown as { source_job_url?: string }).source_job_url!}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}
                >
                  {(event as unknown as { source_job_url?: string }).source_job_url} →
                </a>
              </div>
            )}
            <PairGrid>
              <Cell label="Venue" value={event.venue_name} />
              <Cell label="Guests" value={event.guests != null ? String(event.guests) : null} />
              <Cell label="Postcode" value={event.venue_postcode} />
              <Cell label="Location" value={event.location} />
            </PairGrid>
            <PairGrid style={{ borderBottom: 'none' }}>
              <Cell label="Food provided" value={event.food === 'yes' ? 'Yes' : event.food === 'no' ? 'No' : event.food === 'tbc' ? 'TBC' : null} />
              <Cell label="Food notes" value={event.food_notes} />
            </PairGrid>
            {dressCode && <FullRow label="Dress code" value={dressCode} />}
            <FullRow label="Address" value={event.venue_address} />
          </Section>

          <Section label="Client">
            <ClientLinkSection
              eventId={event.id}
              isAgency={event.is_agency}
              agencyName={event.agency_name}
              agentName={event.agent_name}
              clientEmail={event.client_email}
              linkedClient={linkedClient}
              allClients={allClients}
            />
          </Section>

          <Section label="Booking details">
            <BookingDetailsSection
              eventId={event.id}
              initialBandSize={event.booked_band_size}
              initialSets={event.booked_sets}
              initialFee={event.booked_fee}
            />
          </Section>

          {rd && (
            <Section label="Request details">
              <PairGrid>
                <Cell label="Band size requested" value={rd.band_size_requested} />
                <Cell label="Sets requested" value={rd.sets_requested} />
              </PairGrid>
              {rd.roaming_requested && <FullRow label="Roaming requested" value="Yes" />}
              <FullRow label="Special requirements" value={rd.special_requirements} />
              <FullRow label="Sound requirements" value={rd.sound_requirements} />
              <FullRow label="Notes" value={rd.notes} />
            </Section>
          )}

          {quotes.length > 0 && (
            <Section label={`Quotes (${quotes.length})`}>
              <div style={{ padding: '8px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                <a href={`/admin/events/${id}?tab=quotes`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  View all {quotes.length} quote{quotes.length !== 1 ? 's' : ''} →
                </a>
                {quotes.find(q => q.status === 'accepted') && (
                  <span style={{ marginLeft: 12, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                    ✓ {quotes.find(q => q.status === 'accepted')?.accepted_option}
                  </span>
                )}
              </div>
            </Section>
          )}

          <Section label="Contract">
            <div style={{ padding: '10px 0' }}>
              {event.contract ? (
                <a href={`/admin/events/${id}?tab=contract`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                  ✓ Contract uploaded — view →
                </a>
              ) : (
                <a href={`/admin/events/${id}?tab=contract`} style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
                  No contract yet — upload →
                </a>
              )}
            </div>
          </Section>

          {event.raw_email && (
            <details style={{ marginTop: 24 }}>
              <summary style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                cursor: 'pointer', marginBottom: 10, userSelect: 'none',
              }}>
                Original email
              </summary>
              <pre style={{
                fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '14px 16px', margin: 0,
              }}>
                {event.raw_email}
              </pre>
            </details>
          )}
        </>
      )}

      {/* ── Quotes tab ── */}
      {tab === 'quotes' && (
        <div style={{ maxWidth: 640 }}>
          <EventQuotesClient eventId={id} quotes={quotes} />
        </div>
      )}

      {/* ── Musicians tab ── */}
      {tab === 'musicians' && (
        <EventMusiciansClient
          eventId={id}
          eventLabel={title}
          eventFood={event.food ?? null}
          slots={slots}
          musicians={musicians}
          templates={templates}
        />
      )}

      {/* ── Set lists tab ── */}
      {tab === 'set-lists' && setListEditorData && (
        <SetListEditor
          setList={setListEditorData.setList}
          setListSongs={setListEditorData.setListSongs}
          allSongs={setListEditorData.allSongs}
          templates={setListEditorData.templates}
          tagOptions={setListEditorData.tagOptions}
          eventRequests={setListEditorData.setListRequests}
          embedded
        />
      )}

      {/* ── Requests tab ── */}
      {tab === 'requests' && (
        <RequestsSection
          eventId={id}
          requests={eventRequests}
          allSongs={allSongs}
        />
      )}

      {/* ── Invoices tab ── */}
      {tab === 'invoices' && (
        <div style={{ maxWidth: 720, paddingTop: 8 }}>
          <InvoiceSection
            eventId={event.id}
            eventDate={event.event_date}
            invoices={invoices}
            prefillItems={prefillItems}
            invoiceSettings={invoiceSettings}
            clientEmail={linkedClient?.email ?? null}
            clientName={linkedClient?.name ?? null}
            adminEmail={adminEmail}
          />
        </div>
      )}

      {/* ── Contract tab ── */}
      {tab === 'contract' && (
        <div style={{ maxWidth: 720 }}>
          <ContractSection event={event} quotePrice={quotePrice} />
        </div>
      )}

      {/* ── Calendar tab ── */}
      {tab === 'calendar' && (
        <CalendarNotesSection data={calendarNotesData} />
      )}

      {/* ── Travel expenses tab ── */}
      {tab === 'travel' && (
        <div style={{ maxWidth: 720 }}>
          <Section label="Journey details">
            <JourneyDetailsCard
              eventId={event.id}
              initialRoundTripMiles={(event as unknown as { round_trip_miles?: number | null }).round_trip_miles ?? null}
              homePostcode={invoiceSettings?.home_postcode ?? null}
              venuePostcode={event.venue_postcode}
            />
          </Section>
          <Section label="Travel details">
            <TravelDetailsForm
              eventId={event.id}
              initialTravelMethod={(event as unknown as { travel_method?: string | null }).travel_method ?? null}
              initialCongestionChargeRequired={(event as unknown as { congestion_charge_required?: string | null }).congestion_charge_required ?? null}
              initialParkingType={(event as unknown as { parking_type?: string | null }).parking_type ?? null}
            />
          </Section>
          <Section label="Travel expenses">
            <TravelExpensesTable eventId={event.id} initialExpenses={travelExpenses} />
          </Section>
        </div>
      )}

      {/* ── Activity tab ── */}
      {tab === 'activity' && (
        <div style={{ maxWidth: 720 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {ACTIVITY_FILTERS.map(f => (
              <a
                key={f.value}
                href={`/admin/events/${id}?tab=activity${f.value === 'all' ? '' : `&activityType=${f.value}`}`}
                style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 500, borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none',
                  background: activityType === f.value ? 'var(--text)' : 'var(--bg-secondary)',
                  color: activityType === f.value ? 'var(--bg)' : 'var(--text-secondary)',
                  border: '0.5px solid var(--border)',
                }}
              >
                {f.label}
              </a>
            ))}
          </div>

          <Section label="Activity">
            {activityLog.length === 0 ? (
              <div style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-tertiary)' }}>No activity yet.</div>
            ) : (
              <div>
                {activityLog.map((entry, i) => {
                  const meta = ACTIVITY_TYPE_META[entry.type] ?? ACTIVITY_TYPE_META.field_change
                  const isDiff = entry.type === 'field_change' || entry.type === 'status_change'
                  return (
                    <div key={entry.id} style={{
                      display: 'grid', gridTemplateColumns: '110px 90px 1fr', gap: '0 12px',
                      padding: '10px 0', alignItems: 'start',
                      borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {new Date(entry.changed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {new Date(entry.changed_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {entry.actor}
                        </div>
                      </div>
                      <div>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', fontSize: 10, fontWeight: 500,
                          borderRadius: 5, background: meta.bg, color: meta.color, whiteSpace: 'nowrap',
                        }}>
                          {meta.label}
                        </span>
                      </div>
                      <div>
                        {isDiff ? (
                          <div style={{ fontSize: 13, color: 'var(--text)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>{entry.field_label ?? entry.field}: </span>
                            <span style={{ textDecoration: 'line-through', color: 'var(--text-tertiary)' }}>
                              {entry.old_value || '—'}
                            </span>
                            {' → '}
                            <span style={{ fontWeight: 500 }}>{entry.new_value || '—'}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, color: 'var(--text)' }}>{entry.summary}</div>
                        )}
                        {entry.note && (
                          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, fontStyle: 'italic' }}>
                            {entry.note}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        </div>
      )}

      {/* ── Comments tab ── */}
      {tab === 'comments' && (
        <div style={{ maxWidth: 720 }}>
          <CommentsSection eventId={id} comments={comments} />
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{
        background: 'var(--bg)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '0 16px',
      }}>
        {children}
      </div>
    </div>
  )
}

function PairGrid({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px',
      borderBottom: '0.5px solid var(--border)',
      ...style,
    }}>
      {children}
    </div>
  )
}
