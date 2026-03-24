import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole('agent')
  if (error) return error
  const agentId = session!.id

  const { allocated_uses, albums_allocated, notes } = await req.json()

  if (!notes || !notes.trim())
    return NextResponse.json({ error: 'Notes are required' }, { status: 400 })

  const [[c]] = await pool.query(
    "SELECT id FROM users WHERE id=? AND agent_id=? AND role='client'",
    [params.id, agentId]) as any
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [[a]] = await pool.query(
    'SELECT allocated_uses, used_uses, albums_allocated, albums_used FROM client_quota_allocations WHERE client_id=?',
    [params.id]) as any
  if (!a) return NextResponse.json({ error: 'Quota record missing' }, { status: 404 })

  const [[ap]] = await pool.query(
    'SELECT total_purchased, total_allocated, albums_purchased, albums_allocated FROM agent_quota_pools WHERE agent_id=?',
    [agentId]) as any

  // Validate usages
  let usagesDelta = 0
  if (allocated_uses !== undefined) {
    if (allocated_uses < a.used_uses)
      return NextResponse.json({ error: 'Cannot go below used usages (' + a.used_uses + ')' }, { status: 409 })
    usagesDelta = allocated_uses - a.allocated_uses
    if (usagesDelta > 0) {
      const avail = ap.total_purchased - ap.total_allocated
      if (usagesDelta > avail)
        return NextResponse.json({ error: 'Insufficient usages in pool. Available: ' + avail }, { status: 409 })
    }
  }

  // Validate albums
  let albumsDelta = 0
  if (albums_allocated !== undefined) {
    if (albums_allocated < a.albums_used)
      return NextResponse.json({ error: 'Cannot go below used albums (' + a.albums_used + ')' }, { status: 409 })
    albumsDelta = albums_allocated - a.albums_allocated
    if (albumsDelta > 0) {
      const avail = ap.albums_purchased - ap.albums_allocated
      if (albumsDelta > avail)
        return NextResponse.json({ error: 'Insufficient albums in pool. Available: ' + avail }, { status: 409 })
    }
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const sets: string[] = [], vals: any[] = []
    if (allocated_uses   !== undefined) { sets.push('allocated_uses=?');   vals.push(allocated_uses) }
    if (albums_allocated !== undefined) { sets.push('albums_allocated=?'); vals.push(albums_allocated) }
    if (sets.length) {
      vals.push(params.id)
      await conn.query('UPDATE client_quota_allocations SET ' + sets.join(',') + ' WHERE client_id=?', vals)
    }

    await conn.query(
      'UPDATE agent_quota_pools SET total_allocated=total_allocated+?, albums_allocated=albums_allocated+? WHERE agent_id=?',
      [usagesDelta, albumsDelta, agentId])

    // Record transactions
    if (allocated_uses !== undefined && usagesDelta !== 0) {
      await conn.query(
        'INSERT INTO quota_transactions (id,from_role,from_id,to_role,to_id,type,quantity,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [uuidv4(), 'agent', agentId, 'client', params.id, 'usages', usagesDelta, notes.trim(), agentId])
    }
    if (albums_allocated !== undefined && albumsDelta !== 0) {
      await conn.query(
        'INSERT INTO quota_transactions (id,from_role,from_id,to_role,to_id,type,quantity,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [uuidv4(), 'agent', agentId, 'client', params.id, 'albums', albumsDelta, notes.trim(), agentId])
    }

    await conn.commit()
  } catch(e) { await conn.rollback(); throw e } finally { conn.release() }

  return NextResponse.json({ success: true })
}
