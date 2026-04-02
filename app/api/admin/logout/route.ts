import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  const response = NextResponse.redirect(new URL('/admin/login', _request.url))
  response.cookies.set('wse_admin_auth', '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  })
  return response
}
