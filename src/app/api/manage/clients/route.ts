import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export async function GET() {
  const { error, session } = await requireRole('agent')
  if (error) return error
  const agentId = session!.id

  const [rows] = await pool.query(`
    SELECT
      u.id, u.name, u.email, u.is_active, u.created_at,
      COALESCE(ca.allocated_uses,   0) AS usages_allocated,
      COALESCE(ca.used_uses,        0) AS usages_used,
      COALESCE(ca.albums_allocated, 0) AS albums_allocated,
      COALESCE(ca.albums_used,      0) AS albums_used,
      (SELECT COUNT(*) FROM events e WHERE e.client_id=u.id) AS event_count
    FROM users u
    LEFT JOIN client_quota_allocations ca ON ca.client_id=u.id
    WHERE u.agent_id=? AND u.role='client'
    ORDER BY u.created_at DESC`, [agentId])

  const [[pool_row]] = await pool.query(
    'SELECT total_purchased,total_allocated,total_used,albums_purchased,albums_allocated,albums_used FROM agent_quota_pools WHERE agent_id=?',
    [agentId]) as any

  return NextResponse.json({ data: rows, quota_pool: pool_row || null })
}

export async function POST(req: NextRequest) {
  const { error, session } = await requireRole('agent')
  if (error) return error
  const agentId = session!.id
  const { name, email, password, usages, albums } = await req.json()
  if (!name||!email||!password)
    return NextResponse.json({ error: 'name, email, password required' }, { status: 400 })

  const u = Number(usages)||0, a = Number(albums)||0

  const [[ap]] = await pool.query(
    'SELECT total_purchased,total_allocated,albums_purchased,albums_allocated FROM agent_quota_pools WHERE agent_id=?',
    [agentId]) as any
  if (!ap) return NextResponse.json({ error: 'No quota pool' }, { status: 400 })

  const usagesAvail = ap.total_purchased - ap.total_allocated
  const albumsAvail = ap.albums_purchased - ap.albums_allocated
  if (u > usagesAvail)
    return NextResponse.json({ error: 'Insufficient usages. Available: ' + usagesAvail }, { status: 409 })
  if (a > albumsAvail)
    return NextResponse.json({ error: 'Insufficient albums. Available: ' + albumsAvail }, { status: 409 })

  const [ex] = await pool.query('SELECT id FROM users WHERE email=?', [email]) as any
  if ((ex as any[]).length)
    return NextResponse.json({ error: 'Email exists' }, { status: 409 })

  const cid=uuidv4(), aid=uuidv4(), hash=await bcrypt.hash(password,10)
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    await conn.query("INSERT INTO users (id,email,password_hash,role,name,agent_id,is_active) VALUES (?,?,?,'client',?,?,1)",[cid,email,hash,name,agentId])
    await conn.query(
      'INSERT INTO client_quota_allocations (id,client_id,agent_id,allocated_uses,used_uses,albums_allocated,albums_used) VALUES (?,?,?,?,0,?,0)',
      [aid,cid,agentId,u,a])
    await conn.query('UPDATE agent_quota_pools SET total_allocated=total_allocated+?, albums_allocated=albums_allocated+? WHERE agent_id=?',[u,a,agentId])
    await conn.commit()
  } catch(e){ await conn.rollback(); throw e } finally { conn.release() }
  return NextResponse.json({ data:{id:cid,email,name} }, { status:201 })
}
