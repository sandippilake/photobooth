import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, createItem, readItems } from '@directus/sdk'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import db from '@/lib/db'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'agent')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())

  const users = await client.request(readItems('users' as never, {
    filter: { referring_agent_id: { _eq: session.id }, role: { _eq: 'client' } },
    fields: ['id', 'name', 'email', 'is_active', 'created_at'],
  })) as any[]

  // Fetch active package for each client
  const clientsWithPackage = await Promise.all((users || []).map(async (u: any) => {
    const [rows]: any = await db.query(
      `SELECT cp.usages_total, cp.usages_used, cp.albums_total, cp.albums_used,
              cp.payment_status, p.name as package_name
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

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'agent')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email, password, package_id } = await request.json()
  if (!name || !email || !password || !package_id)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  // Load package details
  const [pkgRows]: any = await db.query(
    'SELECT * FROM packages WHERE id = ? AND is_active = 1', [package_id]
  )
  if (!pkgRows.length)
    return NextResponse.json({ error: 'Invalid or inactive package' }, { status: 400 })

  const pkg = pkgRows[0]
  const commission = (pkg.price * pkg.commission_pct) / 100

  const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
  const hash = await bcrypt.hash(password, 10)

  const newUser = await client.request(createItem('users' as never, {
    name, email,
    password_hash: hash,
    role: 'client',
    referring_agent_id: session.id,
    is_active: true,
  } as never)) as any

  await db.query(
    `INSERT INTO client_packages
       (client_id, package_id, referring_agent_id, usages_total, usages_used,
        albums_total, albums_used, commission_amount, payment_status, assigned_by)
     VALUES (?, ?, ?, ?, 0, ?, 0, ?, 'pending', ?)`,
    [newUser.id, package_id, session.id, pkg.usages, pkg.albums, commission, session.id]
  )

  return NextResponse.json({ ok: true })
}
