import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)

const ROLE_ROUTES: Record<string, string[]> = {
  '/admin':  ['admin'],
  '/agent':  ['agent'],
  '/client': ['client'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/booth'))      return NextResponse.next()
  if (pathname.startsWith('/_next'))      return NextResponse.next()
  if (pathname.startsWith('/api'))        return NextResponse.next()
  if (pathname.startsWith('/bg-remover')) return NextResponse.next()
  if (pathname === '/favicon.ico')        return NextResponse.next()

  const raw = request.cookies.get('pb_session')?.value

  if (!raw) {
    if (pathname.startsWith('/login')) return NextResponse.next()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  let payload: any = null
  try {
    const token = decodeURIComponent(raw)
    const result = await jwtVerify(token, SECRET)
    payload = result.payload
  } catch {
    if (pathname.startsWith('/login')) return NextResponse.next()
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.delete('pb_session')
    return res
  }

  if (pathname.startsWith('/login')) {
    const role = payload.role as string
    if (role === 'admin')  return NextResponse.redirect(new URL('/admin/agents', request.url))
    if (role === 'agent')  return NextResponse.redirect(new URL('/agent/clients', request.url))
    if (role === 'client') return NextResponse.redirect(new URL('/client/events', request.url))
    return NextResponse.next()
  }

  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route) && !roles.includes(payload.role)) {
      const role = payload.role as string
      if (role === 'admin')  return NextResponse.redirect(new URL('/admin/agents', request.url))
      if (role === 'agent')  return NextResponse.redirect(new URL('/agent/clients', request.url))
      if (role === 'client') return NextResponse.redirect(new URL('/client/events', request.url))
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
