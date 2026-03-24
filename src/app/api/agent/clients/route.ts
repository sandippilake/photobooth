import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'agent')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [users]: any = await db.query(
    `SELECT id, name, email, is_active, created_at
     FROM users
     WHERE role = 'client' AND referring_agent_id = ?`,
    [session.id]
  )

  const clientsWithPackage = await Promise.all((users || []).map(async (u: any) => {
    const [rows]: any = await db.query(
      `SELECT cp.usages_total, cp.usages_used, cp.albums_total, cp.albums_used,
              cp.payment_status, cp.commission_amount, p.name as package_name
       FROM client_packages cp
       JOIN packages p ON p.id = cp.package_id
       WHERE cp.client_id = ?
       ORDER BY cp.assigned_at DESC LIMIT 1`,
      [u.id]
    )
    return { ...u, package: rows[0] || null }
  }))

  return NextResponse.json({ data: clientsWithPackage })
}
