import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import { generateQuoteHtml } from '@/lib/quote-html'
import type { QuoteRecord, EmailTemplate, EventRecord } from '@/types/quote'
import EmailComposer from './EmailComposer'

export default async function QuoteEmailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: quoteData }, { data: templatesData }] = await Promise.all([
    supabase.from('quotes').select('*').eq('id', id).single(),
    supabase.from('email_templates').select('*').order('name'),
  ])

  if (!quoteData) notFound()

  const quote = quoteData as QuoteRecord
  const templates = (templatesData ?? []) as EmailTemplate[]

  // Fetch linked event if there is one
  let event: EventRecord | null = null
  if (quote.event_id) {
    const { data } = await supabase.from('events').select('*').eq('id', quote.event_id).single()
    if (data) event = data as EventRecord
  }

  const quoteHtml = generateQuoteHtml(quote)

  return (
    <EmailComposer
      templates={templates}
      event={event}
      quoteHtml={quoteHtml}
      quoteId={id}
    />
  )
}
