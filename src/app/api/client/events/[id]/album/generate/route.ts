import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { generateAlbumPdf } from '@/lib/album-generator'
import { v4 as uuidv4 } from 'uuid'

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'client')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  const [[event]] = await pool.query(
    'SELECT id, name FROM events WHERE id = ? AND client_id = ?',
    [id, session.id]
  ) as any
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check album record exists (created by enable route)
  const [[existingAlbum]] = await pool.query(
    'SELECT id FROM event_albums WHERE event_id = ?',
    [id]
  ) as any
  if (!existingAlbum)
    return NextResponse.json({ error: 'Album not enabled for this event' }, { status: 400 })

  const [photos] = await pool.query(
    `SELECT id, photo_url, guest_name, created_at
     FROM usage_logs
     WHERE event_id = ? AND consent = 1 AND photo_url IS NOT NULL
     ORDER BY created_at ASC`,
    [id]
  ) as any

  if (!photos.length)
    return NextResponse.json({ error: 'No consented photos to generate album from' }, { status: 400 })

  const albumId = uuidv4()
  await pool.query(
    `INSERT INTO event_albums (id, event_id, client_id, status, photo_count)
     VALUES (?, ?, ?, 'generating', ?)
     ON DUPLICATE KEY UPDATE status='generating', photo_count=?`,
    [albumId, id, session.id, photos.length, photos.length]
  )

  try {
    const pdfUrl = await generateAlbumPdf(event.name, id, photos)
    const { uploadBuffer } = await import('@/lib/s3')
    const flipbookData = JSON.stringify({
      eventName: event.name,
      generatedAt: new Date().toISOString(),
      photos: photos.map((p: any) => ({
        url: p.photo_url, guestName: p.guest_name, capturedAt: p.created_at,
      }))
    })
    const flipbookKey = 'albums/' + id + '/flipbook-' + albumId + '.json'
    const flipbookUrl = await uploadBuffer(Buffer.from(flipbookData), flipbookKey, 'application/json')

    await pool.query(
      `UPDATE event_albums SET status='ready', pdf_url=?, flipbook_url=?, updated_at=NOW() WHERE event_id=?`,
      [pdfUrl, flipbookUrl, id]
    )
    return NextResponse.json({ ok: true, albumId, pdfUrl, flipbookUrl, photoCount: photos.length })
  } catch (err: any) {
    await pool.query(
      `UPDATE event_albums SET status='error', error_msg=?, updated_at=NOW() WHERE event_id=?`,
      [err?.message || 'Unknown error', id]
    )
    return NextResponse.json({ error: 'Generation failed: ' + (err?.message || 'unknown') }, { status: 500 })
  }
}
