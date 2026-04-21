import { NextRequest, NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wse.vercel.app'

/**
 * Combined hourly cron — runs reminders, onboarding-reminders, and email-health
 * in one job to stay within Vercel Hobby plan's 2-cron limit.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cronSecret = process.env.CRON_SECRET ?? ''
  const headers = {
    'Authorization': `Bearer ${cronSecret}`,
    'x-cron-secret': cronSecret,
  }

  const [remindersRes, onboardingRes, healthRes] = await Promise.allSettled([
    fetch(`${BASE_URL}/api/cron/reminders`, { headers }),
    fetch(`${BASE_URL}/api/cron/onboarding-reminders`, { headers }),
    fetch(`${BASE_URL}/api/cron/email-health`, { headers }),
  ])

  const results = {
    reminders: remindersRes.status === 'fulfilled' ? await remindersRes.value.json() : { error: String((remindersRes as PromiseRejectedResult).reason) },
    onboarding: onboardingRes.status === 'fulfilled' ? await onboardingRes.value.json() : { error: String((onboardingRes as PromiseRejectedResult).reason) },
    emailHealth: healthRes.status === 'fulfilled' ? await healthRes.value.json() : { error: String((healthRes as PromiseRejectedResult).reason) },
  }

  return NextResponse.json({ ok: true, ...results })
}
