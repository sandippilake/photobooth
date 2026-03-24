import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, authentication, readItems, staticToken } from '@directus/sdk'
import { createSession, setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const authClient = createDirectus(DIRECTUS_URL)
      .with(authentication())
      .with(rest())

    await authClient.login(process.env.DIRECTUS_ADMIN_EMAIL!, process.env.DIRECTUS_ADMIN_PASSWORD!)
    const tokenData = await authClient.getToken()
    const adminToken = tokenData as string

    const adminClient = createDirectus(DIRECTUS_URL)
      .with(staticToken(adminToken))
      .with(rest())

    const users = await adminClient.request(
      readItems('users' as never, {
        filter: { email: { _eq: email }, is_active: { _eq: true } },
        limit: 1,
      })
    ) as any[]

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const sessionToken = await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      agent_id: user.agent_id,
      token: adminToken,
    })

    await setSessionCookie(sessionToken)

    return NextResponse.json({ ok: true, role: user.role })
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
