import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole('admin')
  if (error) return error
  const [[agent]] = await pool.query(`
    SELECT u.id,u.name,u.email,u.is_active,u.created_at,
      COALESCE(q.total_purchased,0) AS quota_total,
      COALESCE(q.total_allocated,0) AS quota_allocated,
      COALESCE(q.total_used,0)      AS quota_used
    FROM users u LEFT JOIN agent_quota_pools q ON q.agent_id=u.id
    WHERE u.id=? AND u.role='agent'`, [params.id]) as any
  if (!agent) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const [clients] = await pool.query(`
    SELECT u.id,u.name,u.email,u.is_active,u.created_at,
      COALESCE(ca.allocated_uses,0) AS quota_allocated,
      COALESCE(ca.used_uses,0)      AS quota_used
    FROM users u LEFT JOIN client_quota_allocations ca ON ca.client_id=u.id
    WHERE u.agent_id=? AND u.role='client' ORDER BY u.created_at DESC`, [params.id]) as any
  return NextResponse.json({ data: { agent, clients } })
}
