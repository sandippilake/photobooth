'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

interface Frame {
  id: string
  name: string
  type: string
  png_url: string
  thumbnail_url: string
  placeholder_schema: any[]
}

export default function ClientFramesClient({ token, clientId }: { token: string; clientId: string }) {
  const router = useRouter()
  const [galleryFrames, setGalleryFrames] = useState<Frame[]>([])
  const [customFrames, setCustomFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadName, setUploadName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [gRes, cRes] = await Promise.all([
      fetch(`${DIRECTUS_URL}/items/frames?filter[is_global][_eq]=true&sort=name&fields=id,name,png_url,thumbnail_url,placeholder_schema`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${DIRECTUS_URL}/items/frames?filter[created_by][_eq]=${clientId}&filter[type][_eq]=custom&fields=id,name,png_url,thumbnail_url,placeholder_schema`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
    ])
    const [gData, cData] = await Promise.all([gRes.json(), cRes.json()])
    setGalleryFrames(gData.data || [])
    setCustomFrames(cData.data || [])
    setLoading(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    if (!uploadName) setUploadName(file.name.replace(/\.[^/.]+$/, ''))
  }

  async function handleUpload() {
    if (!selectedFile || !uploadName) return
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async ev => {
      const res = await fetch('/api/client/frames/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: uploadName, clientId, fileDataUrl: ev.target?.result, fileName: selectedFile.name }),
      })
      if (res.ok) {
        setSelectedFile(null); setPreviewUrl(null); setUploadName('')
        await loadData()
        // Auto-navigate to editor for new frame
        const latestRes = await fetch(
          `${DIRECTUS_URL}/items/frames?filter[created_by][_eq]=${clientId}&sort=-created_at&limit=1&fields=id`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const latestData = await latestRes.json()
        if (latestData.data?.[0]) router.push(`/client/frames/${latestData.data[0].id}`)
      }
      setUploading(false)
    }
    reader.readAsDataURL(selectedFile)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Frames</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload custom frames or use gallery frames</p>
      </div>

      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-1">Upload custom frame</h2>
        <p className="text-sm text-gray-500 mb-4">
          Transparent PNG at 390×600px. After uploading the text zone editor opens automatically.
        </p>
        <div className="flex gap-4 items-start flex-wrap">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-20 rounded-xl border border-gray-200 bg-gray-50"
              style={{ aspectRatio: '390/600', objectFit: 'cover' }} />
          )}
          <div className="flex-1 space-y-2 min-w-48">
            <input value={uploadName} onChange={e => setUploadName(e.target.value)}
              placeholder="Frame name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2 rounded-lg transition-colors truncate">
                {selectedFile ? selectedFile.name : 'Choose PNG'}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/svg+xml" className="hidden" onChange={handleFileSelect} />
              <button onClick={handleUpload} disabled={!selectedFile || !uploadName || uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-2 rounded-lg">
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading...</p> : (
        <>
          {customFrames.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-gray-900 mb-3">Your custom frames</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {customFrames.map(frame => (
                  <div key={frame.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="relative">
                      <img src={frame.thumbnail_url || frame.png_url} alt={frame.name}
                        className="w-full bg-gray-100" style={{ aspectRatio: '390/600', objectFit: 'cover' }} />
                      {(frame.placeholder_schema?.length || 0) > 0 && (
                        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                          {frame.placeholder_schema.length} zones
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate mb-2">{frame.name}</p>
                      <button onClick={() => router.push(`/client/frames/${frame.id}`)}
                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs py-1.5 rounded-lg font-medium transition-colors">
                        {(frame.placeholder_schema?.length || 0) > 0
                          ? `Edit zones (${frame.placeholder_schema.length})`
                          : 'Add text zones'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Gallery frames</h2>
            <p className="text-xs text-gray-400 mb-3">Created by admin — assign to your events</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {galleryFrames.map(frame => (
                <div key={frame.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="relative">
                    <img src={frame.thumbnail_url || frame.png_url} alt={frame.name}
                      className="w-full bg-gray-100" style={{ aspectRatio: '390/600', objectFit: 'cover' }} />
                    {(frame.placeholder_schema?.length || 0) > 0 && (
                      <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {frame.placeholder_schema.length} zones
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{frame.name}</p>
                    {(frame.placeholder_schema?.length || 0) > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {frame.placeholder_schema.map((z: any) => z.label).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
