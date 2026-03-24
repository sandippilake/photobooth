'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/manage/Sidebar'

interface Frame {
  id: string; name: string; type: string
  png_url: string; thumbnail_url: string
  is_global: boolean; placeholder_schema: any[]
  created_at: string
}

export default function ManageFramesClient({ token }: { token: string }) {
  const router    = useRouter()
  const fileRef   = useRef<HTMLInputElement>(null)
  const [frames,        setFrames]        = useState<Frame[]>([])
  const [loading,       setLoading]       = useState(true)
  const [uploading,     setUploading]     = useState(false)
  const [uploadName,    setUploadName]    = useState('')
  const [uploadFile,    setUploadFile]    = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState('')
  const [err,           setErr]           = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const d = await fetch('/api/manage/frames').then(r => r.json())
    setFrames(d.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleGlobal = async (frame: Frame) => {
    await fetch('/api/manage/frames/' + frame.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_global: !frame.is_global }),
    })
    load()
  }

  const deleteFrame = async (id: string) => {
    setErr('')
    const res = await fetch('/api/manage/frames/' + id, { method: 'DELETE' })
    const d   = await res.json()
    if (!res.ok) { setErr(d.error || 'Delete failed'); setDeleteConfirm(null); return }
    setDeleteConfirm(null)
    load()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadFile(f)
    setUploadPreview(URL.createObjectURL(f))
    if (!uploadName) setUploadName(f.name.replace(/\.[^/.]+$/, ''))
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadName) return
    setUploading(true); setErr('')
    const reader = new FileReader()
    reader.onload = async ev => {
      const res = await fetch('/api/admin/frames/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: uploadName,
          fileDataUrl: ev.target?.result,
          fileName: uploadFile.name,
        }),
      })
      if (res.ok) {
        setUploadName(''); setUploadFile(null); setUploadPreview('')
        if (fileRef.current) fileRef.current.value = ''
        load()
      } else {
        try {
          const d = await res.json()
          setErr(d.error || 'Upload failed')
        } catch {
          setErr('Upload failed (status ' + res.status + ')')
        }
      }
      setUploading(false)
    }
    reader.readAsDataURL(uploadFile)
  }

  const galleryFrames = frames.filter(f => f.type === 'gallery')
  const customFrames  = frames.filter(f => f.type === 'custom')

  return (
    <div className="mg-shell">
      <Sidebar />
      <main className="mg-main" style={{ maxWidth: 1100 }}>

        <div className="mg-page-header">
          <div>
            <h1 className="mg-page-title">Gallery Frames</h1>
            <p className="mg-page-subtitle">Upload and manage frames available to all clients</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="mg-badge active">{galleryFrames.length} gallery</span>
            <span className="mg-badge agent">{customFrames.length} custom</span>
          </div>
        </div>

        {err && <p className="mg-error-msg" style={{ marginBottom: 20 }}>{err}</p>}

        {/* Upload card */}
        <div className="mg-table-wrap" style={{ padding: 24, marginBottom: 28 }}>
          <p className="mg-table-title" style={{ marginBottom: 4 }}>Upload New Frame</p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            Transparent PNG or SVG · 390×600px recommended · After upload, open the frame to add text zones
          </p>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {uploadPreview && (
              <img src={uploadPreview} alt="Preview"
                style={{ width: 60, aspectRatio: '390/600', objectFit: 'cover',
                         borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,.05)' }} />
            )}
            <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                className="mg-input"
                value={uploadName}
                onChange={e => setUploadName(e.target.value)}
                placeholder="Frame name"
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="mg-btn mg-btn-ghost" style={{ flex: 1 }}
                  onClick={() => fileRef.current?.click()}>
                  {uploadFile ? uploadFile.name : 'Choose PNG / SVG'}
                </button>
                <input ref={fileRef} type="file" accept="image/png,image/svg+xml"
                  style={{ display: 'none' }} onChange={handleFileSelect} />
                <button className="mg-btn mg-btn-primary"
                  disabled={uploading || !uploadFile || !uploadName}
                  onClick={handleUpload}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Frames grid */}
        {loading ? (
          <div className="mg-empty"><p>Loading...</p></div>
        ) : frames.length === 0 ? (
          <div className="mg-empty">
            <div className="mg-empty-icon">🖼️</div>
            <p className="mg-empty-title">No frames yet</p>
            <p>Upload your first frame above</p>
          </div>
        ) : (
          <>
            {galleryFrames.length > 0 && (
              <section style={{ marginBottom: 32 }}>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700,
                            fontSize: 14, color: 'var(--muted)', letterSpacing: '0.08em',
                            textTransform: 'uppercase', marginBottom: 16 }}>
                  Gallery Frames ({galleryFrames.length})
                </p>
                <FrameGrid
                  frames={galleryFrames}
                  onToggle={toggleGlobal}
                  onEdit={id => router.push('/admin/frames/' + id)}
                  onDelete={id => setDeleteConfirm(id)}
                />
              </section>
            )}
            {customFrames.length > 0 && (
              <section>
                <p style={{ fontFamily: 'var(--font-head)', fontWeight: 700,
                            fontSize: 14, color: 'var(--muted)', letterSpacing: '0.08em',
                            textTransform: 'uppercase', marginBottom: 16 }}>
                  Custom Frames ({customFrames.length})
                </p>
                <FrameGrid
                  frames={customFrames}
                  onToggle={toggleGlobal}
                  onEdit={id => router.push('/admin/frames/' + id)}
                  onDelete={id => setDeleteConfirm(id)}
                />
              </section>
            )}
          </>
        )}
      </main>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="mg-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="mg-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <p className="mg-modal-title">Delete Frame?</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
              This cannot be undone. The frame will be removed from the gallery.
            </p>
            <div className="mg-modal-actions">
              <button className="mg-btn mg-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="mg-btn mg-btn-danger" onClick={() => deleteFrame(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FrameGrid({ frames, onToggle, onEdit, onDelete }: {
  frames: Frame[]
  onToggle: (f: Frame) => void
  onEdit:   (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 16,
    }}>
      {frames.map(frame => (
        <div key={frame.id} style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden',
        }}>
          {/* Thumbnail */}
          <div style={{ position: 'relative' }}>
            <img
              src={frame.thumbnail_url || frame.png_url}
              alt={frame.name}
              style={{
                width: '100%', aspectRatio: '390/600', objectFit: 'cover',
                display: 'block',
                background: 'repeating-conic-gradient(rgba(255,255,255,.04) 0% 25%, transparent 0% 50%) 0 0/16px 16px',
              }}
            />
            {(frame.placeholder_schema?.length || 0) > 0 && (
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(96,192,240,.9)', color: '#0a0a0f',
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
              }}>
                {frame.placeholder_schema.length} zones
              </div>
            )}
            <div style={{
              position: 'absolute', top: 8, right: 8,
              background: frame.is_global ? 'rgba(96,208,144,.9)' : 'rgba(240,112,96,.8)',
              color: '#0a0a0f', fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 100,
            }}>
              {frame.is_global ? 'Visible' : 'Hidden'}
            </div>
          </div>

          {/* Info + actions */}
          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {frame.name}
            </p>
            <button className="mg-btn mg-btn-ghost mg-btn-sm" style={{ width: '100%' }}
              onClick={() => onEdit(frame.id)}>
              Edit text zones
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="mg-btn mg-btn-sm"
                style={{
                  flex: 1,
                  background: frame.is_global ? 'rgba(96,208,144,.12)' : 'rgba(255,255,255,.05)',
                  color: frame.is_global ? 'var(--success)' : 'var(--muted)',
                  border: '1px solid ' + (frame.is_global ? 'rgba(96,208,144,.3)' : 'var(--border)'),
                }}
                onClick={() => onToggle(frame)}>
                {frame.is_global ? 'Visible' : 'Hidden'}
              </button>
              <button className="mg-btn mg-btn-danger mg-btn-sm" onClick={() => onDelete(frame.id)}>
                Del
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
