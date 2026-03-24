import { NextRequest, NextResponse } from 'next/server'
import { createDirectus, rest, staticToken, createItem } from '@directus/sdk'
import { getSession } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'client') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, clientId, fileDataUrl, fileName } = await request.json()
    if (!name || !fileDataUrl) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const base64 = fileDataUrl.split(',')[1]
    const buffer = Buffer.from(base64, 'base64')
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-')
    const uniqueName = `${clientId}-${Date.now()}-${safeName}`
    const dir = join(process.cwd(), 'public', 'frames', 'custom')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, uniqueName), buffer)

    const fileUrl = `/frames/custom/${uniqueName}`

    const client = createDirectus(DIRECTUS_URL).with(staticToken(session.token)).with(rest())
    await client.request(createItem('frames' as never, {
      name,
      type: 'custom',
      png_url: fileUrl,
      thumbnail_url: fileUrl,
      is_global: false,
      created_by: clientId,
      placeholder_schema: [],
    } as never))

    return NextResponse.json({ ok: true, url: fileUrl })
  } catch (err: any) {
    console.error('Frame upload error:', err)
    return NextResponse.json({ error: err.message || 'Upload failed' }, { status: 500 })
  }
}
