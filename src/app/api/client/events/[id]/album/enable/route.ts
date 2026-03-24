import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: eventId } = await params
  const { enable } = await req.json()

  // Verify event belongs to this client
  const [[event]] = await pool.query(
    'SELECT id FROM events WHERE id = ? AND client_id = ?',
    [eventId, session.id]
  ) as any
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Load active client package
  const [[pkg]] = await pool.query(
    `SELECT id, albums_total, albums_used
     FROM client_packages
     WHERE client_id = ?
     ORDER BY assigned_at DESC LIMIT 1`,
    [session.id]
  ) as any

  if (!pkg)
    return NextResponse.json({ error: 'No package assigned to your account' }, { status: 402 })

  if (enable) {
    // Check album quota
    if (pkg.albums_used >= pkg.albums_total)
      return NextResponse.json({ error: 'No albums remaining in your package. Contact your agent.' }, { status: 402 })

    // Check if album already exists for this event
    const [[existing]] = await pool.query(
      'SELECT id, status FROM event_albums WHERE event_id = ?',
      [eventId]
    ) as any

    if (existing) return NextResponse.json({ ok: true, already: true })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query(
        `INSERT INTO event_albums (event_id, client_id, status, photo_count)
         VALUES (?, ?, 'pending', 0)`,
        [eventId, session.id]
      )
      await conn.query(
        'UPDATE client_packages SET albums_used = albums_used + 1 WHERE id = ?',
        [pkg.id]
      )
      await conn.commit()
    } catch (e) { await conn.rollback(); throw e } finally { conn.release() }

  } else {
    // Disabling — only if no photos saved yet
    const [[photoCount]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM usage_logs WHERE event_id = ? AND consent = 1 AND photo_url IS NOT NULL',
      [eventId]
    ) as any

    if (photoCount.cnt > 0)
      return NextResponse.json({ error: 'Cannot disable album — photos already saved.' }, { status: 409 })

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('DELETE FROM event_albums WHERE event_id = ?', [eventId])
      await conn.query(
        'UPDATE client_packages SET albums_used = GREATEST(0, albums_used - 1) WHERE id = ?',
        [pkg.id]
      )
      await conn.commit()
    } catch (e) { await conn.rollback(); throw e } finally { conn.release() }
  }

  return NextResponse.json({ ok: true })
}
