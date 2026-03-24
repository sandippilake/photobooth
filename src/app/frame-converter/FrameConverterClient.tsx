'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

type Step = 'upload' | 'removing' | 'draw' | 'done'

interface Rect { x: number; y: number; w: number; h: number }

const CANVAS_W = 390
const CANVAS_H = 600

export default function FrameConverterClient() {
  const [step,        setStep]        = useState<Step>('upload')
  const [progress,    setProgress]    = useState(0)
  const [bgUrl,       setBgUrl]       = useState<string | null>(null)   // after bg removal
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [rect,        setRect]        = useState<Rect | null>(null)
  const [dragging,    setDragging]    = useState(false)
  const [dragStart,   setDragStart]   = useState<{ x: number; y: number } | null>(null)
  const [finalUrl,    setFinalUrl]    = useState<string | null>(null)
  const [fileName,    setFileName]    = useState('frame')
  const [dropZone,    setDropZone]    = useState(false)
  const [err,         setErr]         = useState('')

  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Step 1: process file ──────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErr('Please upload an image file'); return
    }
    setErr('')
    setOriginalUrl(URL.createObjectURL(file))
    setFileName(file.name.replace(/\.[^/.]+$/, ''))
    setStep('removing')
    setProgress(0)

    try {
      const { removeBackground } = await import('@imgly/background-removal')
      const blob = await removeBackground(file, {

        progress: (_k: string, cur: number, tot: number) => {
          if (tot > 0) setProgress(Math.round(cur / tot * 100))
        },
        model: 'medium',
        output: { format: 'image/png', quality: 1 },
      })
      setBgUrl(URL.createObjectURL(blob))
      setRect(null)
      setStep('draw')
    } catch(e: any) {
      setErr('Background removal failed: ' + (e?.message || 'unknown error'))
      setStep('upload')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDropZone(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  // ── Step 2: draw on canvas ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'draw' || !bgUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')!
    const img    = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      // Checkerboard bg
      const size = 16
      for (let y = 0; y < CANVAS_H; y += size) {
        for (let x = 0; x < CANVAS_W; x += size) {
          ctx.fillStyle = ((x / size + y / size) % 2 === 0) ? '#1e2030' : '#161824'
          ctx.fillRect(x, y, size, size)
        }
      }
      ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
      drawRect(ctx, rect)
    }
    img.src = bgUrl
  }, [step, bgUrl, rect])

  function drawRect(ctx: CanvasRenderingContext2D, r: Rect | null) {
    if (!r) return
    // Dim outside the rect
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(0, 0, CANVAS_W, r.y)
    ctx.fillRect(0, r.y + r.h, CANVAS_W, CANVAS_H - r.y - r.h)
    ctx.fillRect(0, r.y, r.x, r.h)
    ctx.fillRect(r.x + r.w, r.y, CANVAS_W - r.x - r.w, r.h)
    // Rect border
    ctx.strokeStyle = '#f0c060'
    ctx.lineWidth   = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2)
    ctx.setLineDash([])
    // Corner handles
    const hs = 10
    ctx.fillStyle = '#f0c060'
    ;[[r.x, r.y],[r.x+r.w-hs, r.y],[r.x, r.y+r.h-hs],[r.x+r.w-hs, r.y+r.h-hs]].forEach(([hx,hy]) => {
      ctx.fillRect(hx, hy, hs, hs)
    })
    // Label
    ctx.fillStyle = '#f0c060'
    ctx.font      = 'bold 12px sans-serif'
    ctx.fillText('📷 Photo area', r.x + 6, r.y + 18)
    // Dimensions
    ctx.fillStyle = 'rgba(240,192,96,0.7)'
    ctx.font      = '11px sans-serif'
    ctx.fillText(Math.round(r.w) + ' × ' + Math.round(r.h), r.x + 6, r.y + r.h - 8)
  }

  function canvasPos(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top)  * scaleY),
    }
  }

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = canvasPos(e)
    setDragging(true)
    setDragStart(pos)
    setRect({ x: pos.x, y: pos.y, w: 0, h: 0 })
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !dragStart || !canvasRef.current) return
    const pos = canvasPos(e)
    const r: Rect = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      w: Math.abs(pos.x - dragStart.x),
      h: Math.abs(pos.y - dragStart.y),
    }
    setRect(r)
    // Redraw
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')!
    const img    = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
      for (let y = 0; y < CANVAS_H; y += 16) {
        for (let x = 0; x < CANVAS_W; x += 16) {
          ctx.fillStyle = ((x/16 + y/16) % 2 === 0) ? '#1e2030' : '#161824'
          ctx.fillRect(x, y, 16, 16)
        }
      }
      ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)
      drawRect(ctx, r)
    }
    img.src = bgUrl!
  }

  const onMouseUp = () => setDragging(false)

  // ── Step 3: export final PNG ───────────────────────────────────────────────
  const exportFrame = useCallback(() => {
    if (!bgUrl) return

    const canvas = document.createElement('canvas')
    canvas.width  = CANVAS_W
    canvas.height = CANVAS_H
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!

    const img = new Image()

    // IMPORTANT: must set crossOrigin before src for blob URLs in some browsers
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      // 1. Clear to fully transparent (default, but be explicit)
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      // 2. Draw the bg-removed image (already has transparency from WASM)
      ctx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H)

      // 3. Punch out the marked photo area
      if (rect && rect.w > 10 && rect.h > 10) {
        ctx.clearRect(
          Math.round(rect.x),
          Math.round(rect.y),
          Math.round(rect.w),
          Math.round(rect.h)
        )
      }

      // 4. Export as PNG blob
      canvas.toBlob(blob => {
        if (!blob) {
          console.error('[exportFrame] toBlob returned null')
          return
        }
        const url = URL.createObjectURL(blob)
        setFinalUrl(url)
        setStep('done')
      }, 'image/png', 1.0)
    }

    img.onerror = (e) => {
      console.error('[exportFrame] image load failed', e)
      // Fallback: try drawing from the display canvas directly
      const displayCanvas = canvasRef.current
      if (displayCanvas) {
        const fallbackCtx = canvas.getContext('2d')!
        fallbackCtx.clearRect(0, 0, CANVAS_W, CANVAS_H)
        fallbackCtx.drawImage(displayCanvas, 0, 0)
        if (rect && rect.w > 10 && rect.h > 10) {
          fallbackCtx.clearRect(rect.x, rect.y, rect.w, rect.h)
        }
        canvas.toBlob(blob => {
          if (!blob) return
          setFinalUrl(URL.createObjectURL(blob))
          setStep('done')
        }, 'image/png', 1.0)
      }
    }

    // Set src AFTER setting onload/onerror
    img.src = bgUrl
  }, [bgUrl, rect])

  const download = () => {
    if (!finalUrl) return
    const a = document.createElement('a')
    a.href = finalUrl
    a.download = fileName + '-frame.png'
    a.click()
  }

  const cropRectJson = rect ? JSON.stringify({
    x:      Math.round(rect.x / CANVAS_W * 100) / 100,
    y:      Math.round(rect.y / CANVAS_H * 100) / 100,
    width:  Math.round(rect.w / CANVAS_W * 100) / 100,
    height: Math.round(rect.h / CANVAS_H * 100) / 100,
  }, null, 2) : null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0d0f14; }

        .fc-wrap {
          min-height: 100vh;
          background: #0d0f14;
          color: #e8e6e0;
          font-family: 'Instrument Sans', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 24px 80px;
        }

        .fc-header { text-align: center; margin-bottom: 48px; }
        .fc-badge {
          display: inline-block;
          font-size: 11px; font-weight: 600; letter-spacing: 0.2em;
          text-transform: uppercase; color: #f0c060;
          background: rgba(240,192,96,0.1); border: 1px solid rgba(240,192,96,0.25);
          padding: 4px 14px; border-radius: 100px; margin-bottom: 20px;
        }
        .fc-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(32px,5vw,56px); font-weight: 800;
          letter-spacing: -0.03em; color: #e8e6e0; line-height: 1.05;
          margin-bottom: 12px;
        }
        .fc-title em { font-style: italic; color: #f0c060; }
        .fc-sub { font-size: 15px; font-weight: 300; color: rgba(232,230,224,0.5); max-width: 480px; line-height: 1.6; }

        .fc-steps {
          display: flex; align-items: center; gap: 0;
          margin-bottom: 40px;
        }
        .fc-step {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 500;
          color: rgba(232,230,224,0.3);
          padding: 8px 16px;
        }
        .fc-step.active { color: #f0c060; }
        .fc-step.done   { color: rgba(96,208,144,0.8); }
        .fc-step-num {
          width: 24px; height: 24px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }
        .fc-step.active .fc-step-num { background: #f0c060; color: #0d0f14; border-color: #f0c060; }
        .fc-step.done   .fc-step-num { background: rgba(96,208,144,0.2); color: #60d090; border-color: rgba(96,208,144,0.4); }
        .fc-step-div { width: 32px; height: 1px; background: rgba(255,255,255,0.08); }

        .fc-card {
          width: 100%; max-width: 860px;
          background: #1a1e28; border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px; padding: 32px;
        }

        .fc-drop {
          border: 1.5px dashed rgba(240,192,96,0.3); border-radius: 16px;
          padding: 60px 32px;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          cursor: pointer; transition: border-color 0.2s, background 0.2s;
          background: rgba(255,255,255,0.02);
        }
        .fc-drop:hover, .fc-drop.over {
          border-color: rgba(240,192,96,0.7); background: rgba(240,192,96,0.04);
        }
        .fc-drop-icon { font-size: 40px; }
        .fc-drop-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; }
        .fc-drop-sub   { font-size: 13px; color: rgba(232,230,224,0.4); text-align: center; }

        .fc-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 24px; border-radius: 10px; border: none;
          font-family: 'Instrument Sans', sans-serif; font-size: 14px; font-weight: 500;
          cursor: pointer; transition: all 0.15s; text-decoration: none;
        }
        .fc-btn-primary { background: #f0c060; color: #0d0f14; }
        .fc-btn-primary:hover { background: #f5ce78; transform: translateY(-1px); }
        .fc-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .fc-btn-ghost  { background: rgba(255,255,255,0.05); color: rgba(232,230,224,0.7); border: 1px solid rgba(255,255,255,0.1); }
        .fc-btn-ghost:hover  { background: rgba(255,255,255,0.09); color: #e8e6e0; }

        .fc-spinner {
          width: 56px; height: 56px; border-radius: 50%;
          border: 3px solid rgba(240,192,96,0.15); border-top-color: #f0c060;
          animation: fc-spin 0.9s linear infinite; margin: 0 auto 20px;
        }
        @keyframes fc-spin { to { transform: rotate(360deg); } }

        .fc-prog-track {
          width: 100%; max-width: 320px; height: 4px; margin: 0 auto;
          background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden;
        }
        .fc-prog-fill {
          height: 100%; border-radius: 100px;
          background: linear-gradient(90deg, #f0c060, #f5ce78);
          transition: width 0.3s;
        }

        .fc-layout {
          display: grid;
          grid-template-columns: 390px 1fr;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 780px) {
          .fc-layout { grid-template-columns: 1fr; }
        }

        .fc-canvas-wrap { position: relative; }
        .fc-canvas-wrap canvas {
          display: block; width: 100%;
          border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
          cursor: crosshair;
        }
        .fc-canvas-label {
          position: absolute; bottom: -28px; left: 0; right: 0;
          text-align: center; font-size: 12px; color: rgba(240,192,96,0.7);
        }

        .fc-instructions {
          background: rgba(240,192,96,0.06); border: 1px solid rgba(240,192,96,0.15);
          border-radius: 12px; padding: 16px 18px; margin-bottom: 20px;
        }
        .fc-instructions p { font-size: 13px; line-height: 1.6; color: rgba(232,230,224,0.7); }
        .fc-instructions strong { color: #f0c060; }

        .fc-rect-info {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 14px 16px; margin-bottom: 20px;
        }
        .fc-rect-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(232,230,224,0.35); margin-bottom: 8px; }
        .fc-rect-vals  { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .fc-rect-val   { font-size: 13px; color: #e8e6e0; }
        .fc-rect-val span { color: rgba(232,230,224,0.4); font-size: 11px; }

        .fc-code {
          background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px; padding: 12px; font-family: monospace;
          font-size: 11px; color: rgba(240,192,96,0.8); white-space: pre;
          overflow-x: auto; margin-bottom: 16px;
        }

        .fc-done-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start;
        }
        @media (max-width: 600px) { .fc-done-grid { grid-template-columns: 1fr; } }

        .fc-final-img {
          width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
          background: repeating-conic-gradient(rgba(255,255,255,.04) 0% 25%, transparent 0% 50%) 0 0/16px 16px;
        }

        .fc-tip {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 12px 14px; border-radius: 10px;
          background: rgba(96,208,144,0.06); border: 1px solid rgba(96,208,144,0.15);
          font-size: 13px; color: rgba(96,208,144,0.85); line-height: 1.5; margin-bottom: 16px;
        }

        .fc-error {
          background: rgba(240,112,96,0.08); border: 1px solid rgba(240,112,96,0.2);
          border-radius: 10px; padding: 12px 16px;
          font-size: 13px; color: #f07060; margin-bottom: 20px;
        }

        .fc-footer {
          margin-top: 60px; font-size: 12px;
          color: rgba(232,230,224,0.2); text-align: center; line-height: 1.8;
        }
        .fc-footer a { color: rgba(240,192,96,0.4); text-decoration: none; }
        .fc-footer a:hover { color: #f0c060; }
      `}</style>

      <div className="fc-wrap">
        <div className="fc-header">
          <div className="fc-badge">Frame Converter</div>
          <h1 className="fc-title">Turn any image into a<br /><em>photobooth frame</em></h1>
          <p className="fc-sub">
            Upload a JPG or PNG — we remove the background, then you mark
            exactly where the guest photo should appear.
          </p>
        </div>

        {/* Step indicator */}
        <div className="fc-steps">
          {[
            { key: 'upload',   label: 'Upload' },
            { key: 'removing', label: 'Remove BG' },
            { key: 'draw',     label: 'Mark Area' },
            { key: 'done',     label: 'Download' },
          ].map((s, i, arr) => {
            const stepOrder = ['upload','removing','draw','done']
            const current   = stepOrder.indexOf(step)
            const mine      = stepOrder.indexOf(s.key)
            const cls = mine < current ? 'done' : mine === current ? 'active' : ''
            return (
              <span key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
                <span className={"fc-step " + cls}>
                  <span className="fc-step-num">{mine < current ? '✓' : i + 1}</span>
                  {s.label}
                </span>
                {i < arr.length - 1 && <span className="fc-step-div" />}
              </span>
            )
          })}
        </div>

        <div className="fc-card">
          {err && <div className="fc-error">⚠ {err}</div>}

          {/* UPLOAD */}
          {step === 'upload' && (
            <div
              className={"fc-drop" + (dropZone ? ' over' : '')}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDropZone(true) }}
              onDragLeave={() => setDropZone(false)}
              onDrop={handleDrop}
            >
              <div className="fc-drop-icon">🖼️</div>
              <p className="fc-drop-title">Drop your image here</p>
              <p className="fc-drop-sub">JPG · PNG · JPEG · WEBP<br />Any frame image with a solid background</p>
              <button className="fc-btn fc-btn-primary"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>
                Choose File
              </button>
              <input ref={fileInputRef} type="file" accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]) }} />
            </div>
          )}

          {/* REMOVING BG */}
          {step === 'removing' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="fc-spinner" />
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                Removing background...
              </p>
              <p style={{ fontSize: 13, color: 'rgba(232,230,224,0.4)', marginBottom: 20 }}>
                {progress < 10
                  ? 'Loading AI model (first run ~40MB, cached after)...'
                  : 'Analysing image edges...'}
              </p>
              {progress > 0 && (
                <div className="fc-prog-track">
                  <div className="fc-prog-fill" style={{ width: progress + '%' }} />
                </div>
              )}
            </div>
          )}

          {/* DRAW PHOTO AREA */}
          {step === 'draw' && (
            <div className="fc-layout">
              {/* Canvas */}
              <div className="fc-canvas-wrap">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_W}
                  height={CANVAS_H}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                />
                <div className="fc-canvas-label">
                  {rect && rect.w > 10 ? '✓ Area marked — will be punched out' : 'Optional: drag to mark photo area'}
                </div>
              </div>

              {/* Controls */}
              <div style={{ paddingTop: 8 }}>
                <div className="fc-instructions">
                  <p>
                    <strong>Optional:</strong> Drag a rectangle over the center to mark
                    where the guest photo appears. That area will be punched out transparently.<br /><br />
                    Or <strong>skip this step</strong> and download the bg-removed PNG as-is —
                    you can set the crop area later in the frame editor.
                  </p>
                </div>

                {rect && rect.w > 10 && (
                  <>
                    <div className="fc-rect-info">
                      <div className="fc-rect-label">Marked area</div>
                      <div className="fc-rect-vals">
                        <div className="fc-rect-val">X: {Math.round(rect.x)} <span>px</span></div>
                        <div className="fc-rect-val">Y: {Math.round(rect.y)} <span>px</span></div>
                        <div className="fc-rect-val">W: {Math.round(rect.w)} <span>px</span></div>
                        <div className="fc-rect-val">H: {Math.round(rect.h)} <span>px</span></div>
                      </div>
                    </div>

                    {cropRectJson && (
                      <>
                        <div className="fc-rect-label" style={{ marginBottom: 6 }}>Crop rect (for frame editor)</div>
                        <div className="fc-code">{cropRectJson}</div>
                      </>
                    )}
                  </>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    className="fc-btn fc-btn-primary"
                    disabled={!rect || rect.w < 10}
                    onClick={exportFrame}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    ✓ Generate Frame PNG
                  </button>
                  <button
                    className="fc-btn fc-btn-ghost"
                    onClick={() => { setRect(null); setStep('upload') }}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    ↩ Start over
                  </button>
                </div>

                <p style={{ fontSize: 11, color: 'rgba(232,230,224,0.25)', marginTop: 16, lineHeight: 1.6 }}>
                  Tip: If the background wasn't fully removed, try our
                  {' '}<a href="/bg-remover" style={{ color: 'rgba(240,192,96,0.5)' }}>bg-remover tool</a>{' '}
                  first, then upload the result here.
                </p>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === 'done' && finalUrl && (
            <div className="fc-done-grid">
              <div>
                <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14,
                            color: 'rgba(232,230,224,0.4)', letterSpacing: '0.08em',
                            textTransform: 'uppercase', marginBottom: 12 }}>
                  Result
                </p>
                <img src={finalUrl} alt="Final frame" className="fc-final-img" />
              </div>
              <div style={{ paddingTop: 8 }}>
                <div className="fc-tip">
                  <span>✓</span>
                  <span>
                    Frame PNG is ready. The checkerboard area is fully transparent —
                    guest photos will show through here.
                  </span>
                </div>

                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#e8e6e0' }}>
                  Next steps:
                </p>
                <ol style={{ fontSize: 13, color: 'rgba(232,230,224,0.55)', paddingLeft: 18,
                             lineHeight: 2, marginBottom: 24 }}>
                  <li>Download the PNG below</li>
                  <li>Go to <a href="/admin/frames" style={{ color: '#f0c060' }}>/admin/frames</a> → Upload</li>
                  <li>Open the frame editor → set crop area using the ✂ tool</li>
                  <li>Assign to events in the client dashboard</li>
                </ol>

                {cropRectJson && (
                  <>
                    <div className="fc-rect-label" style={{ marginBottom: 6 }}>
                      Save this crop_rect for the frame editor
                    </div>
                    <div className="fc-code">{cropRectJson}</div>
                  </>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button className="fc-btn fc-btn-primary"
                    onClick={download}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    ⬇ Download {fileName}-frame.png
                  </button>
                  <button className="fc-btn fc-btn-ghost"
                    onClick={() => { setStep('upload'); setBgUrl(null); setFinalUrl(null); setRect(null) }}
                    style={{ width: '100%', justifyContent: 'center' }}>
                    Convert another frame
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="fc-footer">
          Runs 100% in your browser · No image is uploaded to any server<br />
          <a href="/admin/frames">← Back to Frames</a>
          {' · '}
          <a href="/bg-remover">BG Remover tool</a>
        </div>
      </div>
    </>
  )
}
