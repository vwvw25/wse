import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { generateQuoteHtml, generateBookingDetailsHtml } from '@/lib/quote-html'
import type { QuoteRecord, EmailTemplate, EventRecord, WhySuitedTemplate } from '@/types/quote'
import EmailComposer from './EmailComposer'

export default async function QuoteEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: quoteData }, { data: templatesData }, { data: wsTemplatesData }, { data: wsSettingsData }] = await Promise.all([
    supabase.from('quotes').select('*').eq('id', id).single(),
    supabase.from('email_templates').select('*').order('name'),
    supabase.from('why_suited_templates').select('*').order('name'),
    supabase.from('why_suited_settings').select('prompt').eq('id', 1).single(),
  ])

  if (!quoteData) notFound()

  const quote = quoteData as QuoteRecord
  const templates = (templatesData ?? []) as EmailTemplate[]
  const whySuitedTemplates = (wsTemplatesData ?? []) as WhySuitedTemplate[]
  const whySuitedPrompt = (wsSettingsData?.prompt as string | undefined) ?? ''

  // Fetch linked event if there is one
  let event: EventRecord | null = null
  if (quote.event_id) {
    const { data } = await supabase.from('events').select('*').eq('id', quote.event_id).single()
    if (data) event = data as EventRecord
  }

  const quoteHtml = generateQuoteHtml(quote)
  const bookingDetailsHtml = generateBookingDetailsHtml(quote, event)

  return (
    <EmailComposer
      templates={templates}
      whySuitedTemplates={whySuitedTemplates}
      whySuitedPrompt={whySuitedPrompt}
      enquiryEmail={event?.raw_email ?? ''}
      event={event}
      quoteHtml={quoteHtml}
      bookingDetailsHtml={bookingDetailsHtml}
      quoteId={id}
    />
  )
}
