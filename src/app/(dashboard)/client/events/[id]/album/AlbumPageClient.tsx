'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Photo { id:string; photo_url:string; guest_name:string|null; created_at:string }
interface Album { id:string; status:string; photo_count:number; pdf_url:string|null; flipbook_url:string|null; created_at:string; error_msg:string|null }
interface Data   { event:any; photos:Photo[]; album:Album|null; albums_remaining:number }

export default function AlbumPageClient({ eventId }: { eventId:string }) {
  const router = useRouter()
  const [data, setData]           = useState<Data|null>(null)
  const [loading, setLoading]     = useState(true)
  const [toggling, setToggling]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg]             = useState('')
  const [err, setErr]             = useState('')

  const load = () => {
    fetch('/api/client/events/' + eventId + '/album')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }
  useEffect(load, [eventId])

  const toggleAlbum = async (enable: boolean) => {
    setToggling(true); setErr(''); setMsg('')
    const res = await fetch('/api/client/events/' + eventId + '/album/enable', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable })
    })
    const d = await res.json()
    setToggling(false)
    if (!res.ok) { setErr(d.error || 'Failed'); return }
    setMsg(enable ? 'Album enabled — 1 album used from your quota.' : 'Album disabled.')
    load()
  }

  const generate = async () => {
    setGenerating(true); setErr(''); setMsg('')
    const res = await fetch('/api/client/events/' + eventId + '/album/generate', { method: 'POST' })
    const d   = await res.json()
    setGenerating(false)
    if (!res.ok) { setErr(d.error || 'Generation failed'); return }
    setMsg('Album generated successfully!')
    load()
  }

  if (loading) return <div style={styles.page}><p style={styles.muted}>Loading...</p></div>
  if (!data)   return <div style={styles.page}><p style={{color:'#ef4444'}}>Event not found.</p></div>

  const { event, photos, album, albums_remaining } = data

  return (
    <div style={styles.page}>
      <button onClick={() => router.back()} style={styles.back}>← Back to Event</button>

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>{event.name} — Album</h1>
          <p style={styles.sub}>{photos.length} consented photo{photos.length !== 1 ? 's' : ''} collected</p>
        </div>
        <div style={styles.quotaBadge}>
          <span style={styles.quotaNum}>{albums_remaining}</span>
          <span style={styles.quotaLabel}>albums remaining</span>
        </div>
      </div>

      {err && <div style={styles.errorBox}>{err}</div>}
      {msg && <div style={styles.successBox}>{msg}</div>}

      {/* Album enable/disable */}
      <div style={styles.card}>
        <div style={styles.cardRow}>
          <div>
            <p style={styles.cardTitle}>Album Storage</p>
            <p style={styles.cardSub}>
              {event.album_enabled
                ? 'Enabled — guests can consent to save their photo to this album.'
                : 'Disabled — no photos are being saved for this event.'}
            </p>
          </div>
          <button
            onClick={() => toggleAlbum(!event.album_enabled)}
            disabled={toggling}
            style={{ ...styles.btn, ...(event.album_enabled ? styles.btnDanger : styles.btnPrimary) }}>
            {toggling ? '...' : event.album_enabled ? 'Disable Album' : 'Enable Album'}
          </button>
        </div>
        {!event.album_enabled && albums_remaining === 0 && (
          <p style={{ fontSize:12, color:'#f59e0b', marginTop:8 }}>
            You have no albums remaining. Contact your agent to add more.
          </p>
        )}
      </div>

      {/* Generate section */}
      {event.album_enabled && (
        <div style={styles.card}>
          <p style={styles.cardTitle}>Generate Album</p>
          <p style={styles.cardSub}>
            Creates a PDF and flipbook viewer from all {photos.length} consented photo{photos.length !== 1 ? 's' : ''}.
            {photos.length === 0 && ' No consented photos yet — wait for guests to opt in.'}
          </p>

          {album && (
            <div style={styles.albumStatus}>
              <span style={{ ...styles.statusBadge, ...(album.status === 'ready' ? styles.badgeGreen : album.status === 'error' ? styles.badgeRed : styles.badgeYellow) }}>
                {album.status}
              </span>
              <span style={styles.muted}>{album.photo_count} photos · {new Date(album.created_at).toLocaleString()}</span>
            </div>
          )}

          {album?.status === 'error' && album.error_msg && (
            <p style={{ fontSize:12, color:'#ef4444', marginTop:8 }}>Error: {album.error_msg}</p>
          )}

          <div style={{ display:'flex', gap:12, marginTop:16, flexWrap:'wrap' }}>
            <button onClick={generate} disabled={generating || photos.length === 0} style={{ ...styles.btn, ...styles.btnPrimary }}>
              {generating ? 'Generating...' : album?.status === 'ready' ? 'Regenerate' : 'Generate Album'}
            </button>
            {album?.status === 'ready' && album.pdf_url && (
              <a href={album.pdf_url} target="_blank" rel="noreferrer" style={{ ...styles.btn, ...styles.btnGhost }}>
                Download PDF
              </a>
            )}
            {album?.status === 'ready' && album.flipbook_url && (
              <a href={'/client/events/' + eventId + '/album/flipbook'} target="_blank" rel="noreferrer" style={{ ...styles.btn, ...styles.btnGhost }}>
                View Flipbook
              </a>
            )}
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={styles.card}>
          <p style={styles.cardTitle}>Consented Photos ({photos.length})</p>
          <div style={styles.grid}>
            {photos.map(p => (
              <div key={p.id} style={styles.photoWrap}>
                <img src={p.photo_url} alt={p.guest_name || 'Photo'} style={styles.photo} />
                {p.guest_name && <p style={styles.photoCaption}>{p.guest_name}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page:         { padding:'32px', maxWidth:'900px' },
  back:         { background:'none', border:'none', color:'#6b7280', fontSize:'14px', cursor:'pointer', marginBottom:'20px', padding:0 },
  header:       { display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'24px', gap:'16px', flexWrap:'wrap' },
  title:        { fontSize:'24px', fontWeight:700, color:'#111827', margin:0 },
  sub:          { fontSize:'14px', color:'#6b7280', marginTop:'4px' },
  quotaBadge:   { display:'flex', flexDirection:'column', alignItems:'center', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'12px', padding:'12px 20px' },
  quotaNum:     { fontSize:'28px', fontWeight:800, color:'#16a34a', lineHeight:1 },
  quotaLabel:   { fontSize:'11px', color:'#6b7280', marginTop:'4px' },
  card:         { background:'white', border:'1px solid #e5e7eb', borderRadius:'12px', padding:'20px', marginBottom:'16px' },
  cardRow:      { display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' },
  cardTitle:    { fontSize:'15px', fontWeight:600, color:'#111827', marginBottom:'4px' },
  cardSub:      { fontSize:'13px', color:'#6b7280' },
  errorBox:     { background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' },
  successBox:   { background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', marginBottom:'16px' },
  albumStatus:  { display:'flex', alignItems:'center', gap:'10px', marginTop:'12px' },
  statusBadge:  { display:'inline-flex', padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:600 },
  badgeGreen:   { background:'rgba(22,163,74,0.1)', color:'#16a34a' },
  badgeRed:     { background:'rgba(220,38,38,0.1)', color:'#dc2626' },
  badgeYellow:  { background:'rgba(217,119,6,0.1)', color:'#d97706' },
  muted:        { fontSize:'12px', color:'#9ca3af' },
  btn:          { display:'inline-flex', alignItems:'center', padding:'9px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:500, cursor:'pointer', border:'none', textDecoration:'none', whiteSpace:'nowrap' },
  btnPrimary:   { background:'#2563eb', color:'white' },
  btnDanger:    { background:'#fee2e2', color:'#dc2626', border:'1px solid #fecaca' },
  btnGhost:     { background:'#f9fafb', color:'#374151', border:'1px solid #e5e7eb' },
  grid:         { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(120px, 1fr))', gap:'12px', marginTop:'16px' },
  photoWrap:    { display:'flex', flexDirection:'column', gap:'4px' },
  photo:        { width:'100%', aspectRatio:'390/600', objectFit:'cover', borderRadius:'8px', background:'#f3f4f6' },
  photoCaption: { fontSize:'11px', color:'#6b7280', textAlign:'center', margin:0 },
}
