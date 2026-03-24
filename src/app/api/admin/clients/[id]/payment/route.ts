import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { payment_status } = await request.json()

  await db.query(
    `UPDATE client_packages SET payment_status = ? WHERE client_id = ? ORDER BY assigned_at DESC LIMIT 1`,
    [payment_status, id]
  )
  return NextResponse.json({ ok: true })
}
