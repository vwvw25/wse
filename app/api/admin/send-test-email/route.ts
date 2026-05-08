import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/send-email'
import type { EmailType } from '@/lib/send-email'

// ── Fake data used across all templates ────────────────────────────────────
const FAKE = {
  musicianName: 'Jamie Wilson',
  firstName: 'Jamie',
  instrument: 'Guitar',
  eventDate: '2026-09-13',
  eventDateFormatted: '13 September 2026',
  venueName: 'The Grand Pavilion',
  venueAddress: '42 Harbourside Way, Bristol, BS1 5UH',
  location: 'Bristol',
  arrivalTime: '17:30',
  startTime: '19:00',
  finishTime: '23:00',
  deadlineDate: '2026-05-01T17:00:00.000Z',
  token: 'test-token-preview',
  googleCalUrl: 'https://www.google.com/calendar',
  icalUrl: '/api/ical/test-token-preview',  // relative — test only
}

// ── Individual HTML builders (self-contained copies) ───────────────────────

function availabilityRequestHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Booking request</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">Hi ${FAKE.musicianName},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        We'd like to check your availability for the following event. Please confirm by <strong>Thursday 1 May 2026, 18:00</strong>.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:110px;">Date</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.eventDateFormatted}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Venue</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.venueName}, ${FAKE.location}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Address</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.venueAddress}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Arrival</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.arrivalTime}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Start / Finish</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.startTime} – ${FAKE.finishTime}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your role</td><td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;">${FAKE.instrument}</td></tr>
        </table>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;"><a href="#" style="display:block;text-align:center;padding:12px 0;background:#16a34a;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">✓ Yes, I'm available</a></td>
          <td style="padding-left:8px;"><a href="#" style="display:block;text-align:center;padding:12px 0;background:#dc2626;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">✗ Not available</a></td>
        </tr>
      </table>
      <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;">If you have any questions, reply to this email.</p>
    </div>
  </div>
</body>
</html>`
}

function availabilityReminderHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Availability reminder</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">Hi ${FAKE.musicianName},</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">
        This is a reminder — we haven't heard back from you yet. Please confirm your availability by <strong>Thursday 1 May 2026, 18:00</strong>.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:110px;">Date</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.eventDateFormatted}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Venue</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.venueName}, ${FAKE.location}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Start / Finish</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.startTime} – ${FAKE.finishTime}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Your role</td><td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;">${FAKE.instrument}</td></tr>
        </table>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding-right:8px;"><a href="#" style="display:block;text-align:center;padding:12px 0;background:#16a34a;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">✓ Yes, I'm available</a></td>
          <td style="padding-left:8px;"><a href="#" style="display:block;text-align:center;padding:12px 0;background:#dc2626;color:#fff;font-size:14px;font-weight:600;border-radius:6px;text-decoration:none;">✗ Not available</a></td>
        </tr>
      </table>
      <p style="font-size:12px;color:#9ca3af;margin:20px 0 0;">If you have any questions, reply to this email.</p>
    </div>
  </div>
</body>
</html>`
}

function gigConfirmationHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Gig confirmed ✓</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${FAKE.musicianName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">Thanks for confirming — you're booked in for the following event.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;width:110px;vertical-align:top;">Date</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.eventDateFormatted}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">Venue</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.venueName}, ${FAKE.location}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">Address</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.venueAddress}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">Arrival</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.arrivalTime}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">Start / Finish</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.startTime} – ${FAKE.finishTime}</td></tr>
          <tr><td style="padding:5px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;vertical-align:top;">Your role</td><td style="padding:5px 0;font-size:13px;color:#111827;">${FAKE.instrument}</td></tr>
        </table>
      </div>
      <p style="font-size:13px;color:#374151;margin:0 0 20px;">Add this event to your calendar:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding-right:8px;"><a href="${FAKE.googleCalUrl}" style="display:block;text-align:center;padding:11px 0;background:#4285f4;color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-decoration:none;">Google Calendar</a></td>
          <td style="padding-left:8px;"><a href="${FAKE.icalUrl}" style="display:block;text-align:center;padding:11px 0;background:#374151;color:#fff;font-size:13px;font-weight:600;border-radius:6px;text-decoration:none;">Download (.ics)</a></td>
        </tr>
      </table>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
        <p style="font-size:13px;color:#78350f;margin:0;">If any of your details have changed (including dietaries) please get in touch by email to update.</p>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin:0;">If you have any questions, reply to this email and we'll be happy to help.</p>
    </div>
  </div>
</body>
</html>`
}

function generalOnboardHtml() {
  const deadline = new Date(FAKE.deadlineDate).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
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
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${FAKE.firstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">We're delighted to welcome you to the Ward Smith Entertainment musician roster. We work with a wide range of clients and look forward to having you perform with us.</p>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">To get you set up, please take a moment to complete your profile.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:2px;">Please respond by</div>
        <div style="font-size:14px;color:#78350f;font-weight:500;">${deadline}</div>
      </div>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">This only takes a couple of minutes and helps us manage bookings smoothly.</p>
      <a href="#" style="display:block;text-align:center;padding:14px 0;background:#111827;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;margin-bottom:24px;">Complete my profile →</a>
      <p style="font-size:12px;color:#9ca3af;margin:0;">If you have any questions, reply to this email and we'll be happy to help.</p>
    </div>
  </div>
</body>
</html>`
}

function infoRequestHtml() {
  const deadline = new Date(FAKE.deadlineDate).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
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
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${FAKE.firstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hope you're well. We have an upcoming engagement and need a few additional details from you before we can confirm everything.</p>
      <p style="font-size:14px;color:#374151;margin:0 0 20px;">Specifically, we need the following:</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Personal</div>
          <ul style="margin:0;padding-left:18px;">
            <li style="font-size:13px;color:#374151;margin-bottom:2px;">Address</li>
            <li style="font-size:13px;color:#374151;margin-bottom:2px;">Date of birth</li>
          </ul>
        </div>
        <div>
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Travel</div>
          <ul style="margin:0;padding-left:18px;">
            <li style="font-size:13px;color:#374151;margin-bottom:2px;">Car registration</li>
          </ul>
        </div>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:2px;">Please respond by</div>
        <div style="font-size:14px;color:#78350f;font-weight:500;">${deadline}</div>
      </div>
      <p style="font-size:14px;color:#374151;margin:0 0 24px;">Please complete the short form below at your earliest convenience.</p>
      <a href="#" style="display:block;text-align:center;padding:14px 0;background:#111827;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;margin-bottom:24px;">Provide my details →</a>
      <p style="font-size:12px;color:#9ca3af;margin:0;">If you have any questions, reply to this email and we'll be happy to help.</p>
    </div>
  </div>
</body>
</html>`
}

function onboardingReminderHtml(isUrgent: boolean) {
  const deadline = new Date(FAKE.deadlineDate).toLocaleString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  })
  const urgency = isUrgent
    ? "This is an urgent reminder — your deadline is approaching very soon."
    : "Just a friendly reminder that we're still waiting for your details."
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="background:#111827;padding:24px 32px;">
      <div style="font-size:13px;font-weight:600;color:#9ca3af;letter-spacing:0.08em;text-transform:uppercase;">Ward Smith Entertainment</div>
      <div style="font-size:20px;font-weight:700;color:#fff;margin-top:6px;">Reminder: details still needed</div>
    </div>
    <div style="padding:28px 32px;">
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">Hi <strong>${FAKE.firstName}</strong>,</p>
      <p style="font-size:14px;color:#374151;margin:0 0 16px;">${urgency}</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <div style="font-size:12px;font-weight:600;color:#92400e;margin-bottom:2px;">Please respond by</div>
        <div style="font-size:14px;color:#78350f;font-weight:500;">${deadline}</div>
      </div>
      <a href="#" style="display:block;text-align:center;padding:14px 0;background:#111827;color:#fff;font-size:15px;font-weight:600;border-radius:6px;text-decoration:none;margin-bottom:24px;">Complete my details →</a>
      <p style="font-size:12px;color:#9ca3af;margin:0;">If you have any questions, reply to this email and we'll be happy to help.</p>
    </div>
  </div>
</body>
</html>`
}

// ── Template registry ──────────────────────────────────────────────────────

const TEMPLATES: Record<string, { subject: string; type: EmailType; html: () => string }> = {
  availability_request: {
    subject: `[TEST] Event Invite — ${FAKE.eventDateFormatted}`,
    type: 'availability',
    html: availabilityRequestHtml,
  },
  availability_reminder: {
    subject: `[TEST] Availability reminder — ${FAKE.eventDateFormatted}`,
    type: 'availability_reminder',
    html: availabilityReminderHtml,
  },
  gig_confirmation: {
    subject: `[TEST] Gig confirmed — ${FAKE.eventDateFormatted}`,
    type: 'confirmation',
    html: gigConfirmationHtml,
  },
  general_onboard: {
    subject: '[TEST] Welcome to Ward Smith Entertainment — please complete your profile',
    type: 'onboarding',
    html: generalOnboardHtml,
  },
  info_request: {
    subject: '[TEST] Ward Smith Entertainment — we need a few more details',
    type: 'onboarding',
    html: infoRequestHtml,
  },
  onboarding_reminder_1: {
    subject: '[TEST] Reminder: Ward Smith Entertainment — details still needed',
    type: 'onboarding_reminder',
    html: () => onboardingReminderHtml(false),
  },
  onboarding_reminder_urgent: {
    subject: '[TEST] URGENT: Ward Smith Entertainment — details still needed',
    type: 'onboarding_reminder',
    html: () => onboardingReminderHtml(true),
  },
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { template, to } = await req.json() as { template: string; to: string }

    if (!template || !to) {
      return NextResponse.json({ error: 'template and to are required' }, { status: 400 })
    }

    const tmpl = TEMPLATES[template]
    if (!tmpl) {
      return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 })
    }

    await sendEmail({
      type: tmpl.type,
      to,
      recipientName: FAKE.musicianName,
      subject: tmpl.subject,
      html: tmpl.html(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('send-test-email error:', err)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}

// Also export the template list for the settings UI
export async function GET() {
  return NextResponse.json({
    templates: Object.entries(TEMPLATES).map(([key, t]) => ({
      key,
      label: key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()),
    })),
  })
}
