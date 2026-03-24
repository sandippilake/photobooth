import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import pool from '@/lib/db'
import FlipbookViewer from './FlipbookViewer'

export default async function FlipbookPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'client') redirect('/login')

  const [[album]] = await pool.query(
    `SELECT ea.flipbook_url, e.name AS event_name
     FROM event_albums ea JOIN events e ON e.id = ea.event_id
     WHERE ea.event_id = ? AND ea.status = 'ready'
     ORDER BY ea.created_at DESC LIMIT 1`,
    [params.id]
  ) as any

  if (!album?.flipbook_url) {
    return <div style={{ padding:32, color:'#6b7280' }}>No flipbook available. Generate the album first.</div>
  }

  // Fetch the flipbook JSON from S3
  let flipbookData: any = null
  try {
    const res = await fetch(album.flipbook_url)
    flipbookData = await res.json()
  } catch {
    return <div style={{ padding:32, color:'#ef4444' }}>Failed to load flipbook data.</div>
  }

  return <FlipbookViewer data={flipbookData} eventName={album.event_name} />
}
