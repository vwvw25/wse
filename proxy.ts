import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only guard /admin routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  const isLoginPage = pathname === '/admin/login'
  const cookie = request.cookies.get('wse_admin_auth')
  const isAuthed = cookie?.value === process.env.ADMIN_PASSWORD

  if (isAuthed && isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (!isAuthed && !isLoginPage) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
