import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { musicianFullName, ONBOARDING_OPTIONAL_FIELDS, ONBOARDING_BASE_FIELDS } from '@/types/musicians'
import type { OnboardingType } from '@/types/musicians'
import { createOnboardingToken } from '@/app/admin/musicians/actions'
import { sendEmail } from '@/lib/send-email'
import { getBaseUrl } from '@/lib/get-base-url'

const ALL_FIELDS = [...ONBOARDING_BASE_FIELDS, ...ONBOARDING_OPTIONAL_FIELDS]

function formatDeadline(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
}

function getFieldLabel(key: string): string {
  const found = ALL_FIELDS.find(f => f.key === key)
  return found ? found.label : key
}

function getFieldGroup(key: string): string {
  const found = ALL_FIELDS.find(f => f.key === key)
  return found ? found.group : 'Other'
}

function groupFields(keys: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  for (const key of keys) {
    const group = getFieldGroup(key)
    if (!groups[group]) groups[group] = []
    groups[group].push(getFieldLabel(key))
  }
  return groups
}

function renderFieldGroups(keys: string[]): string {
  const groups = groupFields(keys)
  return Object.entries(groups).map(([group, labels]) => `
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">${group}</div>
      <ul style="margin:0;padding-left:18px;">
        ${labels.map(l => `<li style="font-size:13px;color:#374151;margin-bottom:2px;">${l}</li>`).join('')}
      </ul>
    </div>
  `).join('')
}

function buildGeneralEmailHtml({
  firstName,
  fieldsRequested,
  ctaUrl,
  deadlineAt,
}: {
  firstName: string
  fieldsRequested: string[]
  ctaUrl: string
  deadlineAt: string
}): string {
  const baseFields = ['phone', 'home_city', 'primary_instrument', 'secondary_instrument', 'dietary_requirements', 'default_fee']
  const allFields = [...new Set([...baseFields, ...fieldsRequested])]
  const formattedDeadline = formatDeadline(deadlineAt)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Welcome to the roster</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">
        We're delighted to welcome you to the Ward Smith Entertainment musician roster. We work with a wide range of clients and look forward to having you perform with us.
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        To get you set up, please take a moment to complete your profile.
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:2px;">Please respond by</div>
        <div style="font-size:14px;color:#78350f;font-weight:500;">${formattedDeadline}</div>
      </div>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        This only takes a couple of minutes and helps us manage bookings smoothly.
      </p>
      <a href="${ctaUrl}" style="display:block;text-align:center;padding:14px 0;background:#111827;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;margin-bottom:24px;">
        Complete my profile →
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        If you have any questions, reply to this email and we'll be happy to help.
      </p>
    </div>
  </div>
</body>
</html>`
}

function buildInfoRequestEmailHtml({
  firstName,
  fieldsRequested,
  ctaUrl,
  deadlineAt,
}: {
  firstName: string
  fieldsRequested: string[]
  ctaUrl: string
  deadlineAt: string
}): string {
  const formattedDeadline = formatDeadline(deadlineAt)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">A few more details needed</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">
        Hope you're well. We have an upcoming engagement and need a few additional details from you before we can confirm everything.
      </p>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">
        Specifically, we need the following:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        ${renderFieldGroups(fieldsRequested)}
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:2px;">Please respond by</div>
        <div style="font-size:14px;color:#78350f;font-weight:500;">${formattedDeadline}</div>
      </div>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        Please complete the short form below at your earliest convenience.
      </p>
      <a href="${ctaUrl}" style="display:block;text-align:center;padding:14px 0;background:#111827;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;margin-bottom:24px;">
        Provide my details →
      </a>
      <p style="font-size:12px;color:#9ca3af;margin:0;">
        If you have any questions, reply to this email and we'll be happy to help.
      </p>
    </div>
  </div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { musicianId: string; type: OnboardingType; fieldsRequested: string[]; deadlineAt: string }
    const { musicianId, type, fieldsRequested, deadlineAt } = body

    if (!musicianId || !type) {
      return NextResponse.json({ error: 'musicianId and type are required' }, { status: 400 })
    }

    if (!deadlineAt) {
      return NextResponse.json({ error: 'deadlineAt is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: musician, error: mErr } = await supabase
      .from('musicians')
      .select('*')
      .eq('id', musicianId)
      .single()

    if (mErr || !musician) {
      return NextResponse.json({ error: 'Musician not found' }, { status: 404 })
    }

    if (!musician.email) {
      return NextResponse.json({ error: 'Musician has no email address' }, { status: 400 })
    }

    const token = await createOnboardingToken(musicianId, type, fieldsRequested, deadlineAt)
    if (!token) {
      return NextResponse.json({ error: 'Failed to create onboarding token' }, { status: 500 })
    }

    const ctaUrl = `${getBaseUrl(req)}/onboarding/${token}`
    const firstName = musician.first_name ?? musicianFullName(musician)

    const isGeneral = type === 'general'
    const subject = isGeneral
      ? 'Welcome to Ward Smith Entertainment — please complete your profile'
      : 'Ward Smith Entertainment — we need a few more details'

    const html = isGeneral
      ? buildGeneralEmailHtml({ firstName, fieldsRequested, ctaUrl, deadlineAt })
      : buildInfoRequestEmailHtml({ firstName, fieldsRequested, ctaUrl, deadlineAt })

    await sendEmail({
      type: 'onboarding',
      to: musician.email,
      recipientName: firstName,
      subject,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-onboard error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
