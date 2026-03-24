import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { SessionUser } from '@/types'

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
const COOKIE_NAME = 'pb_session'

export async function createSession(user: SessionUser): Promise<string> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET)
  return token
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  console.log('getSession token:', token ? token.slice(0, 20) + '...' : 'MISSING')
  console.log('getSession SECRET length:', SECRET.length)
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    console.log('getSession payload role:', (payload as any).role)
    return payload as unknown as SessionUser
  } catch (err) {
    console.log('getSession error:', err)
    return null
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
