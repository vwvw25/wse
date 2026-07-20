import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { getGmailAccessToken, fetchAttachment } from '@/lib/gmail'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BUCKET = 'musician-invoices'
const ACCOUNTS_AGENT_SLUG = 'accounts'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { issue_id } = await req.json()
  if (!issue_id) return NextResponse.json({ error: 'issue_id required' }, { status: 400 })

  const supabase = createServiceClient()

  // Load the issue + inbox row
  const { data: issue } = await supabase
    .from('issues')
    .select('*, gmail_inbox:gmail_inbox_id(*)')
    .eq('id', issue_id)
    .single()

  if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

  const inbox = issue.gmail_inbox as any
  const gmailMessageId = inbox?.gmail_message_id ?? null
  const hasAttachments = inbox?.has_attachments ?? false
  const attachmentIds: any[] = inbox?.attachment_ids ?? []

  // Assign to accounts agent
  const { data: accountsAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('slug', ACCOUNTS_AGENT_SLUG)
    .single()

  if (accountsAgent) {
    await supabase
      .from('issues')
      .update({ assigned_agent_id: accountsAgent.id })
      .eq('id', issue_id)
  }

  const fromAddress = inbox?.from_address ?? ''
  const emailBody = inbox?.body ?? issue.description ?? ''
  const isFromQuickbooks = fromAddress.toLowerCase().includes('quickbooks') ||
    emailBody.toLowerCase().includes('quickbooks') ||
    emailBody.toLowerCase().includes('intuit')

  // --- No attachment case ---
  if (!hasAttachments || attachmentIds.length === 0) {
    const quickbooksLink = 'http://quickbooks.intuit.com/learn-support/en-au/help-article/manage-invoices/email-invoices-pdf-video/L8R9mFLLP_AU_en_AU'
    const draftContent = isFromQuickbooks
      ? `Hi,\n\nThank you for sending your invoice. Unfortunately we weren't able to process it as the invoice document wasn't attached to your email.\n\nAs your invoice appears to have been sent from QuickBooks, you may need to enable the "attach PDF to email" setting. You can find instructions here: ${quickbooksLink}\n\nPlease resend your invoice with the document attached and we'll get it processed right away.\n\nBest wishes,\nLucy\nAccounts Agent`
      : `Hi,\n\nThank you for sending your invoice. Unfortunately we weren't able to process it as the invoice document wasn't attached to your email.\n\nOur invoices are processed using an automation, so the invoice PDF must be attached directly to the email. Please resend with the document attached and we'll get it processed right away.\n\nBest wishes,\nLucy\nAccounts Agent`

    await supabase.from('agent_proposals').insert({
      issue_id,
      agent_id: accountsAgent?.id ?? null,
      action_type: 'approval',
      action_summary: 'Invoice email received with no attachment — send reply asking them to resend with PDF attached',
      draft_content: draftContent,
      status: 'pending',
    })

    await supabase.from('issue_messages').insert({
      issue_id,
      role: 'agent',
      content: `Invoice email received from ${fromAddress} but no attachment was found.\n\n${isFromQuickbooks ? 'Email appears to be from QuickBooks — draft reply includes link to PDF attachment settings.' : 'Draft reply in Needs You asking them to resend with the invoice attached.'}`,
    })

    return NextResponse.json({ ok: true, result: 'no_attachment' })
  }

  // --- Match to event_musicians slot ---
  // Try matching musician by email first, then by name from email address
  const emailMatch = fromAddress.match(/([^<]+)<([^>]+)>/)
  const senderEmail = emailMatch ? emailMatch[2].trim() : fromAddress.trim()
  const senderName = emailMatch ? emailMatch[1].trim() : ''

  const { data: musicianByEmail } = await supabase
    .from('musicians')
    .select('id, first_name, last_name, email')
    .eq('email', senderEmail)
    .single()

  let musicianId = musicianByEmail?.id ?? null

  // If no match by email, try matching by name
  if (!musicianId && senderName) {
    const parts = senderName.split(' ')
    const firstName = parts[0]
    const lastName = parts[parts.length - 1]
    const { data: musicianByName } = await supabase
      .from('musicians')
      .select('id, first_name, last_name, email')
      .ilike('first_name', firstName)
      .ilike('last_name', lastName)
      .single()
    musicianId = musicianByName?.id ?? null
  }

  if (!musicianId) {
    await supabase.from('agent_proposals').insert({
      issue_id,
      agent_id: accountsAgent?.id ?? null,
      action_type: 'question',
      question_text: `Could not match this invoice email to a musician in the system. Sender: ${fromAddress}. Which musician is this from?`,
      action_summary: 'Cannot match invoice to a musician — needs manual identification',
      status: 'pending',
    })
    await supabase.from('issue_messages').insert({
      issue_id,
      role: 'agent',
      content: `Received invoice from ${fromAddress} but could not match to a musician in the system. Added to Needs You for manual identification.`,
    })
    return NextResponse.json({ ok: true, result: 'no_musician_match' })
  }

  // Find the most recent upcoming or recent event slot for this musician
  const { data: slots } = await supabase
    .from('event_musicians')
    .select('id, fee, musician_invoice_status, musician_invoice_due_date, event:events(id, event_date, agency_name)')
    .eq('musician_id', musicianId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Pick the most recent slot without an invoice already received
  const slot = (slots ?? []).find((s: any) =>
    !s.musician_invoice_status || s.musician_invoice_status === 'pending'
  ) ?? slots?.[0] ?? null

  if (!slot) {
    await supabase.from('agent_proposals').insert({
      issue_id,
      agent_id: accountsAgent?.id ?? null,
      action_type: 'question',
      question_text: `Received invoice from musician but could not find a matching event slot. Which event does this invoice relate to?`,
      action_summary: 'Cannot match invoice to an event slot — needs manual selection',
      status: 'pending',
    })
    return NextResponse.json({ ok: true, result: 'no_slot_match' })
  }

  // --- Download and store the attachment ---
  const attachment = attachmentIds[0] // take first PDF-like attachment
  let storagePath: string | null = null
  let filename: string | null = null
  let pdfBuffer: Buffer | null = null

  try {
    const accessToken = await getGmailAccessToken()
    pdfBuffer = await fetchAttachment(gmailMessageId, attachment.attachmentId, accessToken)
    const rawFilename = attachment.filename || `invoice-${Date.now()}.pdf`
    filename = rawFilename

    // Remove existing invoice if present
    const { data: existingSlot } = await supabase
      .from('event_musicians')
      .select('musician_invoice_path')
      .eq('id', slot.id)
      .single()
    if (existingSlot?.musician_invoice_path) {
      await supabase.storage.from(BUCKET).remove([existingSlot.musician_invoice_path]).catch(() => {})
    }

    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_')
    storagePath = `${slot.id}/${Date.now()}-${safeFilename}`
    await supabase.storage.from(BUCKET).upload(storagePath, pdfBuffer, {
      contentType: attachment.mimeType || 'application/pdf',
      upsert: false,
    })

    await supabase
      .from('event_musicians')
      .update({
        musician_invoice_path: storagePath,
        musician_invoice_filename: filename,
        musician_invoice_status: 'received',
      })
      .eq('id', slot.id)
  } catch (err) {
    console.error('Failed to download/store attachment:', err)
  }

  // --- Parse invoice with Claude ---
  type InvoiceData = {
    total_amount: number | null
    bank_account_name: string | null
    bank_account_number: string | null
    bank_sort_code: string | null
  }

  let invoiceData: InvoiceData = {
    total_amount: null,
    bank_account_name: null,
    bank_account_number: null,
    bank_sort_code: null,
  }

  if (pdfBuffer) {
    try {
      const base64Pdf = pdfBuffer.toString('base64')
      const parseResult = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64Pdf },
            },
            {
              type: 'text',
              text: `Extract the following from this invoice. Respond with JSON only, no markdown:
{
  "total_amount": number (the total amount due, as a number, no currency symbol),
  "bank_account_name": string or null (name on the bank account),
  "bank_account_number": string or null (account number),
  "bank_sort_code": string or null (sort code, UK format e.g. 12-34-56)
}
If a field is not present, use null.`,
            },
          ],
        }],
      })
      const text = parseResult.content[0].type === 'text' ? parseResult.content[0].text : '{}'
      invoiceData = JSON.parse(text)
    } catch (err) {
      console.error('Failed to parse invoice PDF:', err)
    }
  }

  // --- Fee verification ---
  const bookedFee = slot.fee ?? null
  const invoiceTotal = invoiceData.total_amount
  const feeMatches = bookedFee !== null && invoiceTotal !== null &&
    Math.abs(Number(bookedFee) - Number(invoiceTotal)) < 0.01

  if (bookedFee !== null && invoiceTotal !== null && !feeMatches) {
    await supabase.from('agent_proposals').insert({
      issue_id,
      agent_id: accountsAgent?.id ?? null,
      action_type: 'question',
      question_text: `Invoice total (£${invoiceTotal}) does not match the booked fee (£${bookedFee}). How should this be resolved?`,
      question_options: ['Pay the invoiced amount', 'Pay the booked fee', 'Contact musician to reissue'],
      action_summary: `Invoice amount mismatch: invoiced £${invoiceTotal}, booked fee £${bookedFee}`,
      status: 'pending',
    })
  }

  // --- Bank details ---
  const { data: musician } = await supabase
    .from('musicians')
    .select('id, first_name, last_name, email, bank_account_name, bank_account_number, bank_sort_code')
    .eq('id', musicianId)
    .single()

  if (musician && invoiceData.bank_account_number) {
    const hasExisting = musician.bank_account_number
    const isSame = hasExisting &&
      musician.bank_account_number === invoiceData.bank_account_number &&
      musician.bank_sort_code === invoiceData.bank_sort_code

    if (!hasExisting) {
      // Fill empty fields
      await supabase.from('musicians').update({
        bank_account_name: invoiceData.bank_account_name,
        bank_account_number: invoiceData.bank_account_number,
        bank_sort_code: invoiceData.bank_sort_code,
      }).eq('id', musicianId)
    } else if (!isSame) {
      // Different details — needs approval
      await supabase.from('agent_proposals').insert({
        issue_id,
        agent_id: accountsAgent?.id ?? null,
        action_type: 'approval',
        action_summary: `Bank details on invoice differ from those on file for ${musician.first_name} ${musician.last_name} — approve to overwrite`,
        draft_content: `Current on file:\nAccount name: ${musician.bank_account_name}\nAccount number: ${musician.bank_account_number}\nSort code: ${musician.bank_sort_code}\n\nNew from invoice:\nAccount name: ${invoiceData.bank_account_name}\nAccount number: ${invoiceData.bank_account_number}\nSort code: ${invoiceData.bank_sort_code}`,
        status: 'pending',
      })
    }
    // isSame → no action
  }

  // --- Acknowledgement email proposal ---
  const musicianFirstName = musician?.first_name ?? 'there'
  const musicianEmail = musician?.email ?? senderEmail
  await supabase.from('agent_proposals').insert({
    issue_id,
    agent_id: accountsAgent?.id ?? null,
    action_type: 'approval',
    action_summary: `Send invoice receipt acknowledgement to ${musicianFirstName}`,
    draft_content: `To: ${musicianEmail}\nSubject: Invoice received\n\nHi ${musicianFirstName},\n\nThanks for sending over your invoice.\n\nIf you have any issues or questions please send me an email.\n\nBest wishes,\nLucy\nAccounts Agent`,
    status: 'pending',
  })

  // --- Summary message ---
  const lines = [
    `Invoice received from ${musician?.first_name} ${musician?.last_name} (${fromAddress}).`,
    storagePath ? `PDF saved to storage: ${filename}` : 'Could not save PDF — download from Gmail manually.',
    invoiceTotal !== null ? `Invoice total: £${invoiceTotal}` : 'Could not parse invoice total.',
    bookedFee !== null ? `Booked fee: £${bookedFee}` : null,
    feeMatches ? '✓ Amount matches booked fee.' : (invoiceTotal !== null && bookedFee !== null ? '⚠ Amount mismatch — added to Needs You.' : null),
    invoiceData.bank_account_number
      ? (musician?.bank_account_number && musician.bank_account_number !== invoiceData.bank_account_number
        ? '⚠ Bank details differ from record — approval request created.'
        : '✓ Bank details updated.')
      : 'Could not parse bank details from invoice.',
    'Acknowledgement email draft added to Needs You.',
  ].filter(Boolean)

  await supabase.from('issue_messages').insert({
    issue_id,
    role: 'agent',
    content: lines.join('\n'),
  })

  return NextResponse.json({ ok: true, result: 'processed', slot_id: slot.id })
}
