import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole('admin')
  if (error) return error
  const { password } = await req.json()
  if (!password || password.length < 6)
    return NextResponse.json({ error: 'Min 6 chars' }, { status: 400 })
  const hash = await bcrypt.hash(password, 10)
  const [r] = await pool.query(
    "UPDATE users SET password_hash=?,updated_at=NOW() WHERE id=? AND role='agent'",
    [hash, params.id]) as any
  if (!r.affectedRows) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ success: true })
}
