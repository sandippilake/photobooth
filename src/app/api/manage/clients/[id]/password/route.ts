import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole('agent')
  if (error) return error
  const agentId = session!.id
  const { password } = await req.json()
  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Min 6 chars' }, { status: 400 })
  const [[c]] = await pool.query(
    "SELECT id FROM users WHERE id=? AND agent_id=? AND role='client'", [params.id, agentId]) as any
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await pool.query('UPDATE users SET password_hash=?,updated_at=NOW() WHERE id=?',
    [await bcrypt.hash(password, 10), params.id])
  return NextResponse.json({ success: true })
}
