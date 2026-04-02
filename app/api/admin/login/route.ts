import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { password } = body as { password: string }

  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ ok: true })
    response.cookies.set('wse_admin_auth', password, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    })
    return response
  }

  return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
}
