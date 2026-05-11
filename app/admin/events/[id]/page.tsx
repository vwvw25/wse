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
import InvoiceSection from './InvoiceSection'
import ClientLinkSection from './ClientLinkSection'
import EventQuotesClient from './EventQuotesClient'

function formatDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatCreated(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

type Tab = 'information' | 'musicians' | 'quotes'

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab: tabParam } = await searchParams
  const tab: Tab = tabParam === 'musicians' ? 'musicians' : tabParam === 'quotes' ? 'quotes' : 'information'

  const supabase = createServiceClient()

  const [{ data: eventData }, { data: quotesData }, { data: invoicesData }, { data: invoiceSettingsData }, { data: allClientsData }] = await Promise.all([
    supabase.from('events').select('*, booked_template:band_templates!booked_band_template_id(name)').eq('id', id).single(),
    supabase.from('quotes').select('id, created_at, inputs, calculated, version, status, accepted_option').eq('event_id', id).order('version', { ascending: false }),
    supabase.from('invoices').select('*, line_items:invoice_line_items(*)').eq('event_id', id).order('created_at'),
    supabase.from('invoice_settings').select('*').single(),
    supabase.from('clients').select('*').order('name'),
  ])

  if (!eventData) notFound()

  const event = eventData as EventRecord
  const quotes = (quotesData ?? []) as (Pick<QuoteRecord, 'id' | 'created_at' | 'inputs' | 'calculated'> & { version: number; status: string; accepted_option: string | null })[]
  const invoices = (invoicesData ?? []) as (Invoice & { line_items: InvoiceLineItem[] })[]
  const invoiceSettings = (invoiceSettingsData ?? null) as InvoiceSettings | null
  const allClients = (allClientsData ?? []) as Client[]
  const linkedClient = allClients.find(c => c.id === event.client_id) ?? null
  const rd = event.request_details
  const quotePrice: number | null = quotes[0]?.calculated?.total_fee ?? null

  // Prefill invoice line items from latest quote
  const prefillItems: { description: string; cost: number }[] = quotePrice
    ? [{ description: event.venue_name ? `Band performance — ${event.venue_name}` : 'Band performance', cost: quotePrice }]
    : []

  const title = event.agency_name
    ? (event.agent_name ? `${event.agent_name} at ${event.agency_name}` : event.agency_name)
    : (event.agent_name ?? 'Unknown')

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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-block', padding: '8px 16px', fontSize: 13, fontWeight: active ? 500 : 400,
    color: active ? 'var(--text)' : 'var(--text-secondary)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    textDecoration: 'none', cursor: 'pointer',
  })

  return (
    <div style={{ padding: '32px 32px', fontFamily: 'var(--font)' }}>
      <a href="/admin/events" style={{ fontSize: 12, color: 'var(--text-secondary)', textDecoration: 'none' }}>← Events</a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', margin: '16px 0 20px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', color: 'var(--text)' }}>{title}</h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            {formatDate(event.event_date)}
            <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
            Saved {formatCreated(event.created_at)}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
              background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', textDecoration: 'none',
            }}
          >
            Generate quote →
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', marginBottom: 28, gap: 0 }}>
        <a href={`/admin/events/${id}`} style={tabStyle(tab === 'information')}>Information</a>
        <a href={`/admin/events/${id}?tab=musicians`} style={tabStyle(tab === 'musicians')}>Musicians</a>
        <a href={`/admin/events/${id}?tab=quotes`} style={tabStyle(tab === 'quotes')}>
          Quotes{quotes.length > 0 ? ` (${quotes.length})` : ''}
        </a>
      </div>

      {/* ── Information tab ── */}
      {tab === 'information' && (
        <>
          <Section label="Event details">
            <PairGrid>
              <Cell label="Agency" value={event.agency_name} />
              <Cell label="Agent" value={event.agent_name} />
              <Cell label="Date" value={formatDate(event.event_date)} />
              <Cell label="Client email" value={event.client_email} />
              <Cell label="Arrival" value={event.arrival_time} />
              <Cell label="Start" value={event.start_time} />
              <Cell label="Finish" value={event.finish_time} />
              <Cell label="Load out" value={event.load_out_time} />
            </PairGrid>
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

          {(event.booked_band_template_id || event.booked_lineup || event.booked_sets) && (
            <Section label="Booking details">
              <PairGrid style={{ borderBottom: 'none' }}>
                <Cell label="Band" value={(eventData as { booked_template?: { name: string } | null }).booked_template?.name ?? null} />
                <Cell label="Sets" value={event.booked_sets} />
              </PairGrid>
              <FullRow label="Line-up" value={event.booked_lineup} />
            </Section>
          )}

          {rd && (
            <Section label="Request details">
              <PairGrid>
                <Cell label="Band size requested" value={rd.band_size_requested} />
                <Cell label="Sets requested" value={rd.sets_requested} />
              </PairGrid>
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
            <div style={{ padding: '12px 0' }}>
              <ContractSection event={event} quotePrice={quotePrice} />
            </div>
          </Section>

          <Section label={`Invoices (${invoices.length})`}>
            <div style={{ padding: '14px 0' }}>
              <InvoiceSection
                eventId={event.id}
                eventDate={event.event_date}
                invoices={invoices}
                prefillItems={prefillItems}
                invoiceSettings={invoiceSettings}
              />
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
