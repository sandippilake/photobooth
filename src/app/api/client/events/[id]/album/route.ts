import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const [[event]] = await pool.query(
    'SELECT id, name FROM events WHERE id = ? AND client_id = ?',
    [id, session.id]
  ) as any
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [photos] = await pool.query(
    `SELECT id, photo_url, guest_name, created_at
     FROM usage_logs
     WHERE event_id = ? AND consent = 1 AND photo_url IS NOT NULL
     ORDER BY created_at ASC`,
    [id]
  ) as any

  const [[album]] = await pool.query(
    `SELECT id, status, photo_count, pdf_url, flipbook_url, created_at, error_msg
     FROM event_albums WHERE event_id = ? ORDER BY created_at DESC LIMIT 1`,
    [id]
  ) as any

  const [[pkg]] = await pool.query(
    `SELECT albums_total, albums_used FROM client_packages
     WHERE client_id = ? ORDER BY assigned_at DESC LIMIT 1`,
    [session.id]
  ) as any

  const albumEnabled = !!album

  return NextResponse.json({
    event: { ...event, album_enabled: albumEnabled },
    photos,
    album: album || null,
    albums_remaining: pkg ? pkg.albums_total - pkg.albums_used : 0,
  })
}
