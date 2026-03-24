import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { uploadPhoto } from '@/lib/s3'

/**
 * Called after guest composes their photo.
 * Uploads photo to S3/R2 if consent given, updates usage_log with photo_url + consent.
 *
 * Body: { usageLogId, photoDataUrl, consent: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { usageLogId, photoDataUrl, consent } = await req.json()
    if (!usageLogId) return NextResponse.json({ error: 'usageLogId required' }, { status: 400 })

    // Verify the usage log exists and get event info
    const [[log]] = await pool.query(
      'SELECT ul.id, ul.event_id, ul.client_id, e.album_enabled FROM usage_logs ul JOIN events e ON e.id = ul.event_id WHERE ul.id = ?',
      [usageLogId]
    ) as any

    if (!log) return NextResponse.json({ error: 'Usage log not found' }, { status: 404 })

    let photoUrl: string | null = null

    // Only upload if consent given AND album is enabled for this event
    if (consent && log.album_enabled && photoDataUrl) {
      const key = 'photos/' + log.event_id + '/' + usageLogId + '.jpg'
      photoUrl = await uploadPhoto(photoDataUrl, key)
    }

    // Update the usage log with consent + photo_url
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
