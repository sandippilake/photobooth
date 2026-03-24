import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { generateAlbumPdf } from '@/lib/album-generator'
import { v4 as uuidv4 } from 'uuid'

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [[event]] = await pool.query(
    'SELECT id, name, album_enabled FROM events WHERE id = ? AND client_id = ?',
    [params.id, session.id]
  ) as any
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!event.album_enabled)
    return NextResponse.json({ error: 'Album not enabled for this event' }, { status: 400 })

  // Get consented photos
  const [photos] = await pool.query(
    `SELECT id, photo_url, guest_name, created_at
     FROM usage_logs
     WHERE event_id = ? AND consent = 1 AND photo_url IS NOT NULL
     ORDER BY created_at ASC`,
    [params.id]
  ) as any

  if (!photos.length)
    return NextResponse.json({ error: 'No consented photos to generate album from' }, { status: 400 })

  // Create album record with 'generating' status
  const albumId = uuidv4()
  await pool.query(
    `INSERT INTO event_albums (id, event_id, client_id, status, photo_count)
     VALUES (?, ?, ?, 'generating', ?)`,
    [albumId, params.id, session.id, photos.length]
  )

  // Generate PDF (async — could be moved to a background job later)
  try {
    const pdfUrl = await generateAlbumPdf(event.name, params.id, photos)

    // Build flipbook metadata URL (list of photo URLs stored as JSON in S3)
    const { uploadBuffer } = await import('@/lib/s3')
    const flipbookData = JSON.stringify({
      eventName: event.name,
      generatedAt: new Date().toISOString(),
      photos: photos.map((p: any) => ({
        url:        p.photo_url,
        guestName:  p.guest_name,
        capturedAt: p.created_at,
      }))
    })
    const flipbookKey = 'albums/' + params.id + '/flipbook-' + albumId + '.json'
    const { uploadBuffer: ub } = await import('@/lib/s3')
    const flipbookUrl = await ub(Buffer.from(flipbookData), flipbookKey, 'application/json')

    await pool.query(
      `UPDATE event_albums SET status='ready', pdf_url=?, flipbook_url=?, updated_at=NOW() WHERE id=?`,
      [pdfUrl, flipbookUrl, albumId]
    )

    return NextResponse.json({ ok: true, albumId, pdfUrl, flipbookUrl, photoCount: photos.length })
  } catch (err: any) {
    await pool.query(
      `UPDATE event_albums SET status='error', error_msg=?, updated_at=NOW() WHERE id=?`,
      [err?.message || 'Unknown error', albumId]
    )
    console.error('[generate-album]', err)
    return NextResponse.json({ error: 'Generation failed: ' + (err?.message || 'unknown') }, { status: 500 })
  }
}
