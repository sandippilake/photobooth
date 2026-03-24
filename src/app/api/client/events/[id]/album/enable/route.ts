import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const eventId  = params.id
  const { enable } = await req.json()  // true = enable, false = disable

  // Verify event belongs to this client
  const [[event]] = await pool.query(
    'SELECT id, album_enabled, album_consumed FROM events WHERE id = ? AND client_id = ?',
    [eventId, session.id]
  ) as any
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  if (enable) {
    // Already enabled — no-op
    if (event.album_enabled) return NextResponse.json({ ok: true, already: true })

    // Check client has albums available
    const [[alloc]] = await pool.query(
      'SELECT albums_allocated, albums_used FROM client_quota_allocations WHERE client_id = ?',
      [session.id]
    ) as any

    const albumsAvail = alloc ? alloc.albums_allocated - alloc.albums_used : 0
    if (albumsAvail <= 0) {
      return NextResponse.json({ error: 'No albums remaining in your quota. Contact your agent to top up.' }, { status: 402 })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('UPDATE events SET album_enabled = 1, album_consumed = 1 WHERE id = ?', [eventId])
      await conn.query('UPDATE client_quota_allocations SET albums_used = albums_used + 1 WHERE client_id = ?', [session.id])
      // Also increment agent pool
      await conn.query(`
        UPDATE agent_quota_pools aqp
        JOIN client_quota_allocations cqa ON cqa.agent_id = aqp.agent_id
        SET aqp.albums_used = aqp.albums_used + 1
        WHERE cqa.client_id = ?`, [session.id])
      await conn.commit()
    } catch(e) { await conn.rollback(); throw e } finally { conn.release() }
  } else {
    // Disabling — only allowed if no photos have been saved yet
    const [[photoCount]] = await pool.query(
      'SELECT COUNT(*) AS cnt FROM usage_logs WHERE event_id = ? AND consent = 1 AND photo_url IS NOT NULL',
      [eventId]
    ) as any
    if (photoCount.cnt > 0) {
      return NextResponse.json({ error: 'Cannot disable album — photos already saved. Contact support.' }, { status: 409 })
    }

    const conn = await pool.getConnection()
    try {
      await conn.beginTransaction()
      await conn.query('UPDATE events SET album_enabled = 0 WHERE id = ?', [eventId])
      // Refund the album if it was consumed
      if (event.album_consumed) {
        await conn.query('UPDATE events SET album_consumed = 0 WHERE id = ?', [eventId])
        await conn.query('UPDATE client_quota_allocations SET albums_used = GREATEST(0, albums_used - 1) WHERE client_id = ?', [session.id])
        await conn.query(`
          UPDATE agent_quota_pools aqp
          JOIN client_quota_allocations cqa ON cqa.agent_id = aqp.agent_id
          SET aqp.albums_used = GREATEST(0, aqp.albums_used - 1)
          WHERE cqa.client_id = ?`, [session.id])
      }
      await conn.commit()
    } catch(e) { await conn.rollback(); throw e } finally { conn.release() }
  }

  return NextResponse.json({ ok: true })
}
