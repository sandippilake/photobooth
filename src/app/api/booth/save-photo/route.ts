import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { uploadPhoto } from '@/lib/s3'

export async function POST(req: NextRequest) {
  try {
    const { usageLogId, photoDataUrl, consent } = await req.json()
    if (!usageLogId) return NextResponse.json({ error: 'usageLogId required' }, { status: 400 })

    const [[log]] = await pool.query(
      `SELECT ul.id, ul.event_id, ul.client_id
       FROM usage_logs ul
       JOIN events e ON e.id = ul.event_id
       WHERE ul.id = ?`,
      [usageLogId]
    ) as any
    if (!log) return NextResponse.json({ error: 'Usage log not found' }, { status: 404 })

    let photoUrl: string | null = null

    if (consent && photoDataUrl) {
      // Check if album is enabled for this event (event_albums row exists)
      const [[albumRow]] = await pool.query(
        'SELECT id FROM event_albums WHERE event_id = ?',
        [log.event_id]
      ) as any

      if (albumRow) {
        const key = 'photos/' + log.event_id + '/' + usageLogId + '.jpg'
        photoUrl = await uploadPhoto(photoDataUrl, key)
      }
    }

    await pool.query(
      'UPDATE usage_logs SET consent = ?, photo_url = ? WHERE id = ?',
      [consent ? 1 : 0, photoUrl, usageLogId]
    )

    return NextResponse.json({ ok: true, photo_url: photoUrl })
  } catch (err) {
    console.error('[save-photo]', err)
    return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
  }
}
