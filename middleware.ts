import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

const ROLE_ROUTES: Record<string, string[]> = {
  '/manage/agents':       ['admin'],
  '/manage/frames':       ['admin'],
  '/manage/transactions': ['admin','agent'],
  '/manage/usage':   ['client'],
  '/manage/clients': ['agent'],
  '/manage/quota':   ['agent'],
  '/admin':          ['admin'],
  '/agent':          ['agent'],
  '/client':         ['client'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow these through
  if (pathname.startsWith('/booth'))       return NextResponse.next()
  if (pathname.startsWith('/_next'))       return NextResponse.next()
  if (pathname.startsWith('/api'))         return NextResponse.next()
  if (pathname.startsWith('/bg-remover'))      return NextResponse.next()
  if (pathname.startsWith('/manage/frame-converter')) return NextResponse.next()
  if (pathname === '/favicon.ico')         return NextResponse.next()

  const raw = request.cookies.get('pb_session')?.value

  // Not logged in
  if (!raw) {
    // Allow login page
    if (pathname.startsWith('/login')) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify JWT
  let payload: any = null
  try {
    const token = decodeURIComponent(raw)
    const result = await jwtVerify(token, SECRET)
    payload = result.payload
  } catch {
    // Bad token — clear and redirect to login
    if (pathname.startsWith('/login')) return NextResponse.next()
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('pb_session')
    return res
  }

  // Logged in — redirect away from login page to correct dashboard
  if (pathname.startsWith('/login')) {
    const role = payload.role as string
    if (role === 'admin')  return NextResponse.redirect(new URL('/manage/agents', request.url))
    if (role === 'agent')  return NextResponse.redirect(new URL('/manage/clients', request.url))
    if (role === 'client') return NextResponse.redirect(new URL('/client/events', request.url))
    return NextResponse.next()
  }

  // Check role-based route access
  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route) && !roles.includes(payload.role)) {
      // Wrong role — redirect to their own dashboard
      const role = payload.role as string
      if (role === 'admin')  return NextResponse.redirect(new URL('/manage/agents', request.url))
      if (role === 'agent')  return NextResponse.redirect(new URL('/manage/clients', request.url))
      if (role === 'client') return NextResponse.redirect(new URL('/client/events', request.url))
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
