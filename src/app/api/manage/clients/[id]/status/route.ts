import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole('agent')
  if (error) return error
  const agentId = session!.id
  const { is_active } = await req.json()
  const [[c]] = await pool.query(
    "SELECT id FROM users WHERE id=? AND agent_id=? AND role='client'", [params.id, agentId]) as any
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await pool.query('UPDATE users SET is_active=?,updated_at=NOW() WHERE id=?', [is_active ? 1 : 0, params.id])
  return NextResponse.json({ success: true })
}
