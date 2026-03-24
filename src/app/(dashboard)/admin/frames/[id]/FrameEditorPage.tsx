'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FrameEditor, { TextZone, CropRect, DEFAULT_CROP } from '../../../components/FrameEditor'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

interface Frame {
  id: string
  name: string
  png_url: string
  placeholder_schema: TextZone[]
  crop_rect: CropRect | null
}

function normalizeZone(z: any): TextZone {
  return {
    shapeType: 'none', shapeFill: '#000000', shapeOpacity: 0.6,
    shapeBorder: '#ffffff', color: '#ffffff', fontFamily: 'Arial',
    align: 'center', rotation: 0, width: 180, fontSize: 22,
    maxChars: 30, defaultText: '', label: 'Text zone', x: 195, y: 100,
    id: Math.random().toString(36).slice(2, 8), ...z,
  }
}

export default function FrameEditorPage({ frameId, token }: { frameId: string; token: string }) {
  const router = useRouter()
  const [frame, setFrame] = useState<Frame | null>(null)
  const [zones, setZones] = useState<TextZone[]>([])
  const [images, setImages] = useState<any[]>([])
  const [frameCurrentUrl, setFrameCurrentUrl] = useState<string>('')
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_CROP)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch(`${DIRECTUS_URL}/items/frames/${frameId}?fields=id,name,png_url,placeholder_schema,crop_rect`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(data => {
      setFrame(data.data)
      setZones((data.data.placeholder_schema || []).map(normalizeZone))
      setCropRect(data.data.crop_rect || DEFAULT_CROP)
    })
  }, [frameId])

  async function save() {
    setSaving(true)
    await fetch(`${DIRECTUS_URL}/items/frames/${frameId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeholder_schema: zones, crop_rect: cropRect, image_objects: images }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!frame) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <p style={{ color: '#6b7280' }}>Loading...</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/admin/frames')}
            style={{ color: '#9ca3af', fontSize: '14px', cursor: 'pointer', background: 'none', border: 'none' }}>← Back</button>
          <div style={{ width: '1px', height: '16px', background: '#e5e7eb' }} />
          <div>
            <p style={{ fontWeight: 600, color: '#111827', fontSize: '14px', margin: 0 }}>{frame.name}</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Drag zones · Set crop area with ✂ tool</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {saved && <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 500 }}>Saved ✓</span>}
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{zones.length} zone{zones.length !== 1 ? 's' : ''}</span>
          <button onClick={save} disabled={saving}
            style={{ background: saving ? '#93c5fd' : '#2563eb', color: 'white', fontSize: '14px', fontWeight: 500, padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <FrameEditor zones={zones} onChange={setZones} images={images} onImagesChange={setImages} frameUrl={frameCurrentUrl || frame.png_url} onFrameUrlChange={setFrameCurrentUrl} cropRect={cropRect} onCropChange={setCropRect} />
      </div>
    </div>
  )
}
