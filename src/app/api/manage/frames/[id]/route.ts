import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

// PATCH — toggle is_global
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { is_global } = await req.json()
  await pool.query('UPDATE frames SET is_global=? WHERE id=?', [is_global ? 1 : 0, params.id])
  return NextResponse.json({ success: true })
}

// DELETE
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Check not in use
  const [[usage]] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM event_frames WHERE frame_id=?', [params.id]) as any
  if (usage.cnt > 0)
    return NextResponse.json(
      { error: 'Frame is assigned to ' + usage.cnt + ' event(s). Remove from events first.' },
      { status: 409 })

  await pool.query('DELETE FROM frames WHERE id=?', [params.id])
  return NextResponse.json({ success: true })
}
