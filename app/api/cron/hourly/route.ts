import { NextRequest, NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/get-base-url'
import { processInbox } from '@/app/api/agents/ceo/tools/process-inbox'

/**
 * Combined hourly cron — runs reminders, onboarding-reminders, and email-health
 * in one job to stay within Vercel Hobby plan's 2-cron limit.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const baseUrl = getBaseUrl(req)
  const cronSecret = process.env.CRON_SECRET ?? ''
  const headers = {
    'Authorization': `Bearer ${cronSecret}`,
    'x-cron-secret': cronSecret,
  }

  const [remindersRes, onboardingRes, healthRes, musicianPaymentsRes, cascadeRes, inboxRes] = await Promise.allSettled([
    fetch(`${baseUrl}/api/cron/reminders`, { headers }),
    fetch(`${baseUrl}/api/cron/onboarding-reminders`, { headers }),
    fetch(`${baseUrl}/api/cron/email-health`, { headers }),
    fetch(`${baseUrl}/api/cron/musician-payment-reminders`, { headers }),
    fetch(`${baseUrl}/api/cron/cascade`, { headers }),
    processInbox(),
  ])

  const results = {
    reminders: remindersRes.status === 'fulfilled' ? await remindersRes.value.json() : { error: String((remindersRes as PromiseRejectedResult).reason) },
    onboarding: onboardingRes.status === 'fulfilled' ? await onboardingRes.value.json() : { error: String((onboardingRes as PromiseRejectedResult).reason) },
    emailHealth: healthRes.status === 'fulfilled' ? await healthRes.value.json() : { error: String((healthRes as PromiseRejectedResult).reason) },
    musicianPayments: musicianPaymentsRes.status === 'fulfilled' ? await musicianPaymentsRes.value.json() : { error: String((musicianPaymentsRes as PromiseRejectedResult).reason) },
    cascade: cascadeRes.status === 'fulfilled' ? await cascadeRes.value.json() : { error: String((cascadeRes as PromiseRejectedResult).reason) },
    inbox: inboxRes.status === 'fulfilled' ? inboxRes.value : { error: String((inboxRes as PromiseRejectedResult).reason) },
  }

  return NextResponse.json({ ok: true, ...results })
}
