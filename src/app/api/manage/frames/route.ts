import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [rows] = await pool.query(`
    SELECT id, name, type, png_url, thumbnail_url, is_global,
           placeholder_schema, created_at
    FROM frames
    ORDER BY name ASC`)
  return NextResponse.json({ data: rows })
}
