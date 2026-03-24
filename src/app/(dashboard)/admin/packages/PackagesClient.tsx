'use client'
import { useEffect, useState } from 'react'

interface Package {
  id: string
  name: string
  description: string | null
  usages: number
  albums: number
  price: number
  commission_pct: number
  is_active: boolean
}

const empty = { name: '', description: '', usages: '50', albums: '0', price: '', commission_pct: '20' }

export default function PackagesClient() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Package | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/packages')
    const data = await res.json()
    setPackages(data.data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm(empty)
    setError('')
    setShowForm(true)
  }

  function openEdit(pkg: Package) {
    setEditing(pkg)
    setForm({
      name: pkg.name,
      description: pkg.description || '',
      usages: String(pkg.usages),
      albums: String(pkg.albums),
      price: String(pkg.price),
      commission_pct: String(pkg.commission_pct),
    })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = {
      name: form.name,
      description: form.description || null,
      usages: parseInt(form.usages),
      albums: parseInt(form.albums),
      price: parseFloat(form.price),
      commission_pct: parseFloat(form.commission_pct),
      is_active: true,
    }
    try {
      const url = editing ? `/api/admin/packages/${editing.id}` : '/api/admin/packages'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  async function toggleActive(pkg: Package) {
    await fetch(`/api/admin/packages/${pkg.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...pkg, is_active: !pkg.is_active }),
    })
    load()
  }

  async function handleDelete(pkg: Package) {
    if (!confirm(`Delete package "${pkg.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/packages/${pkg.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { alert(data.error); return }
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Packages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define plans available for clients</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          New package
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-lg">
          <h2 className="font-medium text-gray-900 mb-4">{editing ? 'Edit package' : 'New package'}</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                placeholder="e.g. Wedding Pro"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description for agents"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo usages</label>
                <input type="number" min="0" value={form.usages} onChange={e => setForm(f => ({ ...f, usages: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Albums included</label>
                <input type="number" min="0" value={form.albums} onChange={e => setForm(f => ({ ...f, albums: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required
                  placeholder="6999"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
                <input type="number" min="0" max="100" step="0.01" value={form.commission_pct} onChange={e => setForm(f => ({ ...f, commission_pct: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Create package'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); setError('') }}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : packages.length === 0 ? (
        <div className="text-sm text-gray-500">No packages yet.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usages</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Albums</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Price</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Commission</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, i) => (
                <tr key={pkg.id} className={i < packages.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{pkg.name}</p>
                    {pkg.description && <p className="text-xs text-gray-400 mt-0.5">{pkg.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{pkg.usages.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-600">{pkg.albums}</td>
                  <td className="px-4 py-3 text-gray-600">₹{Number(pkg.price).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-600">{pkg.commission_pct}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(pkg)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline">Edit</button>
                      <button onClick={() => toggleActive(pkg)}
                        className="text-xs text-gray-500 hover:text-gray-900 underline">
                        {pkg.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(pkg)}
                        className="text-xs text-red-500 hover:text-red-700 underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
