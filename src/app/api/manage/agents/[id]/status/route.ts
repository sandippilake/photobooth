import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole('admin')
  if (error) return error
  const { is_active } = await req.json()
  await pool.query("UPDATE users SET is_active=?,updated_at=NOW() WHERE id=? AND role='agent'", [is_active ? 1 : 0, params.id])
  return NextResponse.json({ success: true })
}
