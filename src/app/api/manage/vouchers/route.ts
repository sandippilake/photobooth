import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/manage/vouchers
 * Admin creates voucher for an agent.
 * Agent creates voucher for a client.
 *
 * Body:
 *   to_id        — recipient user id (agent or client)
 *   usages       — number of usage credits (0 = none)
 *   albums       — number of album credits (0 = none)
 *   invoice_ref  — invoice/reference number (optional)
 *   voucher_date — ISO date string, defaults to today
 *   notes        — required free-text note
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['admin','agent'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { to_id, usages, albums, invoice_ref, voucher_date, notes } = await req.json()

  if (!to_id)
    return NextResponse.json({ error: 'to_id is required' }, { status: 400 })
  if (!notes?.trim())
    return NextResponse.json({ error: 'Notes are required' }, { status: 400 })
  if ((!usages || usages <= 0) && (!albums || albums <= 0))
    return NextResponse.json({ error: 'At least one of usages or albums must be > 0' }, { status: 400 })

  const u = Math.max(0, Number(usages) || 0)
  const a = Math.max(0, Number(albums) || 0)
  const vDate = voucher_date || new Date().toISOString().slice(0, 10)
  const ref   = invoice_ref?.trim() || null

  // Verify recipient exists and role chain is correct
  const [[recipient]] = await pool.query(
    'SELECT id, role, agent_id FROM users WHERE id = ? AND is_active = 1',
    [to_id]
  ) as any
  if (!recipient)
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  if (session.role === 'admin' && recipient.role !== 'agent')
    return NextResponse.json({ error: 'Admin can only issue vouchers to agents' }, { status: 400 })
  if (session.role === 'agent') {
    if (recipient.role !== 'client')
      return NextResponse.json({ error: 'Agent can only issue vouchers to clients' }, { status: 400 })
    if (recipient.agent_id !== session.id)
      return NextResponse.json({ error: 'This client does not belong to you' }, { status: 403 })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // Insert transaction rows (one per type if > 0)
    if (u > 0) {
      await conn.query(
        `INSERT INTO quota_transactions
           (id, from_role, from_id, to_role, to_id, type, quantity, notes, invoice_ref, voucher_date, created_by)
         VALUES (?, ?, ?, ?, ?, 'usages', ?, ?, ?, ?, ?)`,
        [uuidv4(), session.role, session.id, recipient.role, to_id,
         u, notes.trim(), ref, vDate, session.id]
      )
    }
    if (a > 0) {
      await conn.query(
        `INSERT INTO quota_transactions
           (id, from_role, from_id, to_role, to_id, type, quantity, notes, invoice_ref, voucher_date, created_by)
         VALUES (?, ?, ?, ?, ?, 'albums', ?, ?, ?, ?, ?)`,
        [uuidv4(), session.role, session.id, recipient.role, to_id,
         a, notes.trim(), ref, vDate, session.id]
      )
    }

    // Update quota pool / allocation atomically
    if (session.role === 'admin') {
      // Admin → agent: increment agent pool
      await conn.query(
        `UPDATE agent_quota_pools
         SET total_purchased   = total_purchased   + ?,
             albums_purchased  = albums_purchased  + ?
         WHERE agent_id = ?`,
        [u, a, to_id]
      )
    } else {
      // Agent → client: check pool has enough, then allocate
      const [[pool_row]] = await conn.query(
        'SELECT total_purchased, total_allocated, albums_purchased, albums_allocated FROM agent_quota_pools WHERE agent_id = ?',
        [session.id]
      ) as any
      if (!pool_row)
        throw new Error('Agent quota pool not found')

      const usagesAvail = pool_row.total_purchased  - pool_row.total_allocated
      const albumsAvail = pool_row.albums_purchased - pool_row.albums_allocated

      if (u > usagesAvail)
        throw new Error('Insufficient usages in your pool. Available: ' + usagesAvail)
      if (a > albumsAvail)
        throw new Error('Insufficient albums in your pool. Available: ' + albumsAvail)

      // Increment client allocation
      await conn.query(
        `UPDATE client_quota_allocations
         SET allocated_uses   = allocated_uses   + ?,
             albums_allocated = albums_allocated + ?
         WHERE client_id = ?`,
        [u, a, to_id]
      )
      // Decrement agent available
      await conn.query(
        `UPDATE agent_quota_pools
         SET total_allocated  = total_allocated  + ?,
             albums_allocated = albums_allocated + ?
         WHERE agent_id = ?`,
        [u, a, session.id]
      )
    }

    await conn.commit()
  } catch(e: any) {
    await conn.rollback()
    return NextResponse.json({ error: e.message || 'Failed to create voucher' }, { status: 409 })
  } finally {
    conn.release()
  }

  return NextResponse.json({ ok: true })
}
