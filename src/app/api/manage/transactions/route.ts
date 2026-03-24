import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const url    = new URL(req.url)
  const filter = url.searchParams.get('agent_id') // optional filter
  const limit  = Math.min(Number(url.searchParams.get('limit') || 100), 500)

  let rows: any[]

  if (session.role === 'admin') {
    // Admin sees everything, optionally filtered by agent
    const where = filter ? 'WHERE qt.from_id=? OR qt.to_id=?' : ''
    const params = filter ? [filter, filter, limit] : [limit]
    ;[rows] = await pool.query(`
      SELECT
        qt.id, qt.type, qt.quantity, qt.notes, qt.created_at,
        qt.from_role, qt.to_role,
        fu.name AS from_name, fu.email AS from_email,
        tu.name AS to_name,   tu.email AS to_email,
        cb.name AS created_by_name
      FROM quota_transactions qt
      JOIN users fu ON fu.id = qt.from_id
      JOIN users tu ON tu.id = qt.to_id
      JOIN users cb ON cb.id = qt.created_by
      ${where}
      ORDER BY qt.created_at DESC
      LIMIT ?`, params) as any

  } else if (session.role === 'agent') {
    // Agent sees transactions where they are from or to
    ;[rows] = await pool.query(`
      SELECT
        qt.id, qt.type, qt.quantity, qt.notes, qt.created_at,
        qt.from_role, qt.to_role,
        fu.name AS from_name, fu.email AS from_email,
        tu.name AS to_name,   tu.email AS to_email,
        cb.name AS created_by_name
      FROM quota_transactions qt
      JOIN users fu ON fu.id = qt.from_id
      JOIN users tu ON tu.id = qt.to_id
      JOIN users cb ON cb.id = qt.created_by
      WHERE qt.from_id=? OR qt.to_id=?
      ORDER BY qt.created_at DESC
      LIMIT ?`, [session.id, session.id, limit]) as any

  } else {
    // Client sees transactions where they are the recipient
    ;[rows] = await pool.query(`
      SELECT
        qt.id, qt.type, qt.quantity, qt.notes, qt.created_at,
        qt.from_role, qt.to_role,
        fu.name AS from_name,
        cb.name AS created_by_name
      FROM quota_transactions qt
      JOIN users fu ON fu.id = qt.from_id
      JOIN users cb ON cb.id = qt.created_by
      WHERE qt.to_id=?
      ORDER BY qt.created_at DESC
      LIMIT ?`, [session.id, limit]) as any
  }

  return NextResponse.json({ data: rows })
}
