'use client'

import { useEffect, useState } from 'react'
import QRCode from 'react-qr-code'

interface Event {
  id: string
  name: string
  description: string | null
  tagline: string | null
  thanks_message: string | null
  slug: string
  pin: string | null
  is_active: boolean
  storage_enabled: boolean
  created_at: string
}

interface PlaceholderSchema {
  id: string
  label: string
  defaultText: string
  maxChars: number
  fontSize: number
  fontFamily: string
  color: string
  align: string
}

interface Frame {
  id: string
  name: string
  png_url: string
  thumbnail_url: string
  placeholder_schema: PlaceholderSchema[]
}

interface EventFrame {
  id: string
  frame_id: string
  is_active: boolean
  customizations: Record<string, string>
}

interface Quota {
  usages_total: number
  usages_used: number
  valid_until: string | null
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL
const APP_URL = process.env.NEXT_PUBLIC_APP_URL
const EMPTY_FORM = { name: '', description: '', tagline: '', pin: '', storage_enabled: false, thanks_message: '', bg_color: '#0a0a0a', accent_color: '#3b82f6' }

export default function EventsClient({ token, clientId }: { token: string; clientId: string }) {
  const [events, setEvents] = useState<Event[]>([])
  const [quota, setQuota] = useState<Quota | null>(null)
  const [galleryFrames, setGalleryFrames] = useState<Frame[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [qrEvent, setQrEvent] = useState<Event | null>(null)
  const [manageFramesEvent, setManageFramesEvent] = useState<Event | null>(null)
  const [eventFrames, setEventFrames] = useState<EventFrame[]>([])
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Placeholder editing
  const [placeholderModal, setPlaceholderModal] = useState<{
    frame: Frame
    eventFrameId: string | null  // null = new assignment
    eventId: string
    values: Record<string, string>
  } | null>(null)
  const [placeholderSaving, setPlaceholderSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [eventsRes, quotaRes, framesRes] = await Promise.all([
        fetch(`${DIRECTUS_URL}/items/events?filter[client_id][_eq]=${clientId}&sort=-created_at&fields=id,name,description,tagline,thanks_message,slug,pin,is_active,storage_enabled,created_at`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/client/quota'),  // dummy — replaced below
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${DIRECTUS_URL}/items/frames?filter[is_global][_eq]=true&sort=name&fields=id,name,png_url,thumbnail_url,placeholder_schema`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ])
      const [eventsData, quotaData, framesData] = await Promise.all([eventsRes.json(), quotaRes.json(), framesRes.json()])
      setEvents(eventsData.data || [])
      setQuota(quotaData || null)
      setGalleryFrames(framesData.data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  async function loadEventFrames(eventId: string) {
    const res = await fetch(
      `${DIRECTUS_URL}/items/event_frames?filter[event_id][_eq]=${eventId}&fields=id,frame_id,is_active,customizations`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const data = await res.json()
    setEventFrames(data.data || [])
  }

  function openCreate() {
    setEditingEvent(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowForm(true)
  }

  function openEdit(event: Event) {
    setEditingEvent(event)
    setForm({
      name: event.name,
      description: event.description || '',
      tagline: event.tagline || '',
      pin: event.pin || '',
      storage_enabled: event.storage_enabled,
      thanks_message: event.thanks_message || '',
      bg_color: (event as any).bg_color || '#0a0a0a',
      accent_color: (event as any).accent_color || '#3b82f6',
    })
    setError('')
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/client/events', {
        method: editingEvent ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clientId, ...(editingEvent ? { id: editingEvent.id } : {}) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setEditingEvent(null)
      setForm({ ...EMPTY_FORM })
      loadData()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function toggleActive(event: Event) {
    await fetch(`${DIRECTUS_URL}/items/events/${event.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !event.is_active }),
    })
    loadData()
  }

  // When a frame is tapped in the picker:
  // - if already assigned → unassign
  // - if not assigned and has placeholders → open placeholder form
  // - if not assigned and no placeholders → assign directly
  async function handleFrameTap(eventId: string, frame: Frame) {
    const existing = eventFrames.find(ef => ef.frame_id === frame.id)
    if (existing) {
      // Unassign
      await fetch(`${DIRECTUS_URL}/items/event_frames/${existing.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      await loadEventFrames(eventId)
      return
    }

    const schema = frame.placeholder_schema || []
    if (schema.length > 0) {
      // Show placeholder form before assigning
      const defaults: Record<string, string> = {}
      schema.forEach((ph: PlaceholderSchema) => { defaults[ph.id] = ph.defaultText || '' })
      setPlaceholderModal({ frame, eventFrameId: null, eventId, values: defaults })
    } else {
      // Assign directly
      await fetch(`${DIRECTUS_URL}/items/event_frames`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, frame_id: frame.id, is_active: true, customizations: {} }),
      })
      await loadEventFrames(eventId)
    }
  }

  function openEditPlaceholders(frame: Frame, ef: EventFrame) {
    const schema = frame.placeholder_schema || []
    const values: Record<string, string> = {}
    schema.forEach((ph: PlaceholderSchema) => {
      values[ph.id] = ef.customizations?.[ph.id] ?? ph.defaultText ?? ''
    })
    setPlaceholderModal({ frame, eventFrameId: ef.id, eventId: manageFramesEvent!.id, values })
  }

  async function savePlaceholders() {
    if (!placeholderModal) return
    setPlaceholderSaving(true)
    try {
      if (placeholderModal.eventFrameId) {
        // Update existing
        await fetch(`${DIRECTUS_URL}/items/event_frames/${placeholderModal.eventFrameId}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ customizations: placeholderModal.values }),
        })
      } else {
        // Create new assignment with customizations
        await fetch(`${DIRECTUS_URL}/items/event_frames`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: placeholderModal.eventId,
            frame_id: placeholderModal.frame.id,
            is_active: true,
            customizations: placeholderModal.values,
          }),
        })
      }
      await loadEventFrames(placeholderModal.eventId)
      setPlaceholderModal(null)
    } catch (e) { console.error(e) }
    setPlaceholderSaving(false)
  }

  const boothUrl = (slug: string) => `${APP_URL}/booth/${slug}`

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your photo booth events</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          New event
        </button>
      </div>

      {quota && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total uses', value: quota.usages_total },
            { label: 'Used', value: quota.usages_used },
            { label: 'Remaining', value: quota.usages_total - quota.usages_used },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-lg">
          <h2 className="font-medium text-gray-900 mb-4">{editingEvent ? 'Edit event' : 'New event'}</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                placeholder="e.g. Sarah & John Wedding"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                placeholder="e.g. Snap a memory with us!"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thanks message</label>
              <input value={form.thanks_message} onChange={e => setForm(f => ({ ...f, thanks_message: e.target.value }))}
                placeholder="e.g. Thank you for celebrating with us!"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={(form as any).bg_color || '#0a0a0a'}
                    onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                    className="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer p-0.5" />
                  <input value={(form as any).bg_color || '#0a0a0a'}
                    onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Accent color</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={(form as any).accent_color || '#3b82f6'}
                    onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                    className="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer p-0.5" />
                  <input value={(form as any).accent_color || '#3b82f6'}
                    onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN <span className="text-gray-400 font-normal">— leave blank for none</span></label>
              <input value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                placeholder="e.g. 1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="storage" checked={form.storage_enabled}
                onChange={e => setForm(f => ({ ...f, storage_enabled: e.target.checked }))}
                className="rounded border-gray-300" />
              <label htmlFor="storage" className="text-sm text-gray-700">Enable photo storage</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                {saving ? 'Saving...' : editingEvent ? 'Save changes' : 'Create event'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingEvent(null); setError('') }}
                className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* QR Modal */}
      {qrEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrEvent(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-900 mb-1">{qrEvent.name}</h2>
            <p className="text-sm text-gray-500 mb-4">Scan to open the photo booth</p>
            <div className="flex justify-center bg-white p-4 rounded-xl border border-gray-100">
              <QRCode value={boothUrl(qrEvent.slug)} size={200} />
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center break-all">{boothUrl(qrEvent.slug)}</p>
            {qrEvent.pin && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center">
                <p className="text-xs text-amber-600 font-medium">PIN required</p>
                <p className="text-2xl font-bold text-amber-700 tracking-widest mt-0.5">{qrEvent.pin}</p>
              </div>
            )}
            <button onClick={() => setQrEvent(null)}
              className="w-full mt-4 text-sm text-gray-600 py-2 rounded-lg hover:bg-gray-100">Close</button>
          </div>
        </div>
      )}

      {/* Placeholder fill modal */}
      {placeholderModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPlaceholderModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            {/* Frame preview + header */}
            <div className="flex gap-4 p-5 border-b border-gray-100">
              <img
                src={placeholderModal.frame.thumbnail_url || placeholderModal.frame.png_url}
                alt={placeholderModal.frame.name}
                className="w-16 rounded-xl border border-gray-100 bg-gray-50 object-cover flex-shrink-0"
                style={{ aspectRatio: '390/600' }}
              />
              <div>
                <p className="font-semibold text-gray-900">{placeholderModal.frame.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Fill in the text that will appear on the frame. Attendees will see these on their photos.
                </p>
              </div>
            </div>

            {/* Placeholder fields */}
            <div className="p-5 space-y-4">
              {placeholderModal.frame.placeholder_schema.map(ph => (
                <div key={ph.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {ph.label}
                    {ph.maxChars && (
                      <span className="text-gray-400 font-normal ml-1">— max {ph.maxChars} chars</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      value={placeholderModal.values[ph.id] ?? ''}
                      onChange={e => setPlaceholderModal(m => m ? ({
                        ...m,
                        values: { ...m.values, [ph.id]: e.target.value }
                      }) : m)}
                      placeholder={ph.defaultText || ph.label}
                      maxLength={ph.maxChars || 50}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-300">
                      {(placeholderModal.values[ph.id] ?? '').length}/{ph.maxChars || 50}
                    </span>
                  </div>
                  {/* Live preview pill */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <div
                      className="px-3 py-1 rounded-full text-xs font-medium truncate max-w-full"
                      style={{
                        background: ph.color || '#ffffff',
                        color: isLight(ph.color) ? '#1a1a1a' : '#ffffff',
                        fontFamily: ph.fontFamily || 'inherit',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      {placeholderModal.values[ph.id] || ph.defaultText || ph.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setPlaceholderModal(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button onClick={savePlaceholders} disabled={placeholderSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium">
                {placeholderSaving ? 'Saving...' : placeholderModal.eventFrameId ? 'Update' : 'Assign frame'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage frames modal */}
      {manageFramesEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setManageFramesEvent(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">Frames — "{manageFramesEvent.name}"</p>
                <p className="text-xs text-gray-400 mt-0.5">Tap to assign · tap again to remove</p>
              </div>
              <button onClick={() => setManageFramesEvent(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 p-5">
              {galleryFrames.length === 0 ? (
                <p className="text-sm text-gray-400">No gallery frames available yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {galleryFrames.map(frame => {
                    const ef = eventFrames.find(ef => ef.frame_id === frame.id)
                    const assigned = !!ef
                    const hasPlaceholders = (frame.placeholder_schema || []).length > 0

                    return (
                      <div key={frame.id}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all ${assigned ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}>

                        {/* Frame image — tap to assign/unassign */}
                        <button
                          className="w-full block"
                          onClick={() => handleFrameTap(manageFramesEvent.id, frame)}>
                          <img src={frame.thumbnail_url || frame.png_url} alt={frame.name}
                            className="w-full bg-gray-100"
                            style={{ aspectRatio: '390/600', objectFit: 'cover' }} />
                        </button>

                        {/* Assigned checkmark */}
                        {assigned && (
                          <div className="absolute top-2 right-2 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-md pointer-events-none">
                            <span className="text-white text-sm font-bold">✓</span>
                          </div>
                        )}

                        {/* Bottom info bar */}
                        <div className={`px-3 py-2 ${assigned ? 'bg-blue-600' : 'bg-black/60'}`}>
                          <p className="text-white text-xs font-medium truncate">{frame.name}</p>
                          {hasPlaceholders && (
                            <p className="text-white/70 text-xs">
                              {frame.placeholder_schema.map(ph => ph.label).join(', ')}
                            </p>
                          )}
                        </div>

                        {/* Edit text button — only when assigned and has placeholders */}
                        {assigned && hasPlaceholders && ef && (
                          <button
                            onClick={() => openEditPlaceholders(frame, ef)}
                            className="absolute bottom-10 right-2 bg-white text-blue-600 text-xs font-semibold px-2 py-1 rounded-lg shadow-md hover:bg-blue-50 transition-colors"
                          >
                            Edit text
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-blue-600">{eventFrames.length}</span> frame{eventFrames.length !== 1 ? 's' : ''} assigned
              </p>
              <button onClick={() => setManageFramesEvent(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-medium">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-sm text-gray-500">No events yet.</div>
      ) : (
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-900">{event.name}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${event.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {event.pin && (
                      <span className="font-mono font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs">
                        PIN: {event.pin}
                      </span>
                    )}
                  </div>
                  {event.tagline && <p className="text-xs text-gray-400 mt-0.5">{event.tagline}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button onClick={() => setQrEvent(event)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  QR code
                </button>
                <button onClick={async () => { setManageFramesEvent(event); await loadEventFrames(event.id) }}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  Frames
                </button>
                <button onClick={() => openEdit(event)}
                  className="bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  Edit
                </button>
                <button onClick={() => toggleActive(event)}
                  className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                  {event.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper — is a hex color light or dark?
function isLight(hex?: string): boolean {
  if (!hex) return false
  const c = hex.replace('#', '')
  if (c.length !== 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}
