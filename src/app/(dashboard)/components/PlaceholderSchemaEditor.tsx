'use client'

import { useState } from 'react'

export interface PlaceholderZone {
  id: string
  label: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  maxChars: number
  defaultText: string
  align: 'left' | 'center' | 'right'
}

const FONTS = ['Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS', 'Impact']

function newZone(index: number): PlaceholderZone {
  return {
    id: Math.random().toString(36).slice(2, 8),
    label: `Text zone ${index + 1}`,
    x: 20,
    y: 20 + index * 60,
    fontSize: 20,
    fontFamily: 'Arial',
    color: '#ffffff',
    maxChars: 30,
    defaultText: '',
    align: 'center',
  }
}

interface Props {
  schema: PlaceholderZone[]
  onChange: (schema: PlaceholderZone[]) => void
  frameUrl?: string | null
}

export default function PlaceholderSchemaEditor({ schema, onChange, frameUrl }: Props) {
  const [activeId, setActiveId] = useState<string | null>(schema[0]?.id || null)

  const active = schema.find(z => z.id === activeId) || null

  function update(id: string, patch: Partial<PlaceholderZone>) {
    onChange(schema.map(z => z.id === id ? { ...z, ...patch } : z))
  }

  function add() {
    const z = newZone(schema.length)
    onChange([...schema, z])
    setActiveId(z.id)
  }

  function remove(id: string) {
    const next = schema.filter(z => z.id !== id)
    onChange(next)
    setActiveId(next[0]?.id || null)
  }

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!activeId) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 390)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 600)
    update(activeId, { x, y })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">Text zones ({schema.length})</p>
        <button onClick={add} type="button"
          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
          + Add zone
        </button>
      </div>

      {schema.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No text zones yet. Add one to place text on this frame.</p>
      )}

      <div className="flex gap-4">
        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex gap-1 flex-wrap">
            {schema.map(z => (
              <button key={z.id} type="button"
                onClick={() => setActiveId(z.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeId === z.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {z.label || 'Zone'}
              </button>
            ))}
          </div>

          {active && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Editing: {active.label}</p>
                <button type="button" onClick={() => remove(active.id)}
                  className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Label <span className="text-gray-400">(shown to client when filling in)</span></label>
                  <input value={active.label}
                    onChange={e => update(active.id, { label: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Placeholder / default text</label>
                  <input value={active.defaultText}
                    onChange={e => update(active.id, { defaultText: e.target.value })}
                    placeholder="e.g. Bride Name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max characters</label>
                  <input type="number" min={1} max={100} value={active.maxChars}
                    onChange={e => update(active.id, { maxChars: parseInt(e.target.value) || 30 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">X position <span className="text-gray-400">(0–390)</span></label>
                  <input type="number" min={0} max={390} value={active.x}
                    onChange={e => update(active.id, { x: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Y position <span className="text-gray-400">(0–600)</span></label>
                  <input type="number" min={0} max={600} value={active.y}
                    onChange={e => update(active.id, { y: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Font size (px)</label>
                  <input type="number" min={8} max={72} value={active.fontSize}
                    onChange={e => update(active.id, { fontSize: parseInt(e.target.value) || 20 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Color</label>
                  <div className="flex gap-2 items-center">
                    <input type="color" value={active.color}
                      onChange={e => update(active.id, { color: e.target.value })}
                      className="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer p-0.5 flex-shrink-0" />
                    <input value={active.color}
                      onChange={e => update(active.id, { color: e.target.value })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Font family</label>
                  <select value={active.fontFamily}
                    onChange={e => update(active.id, { fontFamily: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Alignment</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map(a => (
                      <button key={a} type="button"
                        onClick={() => update(active.id, { align: a })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${active.align === a ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>
                        {a === 'left' ? 'Left' : a === 'center' ? 'Center' : 'Right'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Preview</p>
                <p
                  style={{
                    fontFamily: active.fontFamily,
                    fontSize: `${active.fontSize}px`,
                    color: active.color,
                    textAlign: active.align,
                    background: '#374151',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    wordBreak: 'break-all',
                  }}
                >
                  {active.defaultText || active.label || 'Preview text'}
                </p>
              </div>

              <p className="text-xs text-gray-400">
                Tip: Click anywhere on the frame preview (right side) to set position visually
              </p>
            </div>
          )}
        </div>

        {frameUrl && (
          <div className="flex-shrink-0 w-32">
            <p className="text-xs text-gray-500 mb-1 text-center">Click to position</p>
            <div
              className="relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 cursor-crosshair"
              style={{ width: '128px', aspectRatio: '390/600' }}
              onClick={handlePreviewClick}
            >
              <img src={frameUrl} alt="Frame preview"
                className="w-full h-full bg-gray-100"
                style={{ objectFit: 'cover' }} />

              {schema.map(z => (
                <button
                  key={z.id}
                  type="button"
                  onClick={e => { e.stopPropagation(); setActiveId(z.id) }}
                  className="absolute"
                  style={{
                    left: `${(z.x / 390) * 100}%`,
                    top: `${(z.y / 600) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  title={z.label}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 border-white shadow-lg transition-transform ${z.id === activeId ? 'scale-150 ring-2 ring-blue-400' : 'hover:scale-125'}`}
                    style={{ background: z.color || '#ffffff' }}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              {schema.length} zone{schema.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
