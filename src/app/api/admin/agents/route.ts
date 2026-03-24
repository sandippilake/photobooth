import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, createItem } from '@directus/sdk'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
  const res = await fetch(
    `${DIRECTUS_URL}/items/users?filter[role][_eq]=agent&fields=id,name,email,is_active,created_at`,
    { headers: { Authorization: `Bearer ${session.token}` } }
  )
  const data = await res.json()
  return NextResponse.json({ data: data.data || [] })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email, password } = await request.json()
  if (!name || !email || !password)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
  const hash = await bcrypt.hash(password, 10)

  await client.request(createItem('users' as never, {
    name, email,
    password_hash: hash,
    role: 'agent',
    is_active: true,
  } as never))

  return NextResponse.json({ ok: true })
}
