import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, createItem, updateItem } from '@directus/sdk'
import { getSession } from '@/lib/auth'
import { generateSlug } from '@/lib/utils'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { name, description, tagline, storage_enabled, pin, thanks_message, clientId, bg_color, accent_color } = await request.json()
    if (!name) return NextResponse.json({ error: 'Event name required' }, { status: 400 })
    const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
    const slug = generateSlug(name)
    await client.request(createItem('events' as never, {
      client_id: clientId, name, description: description || null,
      tagline: tagline || null, slug, pin: pin || null,
      thanks_message: thanks_message || null,
      bg_color: bg_color || '#0a0a0a',
      accent_color: accent_color || '#3b82f6',
      is_active: true, storage_enabled: storage_enabled || false,
    } as never))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { id, name, description, tagline, storage_enabled, pin, thanks_message, bg_color, accent_color } = await request.json()
    if (!id) return NextResponse.json({ error: 'Event ID required' }, { status: 400 })
    const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
    await client.request(updateItem('events' as never, id, {
      name, description: description || null,
      tagline: tagline || null, pin: pin || null,
      thanks_message: thanks_message || null,
      bg_color: bg_color || '#0a0a0a',
      accent_color: accent_color || '#3b82f6',
      storage_enabled: storage_enabled || false,
    } as never))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 })
  }
}
