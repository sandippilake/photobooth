import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import db from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [rows] = await db.query(
    'SELECT * FROM packages ORDER BY price ASC'
  )
  return NextResponse.json({ data: rows })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, description, usages, albums, price, commission_pct } = await request.json()
  if (!name || price == null)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  await db.query(
    `INSERT INTO packages (name, description, usages, albums, price, commission_pct)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, description || null, usages || 0, albums || 0, price, commission_pct || 0]
  )
  return NextResponse.json({ ok: true })
}
