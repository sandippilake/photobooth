'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

interface Frame {
  id: string
  name: string
  type: string
  png_url: string
  thumbnail_url: string
  is_global: boolean
  placeholder_schema: any[]
}

export default function AdminFramesClient({ token }: { token: string }) {
  const router = useRouter()
  const [frames, setFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState('')

  useEffect(() => { loadFrames() }, [])

  async function loadFrames() {
    setLoading(true)
    const res = await fetch(
      `${DIRECTUS_URL}/items/frames?sort=name&fields=id,name,type,png_url,thumbnail_url,is_global,placeholder_schema`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    setFrames(data.data || [])
    setLoading(false)
  }

  async function toggleGlobal(frame: Frame) {
    await fetch(`${DIRECTUS_URL}/items/frames/${frame.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_global: !frame.is_global }),
    })
    loadFrames()
  }

  async function deleteFrame(id: string) {
    if (!confirm('Delete this frame?')) return
    await fetch(`${DIRECTUS_URL}/items/frames/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    })
    loadFrames()
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile || !uploadName) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const res = await fetch('/api/admin/frames/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: uploadName, fileDataUrl: ev.target?.result, fileName: uploadFile.name }),
      })
      if (res.ok) {
        setUploadName(''); setUploadFile(null); setUploadPreview('')
        loadFrames()
      }
      setUploading(false)
    }
    reader.readAsDataURL(uploadFile)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Gallery frames</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage frames available to all clients</p>
      </div>

      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-1">Upload new frame</h2>
        <p className="text-sm text-gray-500 mb-4">Transparent PNG or SVG, 390×600px recommended.</p>
        <form onSubmit={handleUpload} className="flex gap-4 items-end flex-wrap">
          {uploadPreview && (
            <img src={uploadPreview} alt="Preview" className="w-16 rounded-xl border border-gray-200 bg-gray-50"
              style={{ aspectRatio: '390/600', objectFit: 'cover' }} />
          )}
          <div className="space-y-2">
            <input value={uploadName} onChange={e => setUploadName(e.target.value)}
              placeholder="Frame name" required
              className="block border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
            <input type="file" accept="image/png,image/svg+xml"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setUploadFile(f); setUploadPreview(URL.createObjectURL(f)) }
              }}
              className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          <button type="submit" disabled={uploading || !uploadFile || !uploadName}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {frames.map(frame => (
            <div key={frame.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="relative">
                <img src={frame.thumbnail_url || frame.png_url} alt={frame.name}
                  className="w-full object-cover bg-gray-100" style={{ aspectRatio: '390/600' }} />
                {(frame.placeholder_schema?.length || 0) > 0 && (
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {frame.placeholder_schema.length} zones
                  </div>
                )}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-sm font-medium text-gray-900 truncate">{frame.name}</p>
                <button onClick={() => router.push(`/admin/frames/${frame.id}`)}
                  className="w-full text-xs py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                  Edit text zones
                </button>
                <div className="flex gap-1">
                  <button onClick={() => toggleGlobal(frame)}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${frame.is_global ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {frame.is_global ? 'Visible' : 'Hidden'}
                  </button>
                  <button onClick={() => deleteFrame(frame.id)}
                    className="text-xs py-1.5 px-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
