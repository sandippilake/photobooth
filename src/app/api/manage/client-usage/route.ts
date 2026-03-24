import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [[alloc]] = await pool.query(
    'SELECT allocated_uses,used_uses,albums_allocated,albums_used FROM client_quota_allocations WHERE client_id=?',
    [session.id]) as any

  const [events] = await pool.query(`
    SELECT
      e.id, e.name, e.slug, e.is_active, e.album_enabled,
      e.quota_allocated, e.quota_used,
      (SELECT COUNT(*) FROM usage_logs ul WHERE ul.event_id=e.id) AS total_actions,
      (SELECT COUNT(*) FROM usage_logs ul WHERE ul.event_id=e.id AND ul.consent=1 AND ul.photo_url IS NOT NULL) AS consented_photos
    FROM events e
    WHERE e.client_id=?
    ORDER BY e.created_at DESC`, [session.id]) as any

  const [recentLogs] = await pool.query(`
    SELECT ul.action, ul.consent, ul.guest_name, ul.created_at, e.name AS event_name
    FROM usage_logs ul
    JOIN events e ON e.id=ul.event_id
    WHERE ul.client_id=?
    ORDER BY ul.created_at DESC LIMIT 30`, [session.id]) as any

  return NextResponse.json({
    quota: alloc || { allocated_uses:0, used_uses:0, albums_allocated:0, albums_used:0 },
    events,
    recentLogs,
  })
}
