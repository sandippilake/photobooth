import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/manage-auth'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error, session } = await requireRole('admin')
  if (error) return error

  const { total_purchased, albums_purchased, notes } = await req.json()

  if (!notes || !notes.trim())
    return NextResponse.json({ error: 'Notes are required' }, { status: 400 })

  const [[cur]] = await pool.query(
    'SELECT total_purchased, total_allocated, albums_purchased, albums_allocated FROM agent_quota_pools WHERE agent_id=?',
    [params.id]) as any
  if (!cur) return NextResponse.json({ error: 'Pool not found' }, { status: 404 })

  // Validate
  if (total_purchased !== undefined) {
    if (typeof total_purchased !== 'number' || total_purchased < 0)
      return NextResponse.json({ error: 'Invalid usages value' }, { status: 400 })
    if (total_purchased < cur.total_allocated)
      return NextResponse.json({ error: 'Cannot go below allocated usages (' + cur.total_allocated + ')' }, { status: 409 })
  }
  if (albums_purchased !== undefined) {
    if (typeof albums_purchased !== 'number' || albums_purchased < 0)
      return NextResponse.json({ error: 'Invalid albums value' }, { status: 400 })
    if (albums_purchased < cur.albums_allocated)
      return NextResponse.json({ error: 'Cannot go below allocated albums (' + cur.albums_allocated + ')' }, { status: 409 })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const sets: string[] = [], vals: any[] = []
    if (total_purchased  !== undefined) { sets.push('total_purchased=?');  vals.push(total_purchased) }
    if (albums_purchased !== undefined) { sets.push('albums_purchased=?'); vals.push(albums_purchased) }
    if (sets.length) {
      vals.push(params.id)
      await conn.query('UPDATE agent_quota_pools SET ' + sets.join(',') + ' WHERE agent_id=?', vals)
    }

    // Record transactions
    if (total_purchased !== undefined && total_purchased !== cur.total_purchased) {
      await conn.query(
        'INSERT INTO quota_transactions (id,from_role,from_id,to_role,to_id,type,quantity,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [uuidv4(), 'admin', session!.id, 'agent', params.id, 'usages',
         total_purchased - cur.total_purchased, notes.trim(), session!.id])
    }
    if (albums_purchased !== undefined && albums_purchased !== cur.albums_purchased) {
      await conn.query(
        'INSERT INTO quota_transactions (id,from_role,from_id,to_role,to_id,type,quantity,notes,created_by) VALUES (?,?,?,?,?,?,?,?,?)',
        [uuidv4(), 'admin', session!.id, 'agent', params.id, 'albums',
         albums_purchased - cur.albums_purchased, notes.trim(), session!.id])
    }

    await conn.commit()
  } catch(e) { await conn.rollback(); throw e } finally { conn.release() }

  return NextResponse.json({ success: true })
}
