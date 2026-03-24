import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [[event]] = await pool.query(
    'SELECT id, name, album_enabled, album_consumed FROM events WHERE id = ? AND client_id = ?',
    [params.id, session.id]
  ) as any
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Photos with consent
  const [photos] = await pool.query(
    `SELECT id, photo_url, guest_name, created_at
     FROM usage_logs
     WHERE event_id = ? AND consent = 1 AND photo_url IS NOT NULL
     ORDER BY created_at ASC`,
    [params.id]
  ) as any

  // Latest album generation
  const [[album]] = await pool.query(
    `SELECT id, status, photo_count, pdf_url, flipbook_url, created_at, error_msg
     FROM event_albums WHERE event_id = ? ORDER BY created_at DESC LIMIT 1`,
    [params.id]
  ) as any

  // Client quota
  const [[alloc]] = await pool.query(
    'SELECT albums_allocated, albums_used FROM client_quota_allocations WHERE client_id = ?',
    [session.id]
  ) as any

  return NextResponse.json({
    event,
    photos,
    album: album || null,
    albums_remaining: alloc ? alloc.albums_allocated - alloc.albums_used : 0,
  })
}
