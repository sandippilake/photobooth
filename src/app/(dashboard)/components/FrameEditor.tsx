'use client'
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'

export interface TextZone {
  id: string
  label: string
  defaultText: string
  maxChars: number
  x: number
  y: number
  width: number
  fontSize: number
  fontFamily: string
  color: string
  align: 'left' | 'center' | 'right'
  rotation: number
  shapeType: 'none' | 'badge' | 'tag' | 'bubble' | 'ribbon' | 'diamond' | 'heart' | 'star'
  shapeFill: string
  shapeOpacity: number
  shapeBorder: string
}

export interface ImageObject {
  id: string
  label: string
  src: string      // data URL or public URL
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export const DEFAULT_CROP: CropRect = { x: 0, y: 0, w: 390, h: 600 }

const FrameEditorKonva = dynamic(() => import('./FrameEditorKonva'), { ssr: false })

const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Impact', 'Trebuchet MS']

const SHAPES = [
  { id: 'none',    label: 'Text only', icon: 'T' },
  { id: 'badge',   label: 'Badge',     icon: '▬' },
  { id: 'tag',     label: 'Hang tag',  icon: '🏷' },
  { id: 'bubble',  label: 'Bubble',    icon: '💬' },
  { id: 'ribbon',  label: 'Ribbon',    icon: '🎀' },
  { id: 'diamond', label: 'Diamond',   icon: '◆' },
  { id: 'heart',   label: 'Heart',     icon: '♥' },
  { id: 'star',    label: 'Star',      icon: '★' },
] as const

function newZone(index: number): TextZone {
  return {
    id: Math.random().toString(36).slice(2, 8),
    label: `Text ${index + 1}`, defaultText: '', maxChars: 30,
    x: 195, y: 80 + index * 100, width: 180, fontSize: 22,
    fontFamily: 'Arial', color: '#ffffff', align: 'center', rotation: 0,
    shapeType: 'badge', shapeFill: '#000000', shapeOpacity: 0.55, shapeBorder: '#ffffff',
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #d1d5db', borderRadius: '8px',
  padding: '8px 12px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px',
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: '12px' }}><label style={labelStyle}>{label}</label>{children}</div>
}
function Divider() {
  return <div style={{ height: '1px', background: '#f3f4f6', margin: '12px 0' }} />
}

interface Props {
  zones: TextZone[]
  onChange: (zones: TextZone[]) => void
  images: ImageObject[]
  onImagesChange: (images: ImageObject[]) => void
  frameUrl: string
  onFrameUrlChange: (url: string) => void
  cropRect: CropRect
  onCropChange: (crop: CropRect) => void
}

type Tool = 'select' | 'crop'
type SelectedItem = { type: 'zone'; id: string } | { type: 'image'; id: string } | null

export default function FrameEditor({ zones, onChange, images, onImagesChange, frameUrl, onFrameUrlChange, cropRect, onCropChange }: Props) {
  const [selected, setSelected] = useState<SelectedItem>(null)
  const [tool, setTool] = useState<Tool>('select')
  const frameFileRef = useRef<HTMLInputElement>(null)
  const imgFileRef = useRef<HTMLInputElement>(null)

  const CANVAS_W = 390
  const CANVAS_H = 600

  // Delete key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selected) return
        if (selected.type === 'zone') {
          const next = zones.filter(z => z.id !== selected.id)
          onChange(next)
          setSelected(null)
        } else {
          const next = images.filter(img => img.id !== selected.id)
          onImagesChange(next)
          setSelected(null)
        }
      }
      if (e.key === 'Escape') setTool('select')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selected, zones, images])

  function addZone() {
    const z = newZone(zones.length)
    onChange([...zones, z])
    setSelected({ type: 'zone', id: z.id })
    setTool('select')
  }

  function removeZone(id: string) {
    onChange(zones.filter(z => z.id !== id))
    if (selected?.type === 'zone' && selected.id === id) setSelected(null)
  }

  function updateZone(id: string, patch: Partial<TextZone>) {
    onChange(zones.map(z => z.id === id ? { ...z, ...patch } : z))
  }

  function duplicateZone(id: string) {
    const z = zones.find(z => z.id === id)
    if (!z) return
    const copy = { ...z, id: Math.random().toString(36).slice(2, 8), x: z.x + 20, y: z.y + 20 }
    onChange([...zones, copy])
    setSelected({ type: 'zone', id: copy.id })
  }

  function handleFrameUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onFrameUrlChange(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const src = ev.target?.result as string
      // Get natural dimensions
      const img = new window.Image()
      img.onload = () => {
        const maxW = 200
        const scale = Math.min(maxW / img.width, maxW / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const obj: ImageObject = {
          id: Math.random().toString(36).slice(2, 8),
          label: file.name.replace(/\.[^/.]+$/, ''),
          src, x: 195, y: 300, width: w, height: h, rotation: 0, opacity: 1,
        }
        onImagesChange([...images, obj])
        setSelected({ type: 'image', id: obj.id })
      }
      img.src = src
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function updateImage(id: string, patch: Partial<ImageObject>) {
    onImagesChange(images.map(img => img.id === id ? { ...img, ...patch } : img))
  }

  function removeImage(id: string) {
    onImagesChange(images.filter(img => img.id !== id))
    if (selected?.type === 'image' && selected.id === id) setSelected(null)
  }

  const selectedZone = selected?.type === 'zone' ? zones.find(z => z.id === selected.id) : null
  const rawZone = selectedZone ? {
    shapeType: 'none' as TextZone['shapeType'], shapeFill: '#000000', shapeOpacity: 0.6,
    shapeBorder: '#ffffff', color: '#ffffff', fontFamily: 'Arial', align: 'center' as const,
    rotation: 0, width: 180, fontSize: 22, maxChars: 30, defaultText: '',
    ...selectedZone,
  } : null

  const selectedImage = selected?.type === 'image' ? images.find(img => img.id === selected.id) : null

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '640px' }}>

      {/* Left panel */}
      <div style={{ width: '180px', flexShrink: 0, borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
        <div style={{ padding: '10px', borderBottom: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: '6px' }}>

          {/* Replace frame */}
          <button onClick={() => frameFileRef.current?.click()} type="button"
            style={{ width: '100%', background: '#7c3aed', color: 'white', fontSize: '11px', fontWeight: 500, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            🖼 Replace frame
          </button>
          <input ref={frameFileRef} type="file" accept="image/png,image/svg+xml" className="hidden" style={{ display: 'none' }} onChange={handleFrameUpload} />

          {/* Add text zone */}
          <button onClick={addZone} type="button"
            style={{ width: '100%', background: '#2563eb', color: 'white', fontSize: '11px', fontWeight: 500, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            T+ Add text zone
          </button>

          {/* Add image */}
          <button onClick={() => imgFileRef.current?.click()} type="button"
            style={{ width: '100%', background: '#059669', color: 'white', fontSize: '11px', fontWeight: 500, padding: '7px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            🖼+ Add image
          </button>
          <input ref={imgFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

          {/* Crop tool */}
          <button onClick={() => setTool(t => t === 'crop' ? 'select' : 'crop')} type="button"
            style={{
              width: '100%', fontSize: '11px', fontWeight: 500, padding: '7px', borderRadius: '8px', cursor: 'pointer',
              background: tool === 'crop' ? '#f59e0b' : 'white',
              color: tool === 'crop' ? 'white' : '#374151',
              border: `1px solid ${tool === 'crop' ? '#f59e0b' : '#d1d5db'}`,
            }}>
            {tool === 'crop' ? '✂ Drag to crop' : '✂ Set crop area'}
          </button>
          {tool === 'crop' && (
            <button onClick={() => { onCropChange(DEFAULT_CROP); setTool('select') }} type="button"
              style={{ width: '100%', fontSize: '10px', padding: '5px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', color: '#6b7280', cursor: 'pointer' }}>
              Reset crop
            </button>
          )}
        </div>

        {/* Object list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <p style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px 4px', fontWeight: 600 }}>Objects</p>
          {zones.length === 0 && images.length === 0 && (
            <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '12px 8px' }}>No objects yet</p>
          )}
          {images.map(img => (
            <div key={img.id}
              onClick={() => { setSelected({ type: 'image', id: img.id }); setTool('select') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 10px', borderRadius: '8px', marginBottom: '3px',
                background: selected?.type === 'image' && selected.id === img.id ? '#059669' : 'white',
                color: selected?.type === 'image' && selected.id === img.id ? 'white' : '#374151',
                border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '11px',
              }}>
              <span>🖼</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.label}</p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); removeImage(img.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>
          ))}
          {zones.map(z => (
            <div key={z.id}
              onClick={() => { setSelected({ type: 'zone', id: z.id }); setTool('select') }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 10px', borderRadius: '8px', marginBottom: '3px',
                background: selected?.type === 'zone' && selected.id === z.id ? '#2563eb' : 'white',
                color: selected?.type === 'zone' && selected.id === z.id ? 'white' : '#374151',
                border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: '11px',
              }}>
              <span>{SHAPES.find(s => s.id === (z.shapeType || 'none'))?.icon || 'T'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{z.label}</p>
                <p style={{ margin: 0, fontSize: '10px', color: selected?.type === 'zone' && selected.id === z.id ? '#bfdbfe' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {z.defaultText || 'No default'}
                </p>
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); removeZone(z.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ padding: '8px 10px', borderTop: '1px solid #e5e7eb', fontSize: '10px', color: '#9ca3af' }}>
          Select object + press <kbd style={{ background: '#e5e7eb', padding: '1px 4px', borderRadius: '3px', fontFamily: 'monospace' }}>Del</kbd> to delete
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, background: '#1f2937', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '24px', overflowY: 'auto' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', flexShrink: 0 }}>
          <FrameEditorKonva
            zones={zones}
            onChange={onChange}
            images={images}
            onImagesChange={onImagesChange}
            frameUrl={frameUrl}
            displayW={CANVAS_W}
            displayH={CANVAS_H}
            selected={selected}
            onSelect={setSelected}
            tool={tool}
            cropRect={cropRect}
            onCropChange={onCropChange}
          />
        </div>
      </div>

      {/* Right panel — properties */}
      <div style={{ width: '256px', flexShrink: 0, borderLeft: '1px solid #e5e7eb', overflowY: 'auto', background: 'white' }}>
        {tool === 'crop' ? (
          <div style={{ padding: '16px' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 8px' }}>Crop area</p>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
              Drag on canvas to set crop. The exported photo clips to this area. Objects can hang outside.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {([['X', 'x'], ['Y', 'y'], ['W', 'w'], ['H', 'h']] as [string, keyof CropRect][]).map(([lbl, key]) => (
                <div key={key}>
                  <label style={labelStyle}>{lbl}</label>
                  <input type="number" value={cropRect[key]}
                    onChange={e => onCropChange({ ...cropRect, [key]: Math.max(0, parseInt(e.target.value) || 0) })}
                    style={{ ...inputStyle, padding: '6px 8px' }} />
                </div>
              ))}
            </div>
            <button onClick={() => setTool('select')}
              style={{ marginTop: '12px', width: '100%', background: '#2563eb', color: 'white', fontSize: '13px', padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
              Done
            </button>
          </div>
        ) : selectedImage ? (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Image</p>
              <button type="button" onClick={() => removeImage(selectedImage.id)}
                style={{ fontSize: '12px', color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
            </div>
            <Field label="Label">
              <input value={selectedImage.label} onChange={e => updateImage(selectedImage.id, { label: e.target.value })} style={inputStyle} />
            </Field>
            <Divider />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {([['X', 'x'], ['Y', 'y'], ['W', 'width'], ['H', 'height'], ['Rotate°', 'rotation']] as [string, keyof ImageObject][]).map(([lbl, key]) => (
                <div key={key}>
                  <label style={labelStyle}>{lbl}</label>
                  <input type="number" value={Math.round((selectedImage[key] as number) || 0)}
                    onChange={e => updateImage(selectedImage.id, { [key]: parseInt(e.target.value) || 0 })}
                    style={{ ...inputStyle, padding: '6px 8px' }} />
                </div>
              ))}
            </div>
            <Field label={`Opacity — ${Math.round(selectedImage.opacity * 100)}%`}>
              <input type="range" min={0} max={1} step={0.05} value={selectedImage.opacity}
                onChange={e => updateImage(selectedImage.id, { opacity: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#059669' }} />
            </Field>
            <div style={{ marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
              <img src={selectedImage.src} alt="preview" style={{ width: '100%', display: 'block' }} />
            </div>
          </div>
        ) : rawZone ? (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>Text zone</p>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button type="button" onClick={() => duplicateZone(rawZone.id)}
                  style={{ fontSize: '12px', color: '#6b7280', padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer' }}>⧉</button>
                <button type="button" onClick={() => removeZone(rawZone.id)}
                  style={{ fontSize: '12px', color: '#ef4444', padding: '4px 8px', border: 'none', background: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            <Field label="Label">
              <input value={rawZone.label} onChange={e => updateZone(rawZone.id, { label: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Default text">
              <input value={rawZone.defaultText} onChange={e => updateZone(rawZone.id, { defaultText: e.target.value })} placeholder="e.g. Sarah" style={inputStyle} />
            </Field>
            <Field label="Max chars">
              <input type="number" min={1} max={100} value={rawZone.maxChars}
                onChange={e => updateZone(rawZone.id, { maxChars: parseInt(e.target.value) || 30 })} style={inputStyle} />
            </Field>

            <Divider />

            <Field label="Container shape">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                {SHAPES.map(s => (
                  <button key={s.id} type="button" onClick={() => updateZone(rawZone.id, { shapeType: s.id as TextZone['shapeType'] })}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: rawZone.shapeType === s.id ? '#2563eb' : '#f3f4f6', color: rawZone.shapeType === s.id ? 'white' : '#4b5563' }}>
                    <span style={{ fontSize: '16px', lineHeight: 1, marginBottom: '2px' }}>{s.icon}</span>
                    <span style={{ fontSize: '9px' }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            {rawZone.shapeType !== 'none' && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Fill</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="color" value={rawZone.shapeFill || '#000000'} onChange={e => updateZone(rawZone.id, { shapeFill: e.target.value })}
                        style={{ width: '36px', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
                      <input value={rawZone.shapeFill || '#000000'} onChange={e => updateZone(rawZone.id, { shapeFill: e.target.value })}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px', flex: 1, minWidth: 0 }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Border</label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input type="color" value={rawZone.shapeBorder || '#ffffff'} onChange={e => updateZone(rawZone.id, { shapeBorder: e.target.value })}
                        style={{ width: '36px', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
                      <input value={rawZone.shapeBorder || '#ffffff'} onChange={e => updateZone(rawZone.id, { shapeBorder: e.target.value })}
                        style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px', flex: 1, minWidth: 0 }} />
                    </div>
                  </div>
                </div>
                <Field label={`Opacity — ${Math.round((rawZone.shapeOpacity ?? 0.6) * 100)}%`}>
                  <input type="range" min={0} max={1} step={0.05} value={rawZone.shapeOpacity ?? 0.6}
                    onChange={e => updateZone(rawZone.id, { shapeOpacity: parseFloat(e.target.value) })}
                    style={{ width: '100%', accentColor: '#2563eb' }} />
                </Field>
              </>
            )}

            <Divider />

            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Text color</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="color" value={rawZone.color || '#ffffff'} onChange={e => updateZone(rawZone.id, { color: e.target.value })}
                    style={{ width: '36px', height: '32px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', padding: '2px', flexShrink: 0 }} />
                  <input value={rawZone.color || '#ffffff'} onChange={e => updateZone(rawZone.id, { color: e.target.value })}
                    style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11px', flex: 1, minWidth: 0 }} />
                </div>
              </div>
              <div style={{ width: '72px' }}>
                <label style={labelStyle}>Size</label>
                <input type="number" min={8} max={72} value={rawZone.fontSize || 22}
                  onChange={e => updateZone(rawZone.id, { fontSize: parseInt(e.target.value) || 22 })} style={inputStyle} />
              </div>
            </div>

            <Field label="Font">
              <select value={rawZone.fontFamily || 'Arial'} onChange={e => updateZone(rawZone.id, { fontFamily: e.target.value })} style={inputStyle}>
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>

            <Field label="Alignment">
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['left', 'center', 'right'] as const).map(a => (
                  <button key={a} type="button" onClick={() => updateZone(rawZone.id, { align: a })}
                    style={{ flex: 1, padding: '6px', borderRadius: '8px', fontSize: '12px', fontWeight: 500, border: '1px solid', cursor: 'pointer',
                      background: rawZone.align === a ? '#2563eb' : 'white', color: rawZone.align === a ? 'white' : '#4b5563', borderColor: rawZone.align === a ? '#2563eb' : '#d1d5db' }}>
                    {a === 'left' ? '⬅' : a === 'center' ? '↔' : '➡'}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Width">
              <input type="number" min={40} max={380} value={rawZone.width || 180}
                onChange={e => updateZone(rawZone.id, { width: parseInt(e.target.value) || 180 })} style={inputStyle} />
            </Field>

            <Divider />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {([['X', 'x'], ['Y', 'y'], ['Rotate°', 'rotation']] as [string, keyof TextZone][]).map(([lbl, key]) => (
                <div key={key}>
                  <label style={labelStyle}>{lbl}</label>
                  <input type="number" value={Math.round((rawZone[key] as number) || 0)}
                    onChange={e => updateZone(rawZone.id, { [key]: parseInt(e.target.value) || 0 })}
                    style={{ ...inputStyle, padding: '6px 8px' }} />
                </div>
              ))}
            </div>

            <Field label="Preview">
              <div style={{ background: '#374151', borderRadius: '8px', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '48px' }}>
                <span style={{
                  fontFamily: rawZone.fontFamily, fontSize: `${Math.min(rawZone.fontSize, 24)}px`,
                  color: rawZone.color, wordBreak: 'break-all',
                  background: rawZone.shapeType !== 'none' ? rawZone.shapeFill : 'transparent',
                  padding: rawZone.shapeType !== 'none' ? '4px 14px' : '0',
                  borderRadius: rawZone.shapeType === 'badge' ? '20px' : '6px',
                  border: rawZone.shapeType !== 'none' ? `1.5px solid ${rawZone.shapeBorder}` : 'none',
                }}>
                  {rawZone.defaultText || rawZone.label || 'Preview'}
                </span>
              </div>
            </Field>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#9ca3af', lineHeight: 1.5 }}>
              Select an object on the canvas or from the list to edit it
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
