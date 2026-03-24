import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

function hashIp(ip: string): string {
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

export async function POST(request: NextRequest) {
  const { eventId, action, guest } = await request.json()

  if (!eventId || !action)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  if (!['downloaded', 'shared'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 1. Load event
    const [[event]] = await conn.query(
      'SELECT id, client_id, is_active FROM events WHERE id = ?',
      [eventId]
    ) as any

    if (!event) {
      await conn.rollback()
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (!event.is_active) {
      await conn.rollback()
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 })
    }

    // 2. Load active client package (most recently assigned)
    const [[pkg]] = await conn.query(
      `SELECT id, usages_total, usages_used
       FROM client_packages
       WHERE client_id = ?
       ORDER BY assigned_at DESC LIMIT 1
       FOR UPDATE`,
      [event.client_id]
    ) as any

    if (!pkg) {
      await conn.rollback()
      return NextResponse.json({ error: 'No package assigned to this client' }, { status: 403 })
    }

    // 3. Quota check
    if (pkg.usages_total > 0 && pkg.usages_used >= pkg.usages_total) {
      await conn.rollback()
      return NextResponse.json(
        { error: 'Usage quota reached', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      )
    }

    // 4. Increment usage
    await conn.query(
      'UPDATE client_packages SET usages_used = usages_used + 1 WHERE id = ?',
      [pkg.id]
    )

    // 5. Write usage log
    const ip = (
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    ).split(',')[0].trim()

    await conn.query(
      `INSERT INTO usage_logs
         (event_id, client_id, action, ip_hash, guest_name, guest_phone, guest_message)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId, event.client_id, action, hashIp(ip),
        guest?.name || null, guest?.phone || null, guest?.message || null,
      ]
    )

    await conn.commit()

    const remaining = pkg.usages_total > 0
      ? pkg.usages_total - pkg.usages_used - 1
      : null

    const [[inserted]] = await conn.query(
      'SELECT id FROM usage_logs WHERE event_id=? AND client_id=? ORDER BY created_at DESC LIMIT 1',
      [eventId, event.client_id]
    ) as any

    return NextResponse.json({ ok: true, remaining, usageLogId: inserted?.id || null })

  } catch (err) {
    await conn.rollback()
    console.error('[booth/log] error:', err)
    return NextResponse.json({ error: 'Failed to log usage' }, { status: 500 })
  } finally {
    conn.release()
  }
}
