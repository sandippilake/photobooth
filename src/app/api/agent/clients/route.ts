import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, createItem, readItems, updateItem } from '@directus/sdk'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'agent') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, email, password, quota, agentId } = await request.json()
    if (!name || !email || !password || !quota) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
    const quotaInt = parseInt(quota)

    const pools = await client.request(readItems('agent_quota_pools' as never, {
      filter: { agent_id: { _eq: agentId } },
      limit: 1,
    })) as any[]

    if (!pools.length) {
      return NextResponse.json({ error: 'Agent quota pool not found' }, { status: 400 })
    }

    const pool = pools[0]
    const available = pool.total_purchased - pool.total_allocated

    if (quotaInt > available) {
      return NextResponse.json({ error: `Only ${available} uses available in your pool` }, { status: 400 })
    }

    const hash = await bcrypt.hash(password, 10)

    const newUser = await client.request(createItem('users' as never, {
      name,
      email,
      password_hash: hash,
      role: 'client',
      agent_id: agentId,
      is_active: true,
    } as never))

    await client.request(createItem('client_quota_allocations' as never, {
      client_id: (newUser as any).id,
      agent_id: agentId,
      allocated_uses: quotaInt,
      used_uses: 0,
      valid_until: null,
    } as never))

    await client.request(updateItem('agent_quota_pools' as never, pool.id, {
      total_allocated: pool.total_allocated + quotaInt,
    } as never))

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Create client error:', err)
    return NextResponse.json({ error: err.message || 'Failed to create client' }, { status: 500 })
  }
}
