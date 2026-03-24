'use client'
import { useRef, useEffect } from 'react'
import { Stage, Layer, Image as KonvaImage, Text, Rect, Group, RegularPolygon, Star, Path } from 'react-konva'
import useImage from 'use-image'
import type { TextZone } from '../../(dashboard)/components/FrameEditor'

function UserPhoto({ src, w, h, adjust, onDragEnd }: {
  src: string; w: number; h: number
  adjust: { brightness: number; contrast: number; warmth: number; zoom: number; tilt: number; x: number; y: number }
  onDragEnd: (x: number, y: number) => void
}) {
  const [image] = useImage(src)
  const imgRef = useRef<any>(null)

  useEffect(() => {
    if (!imgRef.current || !image) return
    const node = imgRef.current
    import('konva').then(({ default: Konva }) => {
      node.cache()
      node.filters([Konva.Filters.Brighten, Konva.Filters.Contrast, Konva.Filters.HSL])
      node.brightness((adjust.brightness - 100) / 100)
      node.contrast(adjust.contrast - 100)
      node.hue(adjust.warmth * 0.5)
      node.saturation(adjust.warmth * 0.02)
      node.getLayer()?.batchDraw()
    })
  }, [image, adjust.brightness, adjust.contrast, adjust.warmth])

  if (!image) return null
  const baseScale = Math.max(w / image.width, h / image.height)
  const drawW = image.width * baseScale
  const drawH = image.height * baseScale

  return (
    <KonvaImage ref={imgRef} image={image}
      x={w/2 + adjust.x} y={h/2 + adjust.y}
      width={drawW} height={drawH}
      offsetX={drawW/2} offsetY={drawH/2}
      rotation={adjust.tilt} scaleX={adjust.zoom} scaleY={adjust.zoom}
      draggable
      onDragEnd={e => {
        if (!image) return
        const effectiveW = drawW * adjust.zoom
        const effectiveH = drawH * adjust.zoom
        const maxX = (effectiveW - w) / 2
        const maxY = (effectiveH - h) / 2
        const rawX = e.target.x() - w / 2
        const rawY = e.target.y() - h / 2
        onDragEnd(
          Math.max(-maxX, Math.min(maxX, rawX)),
          Math.max(-maxY, Math.min(maxY, rawY))
        )
      }}
    />
  )
}

function FrameOverlay({ url, w, h }: { url: string; w: number; h: number }) {
  const [image] = useImage(url, 'anonymous')
  if (!image) return null
  return <KonvaImage image={image} x={0} y={0} width={w} height={h} listening={false} />
}

function ImageObj({ src, obj, scale }: { src: string; obj: any; scale: number }) {
  const [image] = useImage(src, 'anonymous')
  if (!image) return null
  return (
    <KonvaImage image={image}
      x={obj.x * scale} y={obj.y * scale}
      width={obj.width * scale} height={obj.height * scale}
      offsetX={obj.width * scale / 2} offsetY={obj.height * scale / 2}
      rotation={obj.rotation || 0}
      opacity={obj.opacity ?? 1}
      listening={false}
    />
  )
}

function ZoneShape({ zone, scale }: { zone: TextZone; scale: number }) {
  const w = zone.width * scale, h = zone.fontSize * scale * 2.4
  const fill = zone.shapeFill || '#000000'
  const opacity = zone.shapeOpacity ?? 0.6
  const stroke = zone.shapeBorder || '#ffffff'
  const sw = 1.5
  if (!zone.shapeType || zone.shapeType === 'none') return null
  if (zone.shapeType === 'badge') return <Rect x={-w/2} y={-h/2} width={w} height={h} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} cornerRadius={h/2} listening={false} />
  if (zone.shapeType === 'bubble') return (<>
    <Rect x={-w/2} y={-h/2} width={w} height={h} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} cornerRadius={h/3} listening={false} />
    <Path data={`M${-w/4},${h/2-1} L${-w/4-8*scale},${h/2+12*scale} L${-w/4+10*scale},${h/2-1}`} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} listening={false} />
  </>)
  if (zone.shapeType === 'ribbon') { const sk=h*0.28; return <Path data={`M${-w/2+sk},${-h/2} L${w/2},${-h/2} L${w/2-sk},${h/2} L${-w/2},${h/2} Z`} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} listening={false} /> }
  if (zone.shapeType === 'diamond') return <Path data={`M0,${-h/2-4*scale} L${w/2},0 L0,${h/2+4*scale} L${-w/2},0 Z`} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} listening={false} />
  if (zone.shapeType === 'heart') { const s=Math.min(w,h*1.4)/2; return <Path data={`M0,${s*0.35} C${-s*0.1},${-s*0.25} ${-s},${-s*0.65} ${-s},${-s*0.2} C${-s},${s*0.45} 0,${s*0.85} 0,${s*0.85} C0,${s*0.85} ${s},${s*0.45} ${s},${-s*0.2} C${s},${-s*0.65} ${s*0.1},${-s*0.25} 0,${s*0.35} Z`} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} listening={false} /> }
  if (zone.shapeType === 'star') return <Star numPoints={5} innerRadius={Math.min(w,h)*0.28} outerRadius={Math.min(w,h)*0.52} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} listening={false} />
  if (zone.shapeType === 'tag') return (<>
    <Rect x={-w/2} y={-h/2} width={w} height={h} fill={fill} opacity={opacity} stroke={stroke} strokeWidth={sw} cornerRadius={6} listening={false} />
    <Path data={`M0,${-h/2-20*scale} L0,${-h/2-8*scale}`} stroke={stroke} strokeWidth={sw} opacity={0.7} listening={false} />
    <RegularPolygon x={0} y={-h/2-8*scale} sides={20} radius={5*scale} fill={stroke} opacity={opacity+0.2} listening={false} />
  </>)
  return null
}

export default function BoothKonva({
  photoSrc, frameSrc, zones, imageObjects, customizations,
  guestLine1, guestLine2, stageRef, canvasW, canvasH, adjust, onPhotoDragEnd
}: {
  photoSrc: string
  frameSrc: string | null
  zones: any[]
  imageObjects: any[]
  customizations: Record<string, string> | null
  guestLine1: string
  guestLine2: string
  stageRef: any
  canvasW: number
  canvasH: number
  adjust: { brightness: number; contrast: number; warmth: number; zoom: number; tilt: number; x: number; y: number }
  onPhotoDragEnd: (x: number, y: number) => void
}) {
  const scale = canvasW / 390

  const clipToCanvas = (ctx: any) => {
    ctx.rect(0, 0, canvasW, canvasH)
  }

  // Guest panel — bottom 80px overlay
  const PANEL_H = 80 * scale
  const panelY = canvasH - PANEL_H

  return (
    <Stage ref={stageRef} width={canvasW} height={canvasH}>
      <Layer clipFunc={clipToCanvas}>
        <UserPhoto src={photoSrc} w={canvasW} h={canvasH} adjust={adjust} onDragEnd={onPhotoDragEnd} />
      </Layer>

      <Layer clipFunc={clipToCanvas}>
        {/* Image objects from frame */}
        {imageObjects?.map((obj: any, i: number) => (
          obj.src && <ImageObj key={i} src={obj.src} obj={obj} scale={scale} />
        ))}

        {frameSrc ? <FrameOverlay key={frameSrc} url={frameSrc} w={canvasW} h={canvasH} /> : null}

        {zones?.map((zone: any) => {
          const text = customizations?.[zone.id] || zone.defaultText || ''
          if (!text) return null
          const x = Number(zone.x) * scale, y = Number(zone.y) * scale
          const fontSize = Number(zone.fontSize) * scale
          const width = Number(zone.width) * scale
          return (
            <Group key={zone.id} x={x} y={y} rotation={zone.rotation || 0} listening={false}>
              <ZoneShape zone={zone} scale={scale} />
              <Text text={text} fontSize={fontSize} fontFamily={zone.fontFamily||'Arial'}
                fill={zone.color||'#ffffff'} align={zone.align||'center'}
                width={width} x={-width/2} y={-fontSize*0.6} listening={false} />
            </Group>
          )
        })}
      </Layer>

      {/* Guest info overlay at bottom */}
      {guestLine1 && (
        <Layer clipFunc={clipToCanvas}>
          <Rect x={0} y={panelY} width={canvasW} height={PANEL_H}
            fill="rgba(0,0,0,0.55)" listening={false} />
          <Text text={guestLine1} x={16*scale} y={panelY + 14*scale}
            width={(390-32)*scale} fontSize={Math.max(11, 15*scale)}
            fontFamily="Arial" fontStyle="bold" fill="#ffffff" align="left" listening={false} />
          {guestLine2 && (
            <Text text={`"${guestLine2}"`} x={16*scale} y={panelY + 38*scale}
              width={(390-32)*scale} fontSize={Math.max(9, 12*scale)}
              fontFamily="Arial" fontStyle="italic" fill="rgba(255,255,255,0.7)" align="left" listening={false} />
          )}
        </Layer>
      )}
    </Stage>
  )
}
