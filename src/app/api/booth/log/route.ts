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

  if (!eventId || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  if (!['downloaded', 'shared'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // ── 1. Load event ──────────────────────────────────────────────────────
    const [[event]] = await conn.query(
      'SELECT id, client_id, is_active, quota_allocated, quota_used FROM events WHERE id = ?',
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

    // ── 2. Per-event quota check (0 = no limit set) ────────────────────────
    if (event.quota_allocated > 0 && event.quota_used >= event.quota_allocated) {
      await conn.rollback()
      return NextResponse.json(
        { error: 'Event quota reached', code: 'EVENT_QUOTA_EXCEEDED' },
        { status: 429 }
      )
    }

    // ── 3. Load client allocation ──────────────────────────────────────────
    const [[alloc]] = await conn.query(
      `SELECT id, agent_id, allocated_uses, used_uses
       FROM client_quota_allocations
       WHERE client_id = ?
       FOR UPDATE`,
      [event.client_id]
    ) as any

    if (!alloc) {
      await conn.rollback()
      return NextResponse.json({ error: 'Client quota not configured' }, { status: 403 })
    }

    // ── 4. Per-client quota check ──────────────────────────────────────────
    if (alloc.allocated_uses > 0 && alloc.used_uses >= alloc.allocated_uses) {
      await conn.rollback()
      return NextResponse.json(
        { error: 'Client quota reached', code: 'CLIENT_QUOTA_EXCEEDED' },
        { status: 429 }
      )
    }

    // ── 5. Atomically increment all counters ───────────────────────────────
    await conn.query(
      'UPDATE client_quota_allocations SET used_uses = used_uses + 1 WHERE id = ?',
      [alloc.id]
    )

    await conn.query(
      'UPDATE agent_quota_pools SET total_used = total_used + 1 WHERE agent_id = ?',
      [alloc.agent_id]
    )

    await conn.query(
      'UPDATE events SET quota_used = quota_used + 1 WHERE id = ?',
      [eventId]
    )

    // ── 6. Write usage log ─────────────────────────────────────────────────
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
        eventId,
        event.client_id,
        action,
        hashIp(ip),
        guest?.name    || null,
        guest?.phone   || null,
        guest?.message || null,
      ]
    )

    await conn.commit()

    // Return remaining quota so the booth UI can show it if needed
    const remaining = alloc.allocated_uses > 0
      ? alloc.allocated_uses - alloc.used_uses - 1
      : null

        // Return the inserted log id so the booth can call /api/booth/save-photo
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
