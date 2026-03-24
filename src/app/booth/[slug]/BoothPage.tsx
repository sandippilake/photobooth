'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'

const BoothKonva = dynamic(() => import('./BoothKonva'), { ssr: false })

interface Frame {
  id: string
  name: string
  png_url: string | null
  thumbnail_url: string | null
  placeholder_schema: any[] | null
  customizations: Record<string, string> | null
  crop_rect?: { x: number; y: number; w: number; h: number } | null
}

interface Event {
  id: string
  name: string
  tagline: string | null
  slug: string
  pin: string | null
  thanks_message: string | null
  bg_color?: string | null
  accent_color?: string | null
}

interface GuestInfo { name: string; phone: string; message: string }

interface Adjust {
  brightness: number; contrast: number; warmth: number
  zoom: number; tilt: number; x: number; y: number
}

const DEFAULT_ADJUST: Adjust = {
  brightness: 100, contrast: 100, warmth: 0, zoom: 1, tilt: 0, x: 0, y: 0
}

const SLIDERS: [string, string, keyof Adjust, number, number, number, (v: number) => string][] = [
  ['☀️', 'Brightness', 'brightness', 60, 160, 1,    v => v + '%'],
  ['◑',  'Contrast',   'contrast',   60, 160, 1,    v => v + '%'],
  ['🌅', 'Warmth',     'warmth',      0,  80, 1,    v => String(v)],
  ['🔍', 'Zoom',       'zoom',         1,   3, 0.05, v => Math.round(v * 100) + '%'],
  ['↻',  'Tilt',       'tilt',       -45,  45, 1,   v => v + '°'],
]

const isAdjusted = (a: Adjust) => JSON.stringify(a) !== JSON.stringify(DEFAULT_ADJUST)

// ─── Enhance slide-up ─────────────────────────────────────────────────────────
function EnhancePanel({ open, onClose, adjust, onChange, primary, bg }: {
  open: boolean; onClose: () => void
  adjust: Adjust; onChange: (key: string, val?: number) => void
  primary: string; bg: string
}) {
  const [activeSlider, setActiveSlider] = useState<keyof Adjust>('brightness')
  const adjusted = isAdjusted(adjust)

  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 10 }} />}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 11,
        background: '#0f1117',
        borderRadius: '20px 20px 0 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 10px' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.02em' }}>✨ Enhance</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {adjusted && (
              <button onClick={() => onChange('reset')}
                style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.75rem', fontWeight: 600 }}>
                Reset
              </button>
            )}
            <button onClick={onClose}
              style={{ padding: '5px 14px', borderRadius: 8, background: primary, border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
              Done
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 14px 10px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {SLIDERS.map(([icon, label, key]) => {
            const active = activeSlider === key
            const changed = adjust[key] !== DEFAULT_ADJUST[key]
            return (
              <button key={key} onClick={() => setActiveSlider(key)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                  padding: '7px 13px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.15s',
                  background: active ? primary : changed ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
                  color: active ? '#fff' : changed ? '#fff' : 'rgba(255,255,255,0.45)',
                }}>
                <span>{icon}</span><span>{label}</span>
              </button>
            )
          })}
          <button onClick={() => onChange('center')}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', fontWeight: 600,
              background: (adjust.x !== 0 || adjust.y !== 0) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)',
              color: (adjust.x !== 0 || adjust.y !== 0) ? '#fff' : 'rgba(255,255,255,0.4)',
            }}>
            <span>⊕</span><span>Centre</span>
          </button>
        </div>
        {(() => {
          const s = SLIDERS.find(([,, k]) => k === activeSlider)
          if (!s) return null
          const [icon, label, key, min, max, step, fmt] = s
          return (
            <div style={{ padding: '2px 20px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.82rem' }}>{icon} {label}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(adjust[key] as number)}
                </span>
              </div>
              <input type="range" min={min} max={max} step={step} value={adjust[key]}
                onChange={e => onChange(key, step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
                style={{ width: '100%', accentColor: primary, height: 44, cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)' }}>{fmt(min)}</span>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.2)' }}>{fmt(max)}</span>
              </div>
            </div>
          )
        })()}
      </div>
    </>
  )
}

// ─── Frames slide-up ──────────────────────────────────────────────────────────
function FramesPanel({ open, onClose, frames, selectedFrame, onSelect, primary }: {
  open: boolean; onClose: () => void
  frames: Frame[]; selectedFrame: Frame | null
  onSelect: (f: Frame | null) => void; primary: string
}) {
  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.5)' }} />}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 11,
        background: '#0f1117',
        borderRadius: '20px 20px 0 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.32s cubic-bezier(0.32,0.72,0,1)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
        maxHeight: '72dvh', display: 'flex', flexDirection: 'column',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 2px', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 18px 12px', flexShrink: 0 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>🖼 Choose Frame</span>
          <button onClick={onClose}
            style={{ padding: '5px 14px', borderRadius: 8, background: primary, border: 'none', cursor: 'pointer', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>
            Done
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 14px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {frames.map(frame => {
              const sel = selectedFrame?.id === frame.id
              return (
                <button key={frame.id}
                  onClick={() => { onSelect(frame); onClose() }}
                  style={{
                    padding: 0, borderRadius: 12, overflow: 'hidden', position: 'relative',
                    border: `2px solid ${sel ? primary : 'rgba(255,255,255,0.1)'}`,
                    cursor: 'pointer', aspectRatio: '390/600', display: 'block',
                    boxShadow: sel ? `0 0 16px ${primary}66` : 'none',
                    transition: 'all 0.15s',
                  }}>
                  <img src={frame.thumbnail_url || frame.png_url || ''}
                    alt={frame.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#1a1a1a' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', padding: '20px 6px 6px' }}>
                    <p style={{ color: 'white', fontSize: '0.6rem', margin: 0, textAlign: 'center', fontWeight: 500 }}>{frame.name}</p>
                  </div>
                  {sel && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }}>✓</div>
                  )}
                </button>
              )
            })}

          </div>
        </div>
      </div>
    </>
  )
}

// ─── Bottom bar ───────────────────────────────────────────────────────────────
function BottomBar({ onBack, onEnhance, onFrames, onNext, enhanceActive, framesActive, adjusted, hasFrame, primary, stripBg }: {
  onBack: () => void; onEnhance: () => void; onFrames: () => void; onNext: () => void
  enhanceActive: boolean; framesActive: boolean; adjusted: boolean; hasFrame: boolean
  primary: string; stripBg: string
}) {
  const btn = (onClick: () => void, icon: string, label: string, active: boolean, dot?: boolean) => (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '12px 4px 10px', background: 'none', border: 'none', cursor: 'pointer',
      position: 'relative', WebkitTapHighlightColor: 'transparent' as any, minWidth: 0,
      transition: 'opacity 0.15s',
    }}>
      {/* Icon circle */}
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: active ? `${primary}22` : 'rgba(255,255,255,0.08)',
        border: `1.5px solid ${active ? primary : 'rgba(255,255,255,0.12)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem', lineHeight: 1,
        boxShadow: active ? `0 0 12px ${primary}55` : 'none',
        transition: 'all 0.2s',
      }}>{icon}</div>
      <span style={{
        fontSize: '0.65rem', fontWeight: active ? 700 : 500,
        color: active ? primary : 'rgba(255,255,255,0.6)',
        letterSpacing: '0.04em', lineHeight: 1,
      }}>{label}</span>
      {dot && (
        <span style={{
          position: 'absolute', top: 10, right: '50%', marginRight: -18,
          width: 8, height: 8, borderRadius: '50%', background: primary,
          border: '2px solid ' + stripBg,
        }} />
      )}
    </button>
  )

  return (
    <div style={{
      flexShrink: 0,
      background: stripBg,
      borderTop: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {btn(onBack,    '↩',  'Retake',  false)}
      {btn(onFrames,  '🖼', 'Frames',  framesActive, hasFrame)}
      {btn(onEnhance, '✨', 'Enhance', enhanceActive, adjusted)}
      {/* Next — prominent CTA */}
      <button onClick={onNext} style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '12px 4px 10px', background: 'none', border: 'none', cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent' as any,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', color: 'white',
          boxShadow: `0 4px 16px ${primary}99, 0 0 0 3px ${primary}33`,
          transition: 'all 0.2s',
        }}>→</div>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: primary, letterSpacing: '0.04em', lineHeight: 1 }}>Next</span>
      </button>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BoothPage({ slug, eventData, framesData }: {
  slug: string; eventData: any; framesData: any[]
}) {
  const [event]  = useState<Event>(eventData)
  const [frames] = useState<Frame[]>(framesData)

  const bg     = event.bg_color     || '#0f1117'
  const accent = event.accent_color || '#3b82f6'

  const [unlocked, setUnlocked]     = useState(!eventData?.pin)
  const [pinInput, setPinInput]     = useState('')
  const [pinError, setPinError]     = useState(false)
  const [step, setStep]             = useState<'landing'|'capture'|'compose'|'guest'|'share'>('landing')

  const [photoSrc, setPhotoSrc]           = useState<string|null>(null)
  const [adjust, setAdjust]               = useState<Adjust>(DEFAULT_ADJUST)
  const [enhanceOpen, setEnhanceOpen]     = useState(false)
  const [framesOpen, setFramesOpen]       = useState(false)
  const [exportedDataUrl, setExported]    = useState<string|null>(null)
  const [selectedFrame, setSelectedFrame] = useState<Frame|null>(framesData[0] || null)
  const [frameKey, setFrameKey] = useState(0)
  const [guest, setGuest]                 = useState<GuestInfo>({ name:'', phone:'', message:'' })
  const [sharing, setSharing]             = useState(false)
  const [cameraError, setCameraError]     = useState('')
  const [canvasW, setCanvasW]             = useState(390)
  const [stripBg, setStripBg]             = useState('rgba(10,13,20,0.97)')

  const stageRef = useRef<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)

  // 9:16
  const canvasH    = Math.round(canvasW * 693 / 390)
  const guestLine1 = [guest.name, guest.phone].filter(Boolean).join('  ·  ')
  const guestLine2 = guest.message
  const isSecure   = typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost')

  // Portrait width — max 430px
  useEffect(() => {
    const calc = () => setCanvasW(Math.min(window.innerWidth, 430))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  function checkPin() {
    if (pinInput.trim() === (event?.pin || '').trim()) setUnlocked(true)
    else { setPinError(true); setPinInput('') }
  }

  async function startCamera() {
    if (!isSecure) { setCameraError('Camera requires HTTPS. Please use upload.'); return }
    setStep('capture')
    setTimeout(async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        if (videoRef.current) videoRef.current.srcObject = s
      } catch { setCameraError('Cannot access camera. Use upload.'); setStep('landing') }
    }, 100)
  }

  function stopCamera() {
    (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop())
  }

  function takePhoto() {
    const v = videoRef.current; if (!v) return
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    stopCamera()
    setPhotoSrc(c.toDataURL('image/jpeg', 0.9))
    setAdjust(DEFAULT_ADJUST); setStep('compose')
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setPhotoSrc(ev.target?.result as string); setAdjust(DEFAULT_ADJUST); setStep('compose') }
    reader.readAsDataURL(file); e.target.value = ''
  }

  function clampPosition(a: Adjust, photoW?: number, photoH?: number): Adjust {
    // We don't have natural image dims here so just reset if zoom decreased
    // Real clamping happens in Konva onDragEnd
    return a
  }

  function handleAdjust(key: string, val?: number) {
    if (key === 'reset') setAdjust(DEFAULT_ADJUST)
    else if (key === 'center') setAdjust(a => ({ ...a, x: 0, y: 0 }))
    else {
      setAdjust(a => {
        const next = { ...a, [key]: val }
        // If zoom decreased, re-center to avoid black edges
        if (key === 'zoom' && typeof val === 'number' && val < a.zoom) {
          return { ...next, x: 0, y: 0 }
        }
        return next
      })
    }
  }

  function goToGuest() {
    if (!stageRef.current) return
    const pr   = 2
    const crop = selectedFrame?.crop_rect
    if (crop && (crop.x > 0 || crop.y > 0 || crop.w < 390 || crop.h < 600)) {
      const full = stageRef.current.toDataURL({ pixelRatio: pr })
      const img  = new window.Image()
      img.onload = () => {
        const cv = document.createElement('canvas')
        cv.width = crop.w * pr; cv.height = crop.h * pr
        const s = (canvasW / 390) * pr
        cv.getContext('2d')!.drawImage(img, crop.x*s, crop.y*s, crop.w*s, crop.h*s, 0, 0, cv.width, cv.height)
        setExported(cv.toDataURL('image/jpeg', 0.92))
      }
      img.src = full
    } else {
      setExported(stageRef.current.toDataURL({ pixelRatio: pr }))
    }
    setStep('guest')
  }

  async function logAction(action: string) {
    await fetch('/api/booth/log', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId: event.id, action, guest }),
    })
  }

  async function handleShare() {
    if (!exportedDataUrl) return
    setSharing(true); await logAction('shared')
    const blob = await (await fetch(exportedDataUrl)).blob()
    const file = new File([blob], 'photobooth.jpg', { type: 'image/jpeg' })
    if (navigator.share && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: event.name }) } catch {}
    } else {
      const a = document.createElement('a'); a.href = exportedDataUrl; a.download = 'photobooth.jpg'; a.click()
    }
    setSharing(false); setStep('share')
  }

  async function handleDownload() {
    if (!exportedDataUrl) return
    await logAction('downloaded')
    const a = document.createElement('a'); a.href = exportedDataUrl; a.download = 'photobooth.jpg'; a.click()
    setStep('share')
  }


  // Sample bottom pixels of canvas to determine strip bg color
  useEffect(() => {
    if (step !== 'compose') return
    const timer = setTimeout(() => {
      try {
        const canvas = stageRef.current?.toCanvas?.()
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // Sample a strip of pixels near the bottom of the photo area
        const sampleY = Math.min(canvas.height - 20, Math.floor(canvas.height * 0.88))
        const imageData = ctx.getImageData(0, sampleY, canvas.width, 12)
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < imageData.data.length; i += 16) {
          r += imageData.data[i]
          g += imageData.data[i + 1]
          b += imageData.data[i + 2]
          count++
        }
        if (count === 0) return
        r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count)
        // Darken significantly for the strip
        const darken = 0.25
        r = Math.round(r * darken); g = Math.round(g * darken); b = Math.round(b * darken)
        setStripBg(`rgba(${r},${g},${b},0.97)`)
      } catch { /* cross-origin or not ready */ }
    }, 600)
    return () => clearTimeout(timer)
  }, [step, photoSrc, selectedFrame])

  // ── Shared input style ────────────────────────────────────────────────────
  const inputSt: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.07)', color: 'white',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
    padding: '13px 16px', fontSize: 15, outline: 'none', boxSizing: 'border-box',
  }
  // PIN input uses inputSt, guest form uses softInput defined inline

  // ── Outer wrapper — forces portrait on desktop ────────────────────────────
  const outerSt: React.CSSProperties = {
    minHeight: '100dvh', background: '#000',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  }
  const innerSt: React.CSSProperties = {
    width: '100%', maxWidth: 430, background: bg,
    minHeight: '100dvh', display: 'flex', flexDirection: 'column',
  }

  // ── PIN ───────────────────────────────────────────────────────────────────
  if (!unlocked) return (
    <div style={outerSt}>
      <div style={{ ...innerSt, alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
        <div style={{ textAlign: 'center', width: '100%', maxWidth: 280 }}>

          {/* Soft lock icon */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 28px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: 'rgba(255,255,255,0.4)',
          }}>🔒</div>

          {/* Event name — light weight serif */}
          <h1 style={{
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 300,
            fontSize: 22,
            margin: '0 0 6px',
            fontFamily: 'Georgia, serif',
            letterSpacing: '0.03em',
          }}>{event.name}</h1>

          {event.tagline && (
            <p style={{
              color: 'rgba(255,255,255,0.28)',
              fontSize: 13,
              margin: '0 0 36px',
              fontWeight: 300,
              fontStyle: 'italic',
              letterSpacing: '0.04em',
            }}>{event.tagline}</p>
          )}
          {!event.tagline && <div style={{ marginBottom: 36 }} />}

          {/* PIN input — underline only, large digits */}
          <input
            type="password" inputMode="numeric" value={pinInput}
            onChange={e => { setPinInput(e.target.value); setPinError(false) }}
            onKeyDown={e => e.key === 'Enter' && checkPin()}
            placeholder="· · · ·"
            style={{
              width: '100%', textAlign: 'center',
              fontSize: 32, fontWeight: 200, letterSpacing: '0.4em',
              color: 'rgba(255,255,255,0.9)',
              background: 'transparent',
              border: 'none',
              borderBottom: `1px solid ${pinError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.18)'}`,
              borderRadius: 0,
              padding: '10px 0 12px',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: 6,
              caretColor: accent,
            }}
          />

          {/* Error — soft, not alarming */}
          <p style={{
            color: 'rgba(239,68,68,0.6)',
            fontSize: 12,
            margin: '0 0 20px',
            letterSpacing: '0.04em',
            fontWeight: 300,
            minHeight: 18,
          }}>{pinError ? 'Incorrect PIN, please try again' : ''}</p>

          {/* Continue button — pill, same as landing */}
          <button onClick={checkPin} style={{
            width: '100%',
            background: accent,
            color: '#fff',
            fontWeight: 400,
            fontSize: 15,
            letterSpacing: '0.08em',
            padding: '15px',
            borderRadius: 50,
            border: 'none',
            cursor: 'pointer',
            boxShadow: `0 4px 20px ${accent}44`,
          }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )

  // ── Landing ───────────────────────────────────────────────────────────────
  if (step === 'landing') return (
    <div style={outerSt}>
      <div style={{ ...innerSt, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', width: '100%', padding: '0 32px 48px' }}>

          {/* Soft icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
            background: `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            boxShadow: `0 0 0 1px ${accent}22, 0 8px 32px ${accent}18`,
          }}>📸</div>

          {/* Event name — elegant, not heavy */}
          <h1 style={{
            color: 'rgba(255,255,255,0.92)',
            fontWeight: 300,
            fontSize: 28,
            margin: '0 0 6px',
            letterSpacing: '0.04em',
            fontFamily: 'Georgia, serif',
          }}>{event.name}</h1>

          {event.tagline && (
            <p style={{
              color: 'rgba(255,255,255,0.38)',
              fontSize: 14,
              margin: '0 0 40px',
              fontWeight: 300,
              letterSpacing: '0.06em',
              fontStyle: 'italic',
            }}>{event.tagline}</p>
          )}

          {!event.tagline && <div style={{ marginBottom: 40 }} />}

          {cameraError && (
            <p style={{ color: 'rgba(251,191,36,0.7)', fontSize: 13, margin: '0 0 20px', fontWeight: 300 }}>
              {cameraError}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Primary — subtle glow, no harsh border */}
            <button onClick={startCamera} style={{
              background: accent,
              color: '#fff',
              fontWeight: 500,
              fontSize: 16,
              letterSpacing: '0.06em',
              padding: '16px',
              borderRadius: 50,
              border: 'none',
              cursor: 'pointer',
              opacity: isSecure ? 1 : 0.4,
              boxShadow: `0 4px 20px ${accent}44`,
              transition: 'opacity 0.2s',
            }}>
              Take a photo
            </button>

            {/* Secondary — ghost style, very soft */}
            <button onClick={() => fileRef.current?.click()} style={{
              background: 'transparent',
              color: 'rgba(255,255,255,0.55)',
              fontWeight: 400,
              fontSize: 15,
              letterSpacing: '0.05em',
              padding: '15px',
              borderRadius: 50,
              border: '1px solid rgba(255,255,255,0.15)',
              cursor: 'pointer',
            }}>
              Upload from gallery
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
          </div>
        </div>
      </div>
    </div>
  )

  // ── Camera ────────────────────────────────────────────────────────────────
  if (step === 'capture') return (
    <div style={outerSt}>
      <div style={{ ...innerSt, justifyContent: 'flex-end' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ flex: 1, objectFit: 'cover', width: '100%' }} />
        <div style={{ background: bg, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => { stopCamera(); setStep('landing') }}
            style={{ color: 'rgba(255,255,255,0.55)', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', padding: '8px 4px' }}>
            Cancel
          </button>
          <button onClick={takePhoto}
            style={{ width: 70, height: 70, borderRadius: '50%', background: '#fff', border: `4px solid rgba(255,255,255,0.35)`, cursor: 'pointer', boxShadow: '0 0 0 3px rgba(255,255,255,0.15)' }} />
          <div style={{ width: 60 }} />
        </div>
      </div>
    </div>
  )

  // ── Compose ───────────────────────────────────────────────────────────────
  if (step === 'compose') return (
    <div style={outerSt}>
      <div style={{ ...innerSt, position: 'relative', overflow: 'hidden' }}>

        {/* Canvas fills remaining space above toolbar */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#000' }}>
          <BoothKonva
            key={frameKey}
            photoSrc={photoSrc!}
            frameSrc={selectedFrame?.png_url || null}
            zones={selectedFrame?.placeholder_schema || []}
            customizations={selectedFrame?.customizations || null}
            guestLine1={guestLine1}
            guestLine2={guestLine2}
            stageRef={stageRef}
            canvasW={canvasW}
            canvasH={canvasH}
            totalH={canvasH}
            adjust={adjust}
            onPhotoDragEnd={(x, y) => setAdjust(a => ({ ...a, x, y }))}
          />
        </div>

        {/* Drag hint */}
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none', zIndex: 5 }}>
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', background: 'rgba(0,0,0,0.4)', padding: '3px 12px', borderRadius: 20 }}>
            Drag photo · drag jewels to position
          </span>
        </div>

        {/* Bottom bar */}
        <BottomBar
          onBack={() => setStep('landing')}
          onEnhance={() => { setEnhanceOpen(o => !o); setFramesOpen(false) }}
          onFrames={() => { setFramesOpen(o => !o); setEnhanceOpen(false) }}
          onNext={goToGuest}
          enhanceActive={enhanceOpen}
          framesActive={framesOpen}
          adjusted={isAdjusted(adjust)}
          hasFrame={!!selectedFrame}
          primary={accent}
          stripBg={stripBg}
        />

        {/* Enhance panel */}
        <EnhancePanel
          open={enhanceOpen}
          onClose={() => setEnhanceOpen(false)}
          adjust={adjust}
          onChange={handleAdjust}
          primary={accent}
          bg={bg}
        />

        {/* Frames panel */}
        <FramesPanel
          open={framesOpen}
          onClose={() => setFramesOpen(false)}
          frames={frames}
          selectedFrame={selectedFrame}
          onSelect={(f) => { setSelectedFrame(f); if (!f) setFrameKey(k => k + 1) }}
          primary={accent}
        />
      </div>
    </div>
  )

  // ── Guest ─────────────────────────────────────────────────────────────────
  // Soft input style for guest form
  const softInput: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.88)',
    border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 0,
    padding: '12px 4px',
    fontSize: 15,
    fontWeight: 300,
    letterSpacing: '0.02em',
    outline: 'none',
    boxSizing: 'border-box',
    caretColor: accent,
  }
  const softLabel: React.CSSProperties = {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    display: 'block',
    marginBottom: 4,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    fontWeight: 400,
  }

  if (step === 'guest') return (
    <div style={outerSt}>
      <div style={{ ...innerSt }}>
        {/* Photo — full bleed, fades into form */}
        {exportedDataUrl && (
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img src={exportedDataUrl} alt="Your photo"
              style={{ width: '100%', display: 'block', maxHeight: '45dvh', objectFit: 'cover', objectPosition: 'top' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(to top, ${bg}, transparent)`, pointerEvents: 'none' }} />
          </div>
        )}

        {/* Form — clean, minimal, underline inputs */}
        <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 0 }}>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 300, fontSize: 18, margin: '0 0 4px', fontFamily: 'Georgia, serif', letterSpacing: '0.02em' }}>
            One last thing
          </p>
          <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 12, margin: '0 0 28px', letterSpacing: '0.04em', fontWeight: 300 }}>
            Your details will be added to the photo
          </p>

          {/* Name */}
          <div style={{ marginBottom: 22 }}>
            <label style={softLabel}>Your name</label>
            <input value={guest.name} onChange={e => setGuest(g => ({ ...g, name: e.target.value }))}
              placeholder="e.g. Rahul Sharma" autoComplete="name" style={softInput} />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: 22 }}>
            <label style={softLabel}>Phone <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
            <input value={guest.phone} onChange={e => setGuest(g => ({ ...g, phone: e.target.value }))}
              placeholder="+91 98765 43210" type="tel" autoComplete="tel" style={softInput} />
          </div>

          {/* Message */}
          <div style={{ marginBottom: 28 }}>
            <label style={softLabel}>Message <span style={{ opacity: 0.5, textTransform: 'none', letterSpacing: 0 }}>— optional</span></label>
            <textarea value={guest.message} onChange={e => setGuest(g => ({ ...g, message: e.target.value }))}
              placeholder="e.g. Wishing you a wonderful day!" rows={2} maxLength={100} spellCheck={false}
              style={{ ...softInput, resize: 'none', paddingTop: 10 }} />
            <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: 10, textAlign: 'right', margin: '4px 0 0', letterSpacing: '0.05em' }}>
              {guest.message.length} / 100
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <button onClick={() => setStep('compose')} style={{
              background: 'none', color: 'rgba(255,255,255,0.35)',
              border: 'none', padding: '14px 12px', fontSize: 14,
              cursor: 'pointer', letterSpacing: '0.03em', fontWeight: 300,
            }}>← Back</button>

            <button onClick={handleDownload} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 50, padding: '14px', fontSize: 14,
              cursor: 'pointer', fontWeight: 400, letterSpacing: '0.04em',
            }}>Save</button>

            <button onClick={handleShare} disabled={sharing || !guest.name} style={{
              flex: 2, background: accent, color: '#fff',
              fontWeight: 500, border: 'none', borderRadius: 50,
              padding: '14px', fontSize: 15, cursor: 'pointer',
              letterSpacing: '0.06em',
              opacity: !guest.name ? 0.35 : 1,
              boxShadow: guest.name ? `0 4px 20px ${accent}55` : 'none',
              transition: 'all 0.2s',
            }}>{sharing ? '…' : 'Share'}</button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Thanks ────────────────────────────────────────────────────────────────
  return (
    <div style={{ ...outerSt, background: '#1a0a00' }}>
      <div style={{ ...innerSt, background: 'linear-gradient(160deg, #2d1206 0%, #1a0800 40%, #0d0500 100%)', alignItems: 'center' }}>
        {/* Warm glow behind photo */}
        <div style={{ position: 'relative', width: '100%' }}>
          {exportedDataUrl && (
            <img src={exportedDataUrl} alt="Your photo"
              style={{ width: '100%', display: 'block', maxHeight: '55dvh', objectFit: 'cover', objectPosition: 'top' }} />
          )}
          {/* Gradient fade at bottom of photo */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to top, #1a0800, transparent)', pointerEvents: 'none' }} />
        </div>

        <div style={{ textAlign: 'center', padding: '20px 28px', paddingBottom: 'max(32px, env(safe-area-inset-bottom))', width: '100%' }}>
          {/* Celebratory icons */}
          <div style={{ fontSize: 42, marginBottom: 12, letterSpacing: 4 }}>🎊 🎉 🥂</div>

          <p style={{ color: '#ffd89b', fontWeight: 800, fontSize: 24, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {event.thanks_message || 'Thank you for celebrating with us!'}
          </p>
          <p style={{ color: 'rgba(255,216,155,0.5)', fontSize: 14, margin: '0 0 8px' }}>{event.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '0 0 28px' }}>Your photo has been saved ✓</p>

          {/* Warm divider */}
          <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(255,216,155,0.3), transparent)', margin: '0 0 24px' }} />

          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 16px' }}>
            Want another keepsake?
          </p>
          <button onClick={() => {
            setPhotoSrc(null); setExported(null)
            setGuest({ name:'', phone:'', message:'' }); setAdjust(DEFAULT_ADJUST)
            // Require PIN again if event has PIN
            if (event.pin) { setUnlocked(false); setPinInput('') }
            setStep('landing')
          }} style={{
            background: 'rgba(255,216,155,0.12)',
            color: '#ffd89b',
            border: '1px solid rgba(255,216,155,0.25)',
            borderRadius: 12, padding: '13px 28px', fontSize: 14, cursor: 'pointer',
            fontWeight: 600,
          }}>
            📸 Take another photo
          </button>
        </div>
      </div>
    </div>
  )
}
