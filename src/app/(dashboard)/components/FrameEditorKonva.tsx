'use client'

import { useRef, useState, useEffect } from 'react'
import type { TextZone, ImageObject, CropRect } from './FrameEditor'

const FRAME_W = 390
const FRAME_H = 600
const OFFSET = 80

type SelectedItem = { type: 'zone'; id: string } | { type: 'image'; id: string } | null

interface Props {
  zones: TextZone[]
  onChange: (zones: TextZone[]) => void
  images: ImageObject[]
  onImagesChange: (images: ImageObject[]) => void
  frameUrl: string
  displayW: number
  displayH: number
  selected: SelectedItem
  onSelect: (s: SelectedItem) => void
  tool: 'select' | 'crop'
  cropRect: CropRect
  onCropChange: (crop: CropRect) => void
}

function drawShape(zone: TextZone, ctx: CanvasRenderingContext2D, scale: number, ox: number, oy: number) {
  if (!zone.shapeType || zone.shapeType === 'none') return
  const w = zone.width * scale, h = zone.fontSize * scale * 2.4
  ctx.save()
  ctx.translate(ox + zone.x * scale, oy + zone.y * scale)
  if (zone.rotation) ctx.rotate((zone.rotation * Math.PI) / 180)
  ctx.globalAlpha = zone.shapeOpacity ?? 0.6
  ctx.fillStyle = zone.shapeFill || '#000000'
  ctx.strokeStyle = zone.shapeBorder || '#ffffff'
  ctx.lineWidth = 1.5
  if (zone.shapeType === 'badge') { ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,h/2); ctx.fill(); ctx.stroke() }
  else if (zone.shapeType === 'bubble') {
    ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,h/3); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-w/4,h/2); ctx.lineTo(-w/4-8*scale,h/2+12*scale); ctx.lineTo(-w/4+10*scale,h/2); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (zone.shapeType === 'ribbon') {
    const sk=h*0.28; ctx.beginPath(); ctx.moveTo(-w/2+sk,-h/2); ctx.lineTo(w/2,-h/2); ctx.lineTo(w/2-sk,h/2); ctx.lineTo(-w/2,h/2); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (zone.shapeType === 'diamond') {
    ctx.beginPath(); ctx.moveTo(0,-h/2-4*scale); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2+4*scale); ctx.lineTo(-w/2,0); ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (zone.shapeType === 'heart') {
    const s=Math.min(w,h*1.4)/2; ctx.beginPath(); ctx.moveTo(0,s*0.35)
    ctx.bezierCurveTo(-s*0.1,-s*0.25,-s,-s*0.65,-s,-s*0.2); ctx.bezierCurveTo(-s,s*0.45,0,s*0.85,0,s*0.85)
    ctx.bezierCurveTo(0,s*0.85,s,s*0.45,s,-s*0.2); ctx.bezierCurveTo(s,-s*0.65,s*0.1,-s*0.25,0,s*0.35)
    ctx.fill(); ctx.stroke()
  } else if (zone.shapeType === 'star') {
    const outer=Math.min(w,h)*0.52, inner=Math.min(w,h)*0.28; ctx.beginPath()
    for (let i=0;i<10;i++) { const r2=i%2===0?outer:inner,a=(i*Math.PI)/5-Math.PI/2; i===0?ctx.moveTo(r2*Math.cos(a),r2*Math.sin(a)):ctx.lineTo(r2*Math.cos(a),r2*Math.sin(a)) }
    ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (zone.shapeType === 'tag') {
    ctx.beginPath(); ctx.roundRect(-w/2,-h/2,w,h,6); ctx.fill(); ctx.stroke()
    ctx.globalAlpha=1; ctx.beginPath(); ctx.arc(0,-h/2-4*scale,4*scale,0,Math.PI*2); ctx.fillStyle=zone.shapeBorder||'#fff'; ctx.fill()
    ctx.beginPath(); ctx.moveTo(0,-h/2-20*scale); ctx.lineTo(0,-h/2-8*scale); ctx.strokeStyle=zone.shapeBorder||'#fff'; ctx.globalAlpha=0.7; ctx.stroke()
  }
  ctx.restore()
}

function selectionBox(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, rotation: number, color: string) {
  ctx.save()
  ctx.translate(cx, cy)
  if (rotation) ctx.rotate((rotation * Math.PI) / 180)
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([5, 3])
  ctx.strokeRect(-w/2-4, -h/2-4, w+8, h+8); ctx.setLineDash([])
  ctx.fillStyle = color
  ;[[-w/2-4,-h/2-4],[w/2+4,-h/2-4],[-w/2-4,h/2+4],[w/2+4,h/2+4]].forEach(([hx,hy]) => {
    ctx.beginPath(); ctx.arc(hx,hy,5,0,Math.PI*2); ctx.fill()
  })
  ctx.restore()
}

export default function FrameEditorKonva({ zones, onChange, images, onImagesChange, frameUrl, displayW, selected, onSelect, tool, cropRect, onCropChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sampleImg, setSampleImg] = useState<HTMLImageElement | null>(null)
  const [frameImg, setFrameImg] = useState<HTMLImageElement | null>(null)
  const [loadedImages, setLoadedImages] = useState<Record<string, HTMLImageElement>>({})
  const [dragging, setDragging] = useState<{ type: 'zone'|'image'; id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const [cropDrag, setCropDrag] = useState<{ startX: number; startY: number } | null>(null)

  const scale = displayW / FRAME_W
  const ox = OFFSET * scale, oy = OFFSET * scale
  const editorW = (FRAME_W + OFFSET * 2) * scale
  const editorH = (FRAME_H + OFFSET * 2) * scale

  useEffect(() => {
    const img = new Image(); img.src = '/sample-photo.svg'; img.onload = () => setSampleImg(img)
  }, [])

  useEffect(() => {
    if (!frameUrl) return
    const img = new Image(); img.crossOrigin = 'anonymous'; img.src = frameUrl
    img.onload = () => setFrameImg(img)
  }, [frameUrl])

  // Load image objects
  useEffect(() => {
    images.forEach(imgObj => {
      if (loadedImages[imgObj.id]) return
      const img = new Image()
      img.onload = () => setLoadedImages(prev => ({ ...prev, [imgObj.id]: img }))
      img.src = imgObj.src
    })
  }, [images])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, editorW, editorH)

    // Outer bg
    ctx.fillStyle = '#374151'; ctx.fillRect(0, 0, editorW, editorH)

    // Checkerboard in frame area
    const cs = 12
    for (let row = 0; row * cs < FRAME_H * scale; row++)
      for (let col = 0; col * cs < FRAME_W * scale; col++) {
        ctx.fillStyle = (row+col)%2===0 ? '#e5e7eb' : '#d1d5db'
        ctx.fillRect(ox+col*cs, oy+row*cs, cs, cs)
      }

    // Sample photo clipped to frame
    if (sampleImg) {
      ctx.save(); ctx.beginPath(); ctx.rect(ox,oy,FRAME_W*scale,FRAME_H*scale); ctx.clip()
      ctx.drawImage(sampleImg, ox, oy, FRAME_W*scale, FRAME_H*scale); ctx.restore()
    }

    // Frame image clipped
    if (frameImg) {
      ctx.save(); ctx.beginPath(); ctx.rect(ox,oy,FRAME_W*scale,FRAME_H*scale); ctx.clip()
      ctx.drawImage(frameImg, ox, oy, FRAME_W*scale, FRAME_H*scale); ctx.restore()
    }

    // Frame border
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 1; ctx.setLineDash([4,4])
    ctx.strokeRect(ox, oy, FRAME_W*scale, FRAME_H*scale); ctx.setLineDash([])

    // Image objects
    images.forEach(imgObj => {
      const img = loadedImages[imgObj.id]
      if (!img) return
      ctx.save()
      ctx.translate(ox + imgObj.x*scale, oy + imgObj.y*scale)
      if (imgObj.rotation) ctx.rotate((imgObj.rotation*Math.PI)/180)
      ctx.globalAlpha = imgObj.opacity ?? 1
      ctx.drawImage(img, -imgObj.width*scale/2, -imgObj.height*scale/2, imgObj.width*scale, imgObj.height*scale)
      ctx.restore()
      if (selected?.type === 'image' && selected.id === imgObj.id) {
        selectionBox(ctx, ox+imgObj.x*scale, oy+imgObj.y*scale, imgObj.width*scale, imgObj.height*scale, imgObj.rotation, '#059669')
      }
    })

    // Zones
    zones.forEach(zone => {
      drawShape(zone, ctx, scale, ox, oy)
      ctx.save()
      ctx.translate(ox+zone.x*scale, oy+zone.y*scale)
      if (zone.rotation) ctx.rotate((zone.rotation*Math.PI)/180)
      ctx.globalAlpha = 1; ctx.fillStyle = zone.color||'#ffffff'
      ctx.font = `${zone.fontSize*scale}px ${zone.fontFamily||'Arial'}`
      ctx.textAlign = (zone.align as CanvasTextAlign)||'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(zone.defaultText||zone.label, 0, 0)
      ctx.restore()
      if (selected?.type === 'zone' && selected.id === zone.id) {
        selectionBox(ctx, ox+zone.x*scale, oy+zone.y*scale, zone.width*scale, zone.fontSize*scale*2.4, zone.rotation||0, '#3b82f6')
      }
    })

    // Crop overlay
    const cx=ox+cropRect.x*scale, cy=oy+cropRect.y*scale, cw=cropRect.w*scale, ch=cropRect.h*scale
    ctx.fillStyle='rgba(0,0,0,0.45)'
    ctx.fillRect(ox,oy,FRAME_W*scale,cropRect.y*scale)
    ctx.fillRect(ox,cy+ch,FRAME_W*scale,(FRAME_H-cropRect.y-cropRect.h)*scale)
    ctx.fillRect(ox,cy,cropRect.x*scale,ch)
    ctx.fillRect(cx+cw,cy,(FRAME_W-cropRect.x-cropRect.w)*scale,ch)
    ctx.strokeStyle=tool==='crop'?'#f59e0b':'rgba(255,255,255,0.5)'; ctx.lineWidth=tool==='crop'?2:1
    ctx.setLineDash(tool==='crop'?[8,4]:[3,3]); ctx.strokeRect(cx,cy,cw,ch); ctx.setLineDash([])
    if (tool==='crop') {
      ctx.fillStyle='#f59e0b'
      ;[[cx,cy],[cx+cw,cy],[cx,cy+ch],[cx+cw,cy+ch]].forEach(([hx,hy]) => { ctx.beginPath(); ctx.arc(hx,hy,6,0,Math.PI*2); ctx.fill() })
      ctx.font='12px Arial'; ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillText(`${cropRect.w}×${cropRect.h}`,cx+6,cy+6)
    }
  }, [zones, images, selected, sampleImg, frameImg, loadedImages, scale, cropRect, tool])

  function hitTestZone(x: number, y: number) {
    for (let i=zones.length-1;i>=0;i--) {
      const z=zones[i], zx=ox+z.x*scale, zy=oy+z.y*scale, w=z.width*scale, h=z.fontSize*scale*2.4
      if (x>=zx-w/2-8&&x<=zx+w/2+8&&y>=zy-h/2-8&&y<=zy+h/2+8) return z.id
    }
    return null
  }

  function hitTestImage(x: number, y: number) {
    for (let i=images.length-1;i>=0;i--) {
      const img=images[i], ix=ox+img.x*scale, iy=oy+img.y*scale, w=img.width*scale/2, h=img.height*scale/2
      if (x>=ix-w&&x<=ix+w&&y>=iy-h&&y<=iy+h) return img.id
    }
    return null
  }

  function coords(e: React.MouseEvent<HTMLCanvasElement>) {
    const r=canvasRef.current!.getBoundingClientRect()
    return {x:e.clientX-r.left, y:e.clientY-r.top}
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const {x,y}=coords(e)
    if (tool==='crop') {
      const fx=Math.round((x-ox)/scale), fy=Math.round((y-oy)/scale)
      setCropDrag({startX:x,startY:y})
      onCropChange({x:Math.max(0,fx),y:Math.max(0,fy),w:1,h:1})
      return
    }
    // Zones on top
    const zid=hitTestZone(x,y)
    if (zid) {
      const z=zones.find(z=>z.id===zid)!
      onSelect({type:'zone',id:zid})
      setDragging({type:'zone',id:zid,startX:x,startY:y,origX:z.x,origY:z.y})
      e.preventDefault(); return
    }
    const iid=hitTestImage(x,y)
    if (iid) {
      const img=images.find(i=>i.id===iid)!
      onSelect({type:'image',id:iid})
      setDragging({type:'image',id:iid,startX:x,startY:y,origX:img.x,origY:img.y})
      e.preventDefault(); return
    }
    onSelect(null)
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const {x,y}=coords(e)
    if (tool==='crop'&&cropDrag) {
      const x0=Math.round((cropDrag.startX-ox)/scale), y0=Math.round((cropDrag.startY-oy)/scale)
      const x1=Math.round(Math.max(0,Math.min(FRAME_W,(x-ox)/scale))), y1=Math.round(Math.max(0,Math.min(FRAME_H,(y-oy)/scale)))
      onCropChange({x:Math.min(x0,x1),y:Math.min(y0,y1),w:Math.max(1,Math.abs(x1-x0)),h:Math.max(1,Math.abs(y1-y0))})
      return
    }
    if (!dragging) return
    const dx=(x-dragging.startX)/scale, dy=(y-dragging.startY)/scale
    const nx=Math.round(dragging.origX+dx), ny=Math.round(dragging.origY+dy)
    if (dragging.type==='zone') onChange(zones.map(z=>z.id===dragging.id?{...z,x:nx,y:ny}:z))
    else onImagesChange(images.map(i=>i.id===dragging.id?{...i,x:nx,y:ny}:i))
  }

  function handleMouseUp() { setDragging(null); setCropDrag(null) }

  return (
    <canvas ref={canvasRef} width={editorW} height={editorH}
      style={{ display:'block', cursor:tool==='crop'?'crosshair':dragging?'grabbing':'default' }}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
  )
}
