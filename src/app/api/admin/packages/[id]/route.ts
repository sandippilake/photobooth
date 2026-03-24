import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { name, description, usages, albums, price, commission_pct, is_active } = await request.json()

  await db.query(
    `UPDATE packages SET name=?, description=?, usages=?, albums=?, price=?, commission_pct=?, is_active=?
     WHERE id=?`,
    [name, description || null, usages, albums, price, commission_pct, is_active ? 1 : 0, id]
  )
  return NextResponse.json({ ok: true })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Check if any client_packages reference this package
  const [rows]: any = await db.query(
    'SELECT COUNT(*) as count FROM client_packages WHERE package_id = ?', [id]
  )
  if (rows[0].count > 0)
    return NextResponse.json({ error: 'Package is assigned to clients and cannot be deleted' }, { status: 400 })

  await db.query('DELETE FROM packages WHERE id = ?', [id])
  return NextResponse.json({ ok: true })
}
