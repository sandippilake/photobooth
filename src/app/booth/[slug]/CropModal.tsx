'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

export default function CropModal({ src, onConfirm, onCancel }: {
  src: string
  onConfirm: (croppedSrc: string) => void
  onCancel: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const drawParamsRef = useRef<{ offsetX: number; offsetY: number; drawW: number; drawH: number }>({ offsetX: 0, offsetY: 0, drawW: 0, drawH: 0 })
  const dragRef = useRef<any>(null)
  const [crop, setCrop] = useState({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })
  const [handle, setHandle] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const CANVAS_W = 720
  const CANVAS_H = 560

  const draw = useCallback((c: typeof crop) => {
    if (!canvasRef.current || !imgRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const img = imgRef.current
    const { offsetX, offsetY, drawW, drawH } = drawParamsRef.current

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#111827'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH)

    const cx = offsetX + c.x * drawW
    const cy = offsetY + c.y * drawH
    const cw = c.w * drawW
    const ch = c.h * drawH

    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, CANVAS_W, cy)
    ctx.fillRect(0, cy, cx, ch)
    ctx.fillRect(cx + cw, cy, CANVAS_W - cx - cw, ch)
    ctx.fillRect(0, cy + ch, CANVAS_W, CANVAS_H - cy - ch)

    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(cx, cy, cw, ch)

    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(cx + cw * i / 3, cy); ctx.lineTo(cx + cw * i / 3, cy + ch); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy + ch * i / 3); ctx.lineTo(cx + cw, cy + ch * i / 3); ctx.stroke()
    }

    const hs = 12
    ctx.fillStyle = '#3b82f6'
    ;[[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]].forEach(([hx, hy]) => {
      ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs)
    })
  }, [])

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => {
      imgRef.current = img
      const scale = Math.min(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight)
      const drawW = img.naturalWidth * scale
      const drawH = img.naturalHeight * scale
      const offsetX = (CANVAS_W - drawW) / 2
      const offsetY = (CANVAS_H - drawH) / 2
      drawParamsRef.current = { offsetX, offsetY, drawW, drawH }
      setReady(true)
    }
    img.src = src
  }, [src])

  useEffect(() => { if (ready) draw(crop) }, [crop, draw, ready])

  const getPos = (e: any, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const px = e.touches ? e.touches[0].clientX : e.clientX
    const py = e.touches ? e.touches[0].clientY : e.clientY
    const { offsetX, offsetY, drawW, drawH } = drawParamsRef.current
    return {
      x: ((px - rect.left) / rect.width * CANVAS_W - offsetX) / drawW,
      y: ((py - rect.top) / rect.height * CANVAS_H - offsetY) / drawH,
    }
  }

  const hitHandle = (pos: any, c: typeof crop) => {
    const ht = 0.06
    const corners: Record<string, [number, number]> = {
      tl: [c.x, c.y], tr: [c.x + c.w, c.y], bl: [c.x, c.y + c.h], br: [c.x + c.w, c.y + c.h]
    }
    for (const [key, [hx, hy]] of Object.entries(corners)) {
      if (Math.abs(pos.x - hx) < ht && Math.abs(pos.y - hy) < ht) return key
    }
    if (pos.x > c.x && pos.x < c.x + c.w && pos.y > c.y && pos.y < c.y + c.h) return 'move'
    return null
  }

  const onMouseDown = (e: any) => {
    e.preventDefault()
    const pos = getPos(e, canvasRef.current!)
    const h = hitHandle(pos, crop)
    if (!h) return
    setHandle(h)
    dragRef.current = { start: pos, crop: { ...crop } }
  }

  const onMouseMove = useCallback((e: any) => {
    if (!handle || !dragRef.current) return
    e.preventDefault()
    const pos = getPos(e, canvasRef.current!)
    const dx = pos.x - dragRef.current.start.x
    const dy = pos.y - dragRef.current.start.y
    const base = dragRef.current.crop
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
    const minSz = 0.1
    setCrop(() => {
      if (handle === 'move') return { ...base, x: clamp(base.x + dx, 0, 1 - base.w), y: clamp(base.y + dy, 0, 1 - base.h) }
      if (handle === 'tl') {
        const nx = clamp(base.x + dx, 0, base.x + base.w - minSz)
        const ny = clamp(base.y + dy, 0, base.y + base.h - minSz)
        return { x: nx, y: ny, w: base.x + base.w - nx, h: base.y + base.h - ny }
      }
      if (handle === 'tr') {
        const ny = clamp(base.y + dy, 0, base.y + base.h - minSz)
        return { ...base, y: ny, w: clamp(base.w + dx, minSz, 1 - base.x), h: base.y + base.h - ny }
      }
      if (handle === 'bl') {
        const nx = clamp(base.x + dx, 0, base.x + base.w - minSz)
        return { ...base, x: nx, w: base.x + base.w - nx, h: clamp(base.h + dy, minSz, 1 - base.y) }
      }
      if (handle === 'br') return { ...base, w: clamp(base.w + dx, minSz, 1 - base.x), h: clamp(base.h + dy, minSz, 1 - base.y) }
      return base
    })
  }, [handle])

  const onMouseUp = useCallback(() => setHandle(null), [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onMouseMove, { passive: false })
    window.addEventListener('touchend', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onMouseMove)
      window.removeEventListener('touchend', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  function confirm() {
    const img = imgRef.current!
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * crop.w)
    canvas.height = Math.round(img.naturalHeight * crop.h)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img,
      img.naturalWidth * crop.x, img.naturalHeight * crop.y,
      img.naturalWidth * crop.w, img.naturalHeight * crop.h,
      0, 0, canvas.width, canvas.height
    )
    onConfirm(canvas.toDataURL('image/jpeg', 0.92))
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <p className="font-semibold text-white text-sm">Crop photo</p>
        <p className="text-xs text-gray-400">Drag corners · drag inside to move</p>
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden p-2">
        <canvas
          ref={canvasRef}
          width={CANVAS_W} height={CANVAS_H}
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
          className="block w-full max-h-full rounded-xl"
          style={{ cursor: handle === 'move' ? 'move' : 'crosshair', touchAction: 'none', objectFit: 'contain' }}
        />
      </div>
      <div className="flex gap-3 p-4 border-t border-white/10 flex-shrink-0">
        <p className="text-xs text-gray-500 flex-1 flex items-center">Crop is optional</p>
        <button onClick={onCancel}
          className="px-5 py-2.5 rounded-xl bg-white/10 text-gray-300 text-sm font-medium hover:bg-white/20 transition-colors">
          Skip
        </button>
        <button onClick={confirm}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
          Apply crop
        </button>
      </div>
    </div>
  )
}
