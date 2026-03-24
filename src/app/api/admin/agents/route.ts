import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, createItem } from '@directus/sdk'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, email, password, quota } = await request.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
    const hash = await bcrypt.hash(password, 10)

    const user = await client.request(createItem('users' as never, {
      name,
      email,
      password_hash: hash,
      role: 'agent',
      is_active: true,
    } as never))

    await client.request(createItem('agent_quota_pools' as never, {
      agent_id: (user as any).id,
      total_purchased: parseInt(quota) || 0,
      total_allocated: 0,
      total_used: 0,
    } as never))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Create agent error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create agent' }, { status: 500 })
  }
}
