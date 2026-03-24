import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole('agent')
  if (error) return error
  const agentId = session!.id
  const [[client]] = await pool.query(`
    SELECT u.id,u.name,u.email,u.is_active,u.created_at,
      COALESCE(ca.allocated_uses,0) AS quota_allocated,
      COALESCE(ca.used_uses,0)      AS quota_used
    FROM users u LEFT JOIN client_quota_allocations ca ON ca.client_id=u.id
    WHERE u.id=? AND u.agent_id=? AND u.role='client'`, [params.id, agentId]) as any
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const [events] = await pool.query(
    'SELECT id,name,slug,is_active,created_at,quota_allocated,quota_used FROM events WHERE client_id=? ORDER BY created_at DESC',
    [params.id]) as any
  const [recentLogs] = await pool.query(`
    SELECT ul.action,ul.guest_name,ul.created_at,e.name AS event_name
    FROM usage_logs ul JOIN events e ON e.id=ul.event_id
    WHERE ul.client_id=? ORDER BY ul.created_at DESC LIMIT 20`, [params.id]) as any
  return NextResponse.json({ data: { client, events, recentLogs } })
}
