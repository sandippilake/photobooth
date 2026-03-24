'use client'
import { useState } from 'react'

interface Photo { url:string; guestName:string|null; capturedAt:string }
interface FlipbookData { eventName:string; generatedAt:string; photos:Photo[] }

export default function FlipbookViewer({ data, eventName }: { data:FlipbookData; eventName:string }) {
  const [page, setPage]       = useState(0)
  const [flipping, setFlipping] = useState(false)
  const [direction, setDir]   = useState<'next'|'prev'>('next')

  const photos     = data.photos
  const totalPages = Math.ceil(photos.length / 2)
  const leftPhoto  = photos[page * 2]     || null
  const rightPhoto = photos[page * 2 + 1] || null

  const go = (dir: 'next'|'prev') => {
    if (flipping) return
    if (dir === 'next' && page >= totalPages - 1) return
    if (dir === 'prev' && page <= 0) return
    setDir(dir)
    setFlipping(true)
    setTimeout(() => { setPage(p => dir === 'next' ? p + 1 : p - 1); setFlipping(false) }, 300)
  }

  return (
    <div style={s.wrap}>
      <div style={s.topBar}>
        <h1 style={s.title}>{eventName}</h1>
        <span style={s.pageNum}>Page {page + 1} of {totalPages}</span>
      </div>

      <div style={s.bookWrap}>
        {/* Left page */}
        <div style={{ ...s.page, ...s.leftPage, ...(flipping && direction === 'prev' ? s.flipLeft : {}) }}>
          {page === 0 ? (
            <div style={s.coverPage}>
              <p style={s.coverTitle}>{eventName}</p>
              <p style={s.coverSub}>{photos.length} photos · {new Date(data.generatedAt).toLocaleDateString()}</p>
            </div>
          ) : leftPhoto ? (
            <div style={s.photoPage}>
              <img src={leftPhoto.url} alt="" style={s.photo} />
              {leftPhoto.guestName && <p style={s.caption}>{leftPhoto.guestName}</p>}
            </div>
          ) : <div style={s.emptyPage} />}
        </div>

        {/* Spine */}
        <div style={s.spine} />

        {/* Right page */}
        <div style={{ ...s.page, ...s.rightPage, ...(flipping && direction === 'next' ? s.flipRight : {}) }}>
          {rightPhoto ? (
            <div style={s.photoPage}>
              <img src={rightPhoto.url} alt="" style={s.photo} />
              {rightPhoto.guestName && <p style={s.caption}>{rightPhoto.guestName}</p>}
            </div>
          ) : <div style={s.emptyPage}><p style={s.endText}>End of Album</p></div>}
        </div>
      </div>

      <div style={s.controls}>
        <button onClick={() => go('prev')} disabled={page === 0 || flipping} style={{ ...s.btn, opacity: page === 0 ? 0.3 : 1 }}>← Prev</button>
        <div style={s.dots}>
          {Array.from({ length: totalPages }).map((_, i) => (
            <div key={i} style={{ ...s.dot, ...(i === page ? s.dotActive : {}) }} onClick={() => setPage(i)} />
          ))}
        </div>
        <button onClick={() => go('next')} disabled={page >= totalPages - 1 || flipping} style={{ ...s.btn, opacity: page >= totalPages - 1 ? 0.3 : 1 }}>Next →</button>
      </div>

      <style>{`
        @keyframes flipRight { from { transform: perspective(1200px) rotateY(0deg); } to { transform: perspective(1200px) rotateY(-30deg); } }
        @keyframes flipLeft  { from { transform: perspective(1200px) rotateY(0deg); } to { transform: perspective(1200px) rotateY(30deg); } }
      `}</style>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  wrap:       { display:'flex', flexDirection:'column', alignItems:'center', minHeight:'100vh', background:'#1a1a2e', padding:'32px 16px' },
  topBar:     { display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', maxWidth:'700px', marginBottom:'24px' },
  title:      { color:'#f0c060', fontWeight:700, fontSize:'20px', margin:0 },
  pageNum:    { color:'rgba(255,255,255,0.4)', fontSize:'13px' },
  bookWrap:   { display:'flex', alignItems:'stretch', boxShadow:'0 30px 80px rgba(0,0,0,0.6)', borderRadius:'4px', overflow:'hidden', maxWidth:'700px', width:'100%' },
  page:       { flex:1, background:'white', minHeight:'500px', transition:'transform 0.3s ease', transformOrigin:'center' },
  leftPage:   { borderRight:'none' },
  rightPage:  { borderLeft:'none' },
  flipRight:  { animation:'flipRight 0.3s ease forwards' },
  flipLeft:   { animation:'flipLeft 0.3s ease forwards' },
  spine:      { width:'8px', background:'linear-gradient(to right, #c8a96e, #e8c98e, #c8a96e)', flexShrink:0 },
  coverPage:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', minHeight:'500px', background:'#0d0f14', padding:'32px' },
  coverTitle: { color:'#f0c060', fontSize:'22px', fontWeight:800, textAlign:'center', margin:0 },
  coverSub:   { color:'rgba(255,255,255,0.4)', fontSize:'13px', marginTop:'8px' },
  photoPage:  { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', minHeight:'500px', padding:'16px', background:'#fafafa' },
  photo:      { width:'100%', maxWidth:'240px', aspectRatio:'390/600', objectFit:'cover', borderRadius:'4px', boxShadow:'0 4px 16px rgba(0,0,0,0.12)' },
  caption:    { fontSize:'11px', color:'#6b7280', marginTop:'8px', textAlign:'center' },
  emptyPage:  { display:'flex', alignItems:'center', justifyContent:'center', height:'100%', minHeight:'500px', background:'#fafafa' },
  endText:    { color:'#d1d5db', fontSize:'14px' },
  controls:   { display:'flex', alignItems:'center', gap:'24px', marginTop:'24px' },
  btn:        { background:'rgba(255,255,255,0.1)', color:'white', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'8px', padding:'10px 20px', cursor:'pointer', fontSize:'14px', fontWeight:500, transition:'opacity 0.2s' },
  dots:       { display:'flex', gap:'6px', alignItems:'center' },
  dot:        { width:'8px', height:'8px', borderRadius:'50%', background:'rgba(255,255,255,0.25)', cursor:'pointer', transition:'background 0.2s' },
  dotActive:  { background:'#f0c060', transform:'scale(1.2)' },
}
