import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { uploadBuffer } from '@/lib/s3'

export interface AlbumPhoto {
  url: string
  guest_name: string | null
  created_at: string
}

/**
 * Generate a PDF album from a list of photo URLs.
 * Layout: 2 photos per page, event name header on first page.
 * Page size: A4 portrait (595 x 842 pt)
 */
export async function generateAlbumPdf(
  eventName: string,
  eventId: string,
  photos: AlbumPhoto[]
): Promise<string> {
  const doc  = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica)

  const PAGE_W = 595
  const PAGE_H = 842
  const MARGIN = 40
  const PHOTO_W = (PAGE_W - MARGIN * 3) / 2   // ~237pt
  const PHOTO_H = Math.round(PHOTO_W * 600 / 390)  // maintain 390:600 ratio ~365pt
  const COL_GAP = MARGIN
  const ROW_GAP = 32
  const HEADER_H = 60

  // Fetch all photos and embed them
  const embedded: (Awaited<ReturnType<typeof doc.embedJpg>> | null)[] = []
  for (const photo of photos) {
    try {
      const res  = await fetch(photo.url)
      const buf  = Buffer.from(await res.arrayBuffer())
      // Try JPEG first, fall back to PNG
      try {
        embedded.push(await doc.embedJpg(buf))
      } catch {
        embedded.push(await doc.embedPng(buf))
      }
    } catch {
      embedded.push(null)
    }
  }

  // Calculate how many photos fit per page
  // First page has header taking HEADER_H + 16px gap
  const firstPageRows = Math.floor((PAGE_H - MARGIN * 2 - HEADER_H - 16) / (PHOTO_H + ROW_GAP))
  const otherPageRows = Math.floor((PAGE_H - MARGIN * 2) / (PHOTO_H + ROW_GAP))
  const COLS = 2

  let photoIdx = 0
  let pageNum  = 0

  while (photoIdx < photos.length) {
    const page = doc.addPage([PAGE_W, PAGE_H])
    const maxRows = pageNum === 0 ? firstPageRows : otherPageRows
    let startY = PAGE_H - MARGIN

    if (pageNum === 0) {
      // Header
      page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: rgb(0.05, 0.05, 0.08) })
      page.drawText(eventName, {
        x: MARGIN, y: PAGE_H - HEADER_H + 20,
        font, size: 22, color: rgb(0.94, 0.75, 0.38),
      })
      page.drawText('Photo Album', {
        x: MARGIN, y: PAGE_H - HEADER_H + 6,
        font: bodyFont, size: 10, color: rgb(0.6, 0.6, 0.6),
      })
      startY = PAGE_H - HEADER_H - 16
    }

    for (let row = 0; row < maxRows && photoIdx < photos.length; row++) {
      for (let col = 0; col < COLS && photoIdx < photos.length; col++) {
        const x = MARGIN + col * (PHOTO_W + COL_GAP)
        const y = startY - (row + 1) * (PHOTO_H + ROW_GAP) + ROW_GAP

        const img = embedded[photoIdx]
        if (img) {
          page.drawImage(img, { x, y, width: PHOTO_W, height: PHOTO_H })
        } else {
          page.drawRectangle({ x, y, width: PHOTO_W, height: PHOTO_H, color: rgb(0.9, 0.9, 0.9) })
          page.drawText('Photo unavailable', { x: x + 10, y: y + PHOTO_H / 2, font: bodyFont, size: 9, color: rgb(0.5, 0.5, 0.5) })
        }

        // Guest name caption
        const guestName = photos[photoIdx].guest_name
        if (guestName) {
          page.drawText(guestName, {
            x: x + 4, y: y - 14,
            font: bodyFont, size: 9, color: rgb(0.4, 0.4, 0.4),
          })
        }
        photoIdx++
      }
    }

    // Page number
    page.drawText('Page ' + (pageNum + 1), {
      x: PAGE_W - MARGIN - 40, y: 20,
      font: bodyFont, size: 8, color: rgb(0.7, 0.7, 0.7),
    })
    pageNum++
  }

  const pdfBytes = await doc.save()
  const key = 'albums/' + eventId + '/album-' + Date.now() + '.pdf'
  return await uploadBuffer(Buffer.from(pdfBytes), key, 'application/pdf')
}
