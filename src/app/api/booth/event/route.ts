import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, readItems } from '@directus/sdk'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

async function getAdminToken() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.DIRECTUS_ADMIN_EMAIL,
      password: process.env.DIRECTUS_ADMIN_PASSWORD,
    }),
    cache: 'no-store',
  })
  const data = await res.json()
  return data.data?.access_token
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'No slug' }, { status: 400 })

  const token = await getAdminToken()
  const client = createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest())

  const events = await client.request(readItems('events' as never, {
    filter: { slug: { _eq: slug }, is_active: { _eq: true } },
    fields: ['id', 'name', 'tagline', 'slug', 'pin', 'storage_enabled', 'client_id'],
    limit: 1,
  })) as any[]

  if (!events.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ event: events[0] })
}
