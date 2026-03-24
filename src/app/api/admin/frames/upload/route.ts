import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import pool from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/admin/frames/upload
 * Admin uploads a gallery frame PNG/SVG.
 * Stores the file as a base64 data URL in the DB (simple storage).
 * For production, swap with S3 upload via @/lib/s3.
 *
 * Body: { name, fileDataUrl, fileName }
 */
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, fileDataUrl, fileName } = await req.json()

  if (!name || !fileDataUrl)
    return NextResponse.json({ error: 'name and fileDataUrl required' }, { status: 400 })

  // Validate it's an image
  if (!fileDataUrl.startsWith('data:image/'))
    return NextResponse.json({ error: 'Invalid file type — must be an image' }, { status: 400 })

  const id = uuidv4()

  // Store data URL directly as png_url and thumbnail_url
  // For production: upload to S3/R2 and store the public URL instead
  await pool.query(
    `INSERT INTO frames
       (id, name, type, png_url, thumbnail_url, is_global, created_by,
        placeholder_schema, crop_rect, image_objects)
     VALUES (?, ?, 'gallery', ?, ?, 1, ?, '[]', NULL, '[]')`,
    [id, name.trim(), fileDataUrl, fileDataUrl, session.id]
  )

  return NextResponse.json({ ok: true, id, name })
}
