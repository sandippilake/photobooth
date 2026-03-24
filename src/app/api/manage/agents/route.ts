import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const { error } = await requireRole('admin')
  if (error) return error
  const [rows] = await pool.query(`
    SELECT
      u.id, u.name, u.email, u.is_active, u.created_at,
      COALESCE(q.total_purchased,   0) AS usages_purchased,
      COALESCE(q.total_allocated,   0) AS usages_allocated,
      COALESCE(q.total_used,        0) AS usages_used,
      COALESCE(q.albums_purchased,  0) AS albums_purchased,
      COALESCE(q.albums_allocated,  0) AS albums_allocated,
      COALESCE(q.albums_used,       0) AS albums_used,
      (SELECT COUNT(*) FROM users c WHERE c.agent_id=u.id AND c.role='client') AS client_count
    FROM users u
    LEFT JOIN agent_quota_pools q ON q.agent_id=u.id
    WHERE u.role='agent'
    ORDER BY u.created_at DESC`)
  return NextResponse.json({ data: rows })
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole('admin')
  if (error) return error
  const { name, email, password, usages, albums } = await req.json()
  if (!name||!email||!password)
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })
  const [ex] = await pool.query('SELECT id FROM users WHERE email=?', [email]) as any
  if ((ex as any[]).length)
    return NextResponse.json({ error: 'Email exists' }, { status: 409 })
  const id=uuidv4(), pid=uuidv4(), hash=await bcrypt.hash(password,10)
  const u=Number(usages)||0, a=Number(albums)||0
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query("INSERT INTO users (id,email,password_hash,role,name,is_active) VALUES (?,?,?,'agent',?,1)",[id,email,hash,name])
    await conn.query(
      'INSERT INTO agent_quota_pools (id,agent_id,total_purchased,total_allocated,total_used,albums_purchased,albums_allocated,albums_used) VALUES (?,?,?,0,0,?,0,0)',
      [pid,id,u,a])
    await conn.commit()
  } catch(e){ await conn.rollback(); throw e } finally { conn.release() }
  return NextResponse.json({ data:{id,email,name} }, { status:201 })
}
