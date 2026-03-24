'use client'

import { useEffect, useState } from 'react'

interface Client {
  id: string
  name: string
  email: string
  is_active: boolean
  created_at: string
  quota?: {
    id: string
    allocated_uses: number
    used_uses: number
    valid_until: string | null
  }
}

interface Pool {
  total_purchased: number
  total_allocated: number
  total_used: number
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function ClientsClient({ token, agentId }: { token: string; agentId: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [pool, setPool] = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', quota: '500' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [clientsRes, poolRes] = await Promise.all([
        fetch(`${DIRECTUS_URL}/items/users?filter[role][_eq]=client&filter[agent_id][_eq]=${agentId}&fields=id,name,email,is_active,created_at`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${DIRECTUS_URL}/items/agent_quota_pools?filter[agent_id][_eq]=${agentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      const clientsData = await clientsRes.json()
      const poolData = await poolRes.json()
      const clientList: Client[] = clientsData.data || []
      setPool(poolData.data?.[0] || null)

      const withQuotas = await Promise.all(clientList.map(async client => {
        const qRes = await fetch(`${DIRECTUS_URL}/items/client_quota_allocations?filter[client_id][_eq]=${client.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const qData = await qRes.json()
        return { ...client, quota: qData.data?.[0] }
      }))

      setClients(withQuotas)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/agent/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, agentId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', quota: '500' })
      loadData()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  async function toggleActive(client: Client) {
    await fetch(`${DIRECTUS_URL}/items/users/${client.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !client.is_active }),
    })
    loadData()
  }

  const available = pool ? pool.total_purchased - pool.total_allocated : 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your client accounts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add client
        </button>
      </div>

      {pool && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total purchased', value: pool.total_purchased },
            { label: 'Allocated to clients', value: pool.total_allocated },
            { label: 'Available to allocate', value: available },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">{stat.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">New client</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quota to allocate (uses)
                <span className="text-gray-400 font-normal ml-1">— {available} available</span>
              </label>
              <input
                type="number"
                value={form.quota}
                onChange={e => setForm(f => ({ ...f, quota: e.target.value }))}
                required
                min="1"
                max={available}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {saving ? 'Creating...' : 'Create client'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="text-sm text-gray-500">No clients yet.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Allocated</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <tr key={client.id} className={i < clients.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email}</td>
                  <td className="px-4 py-3 text-gray-600">{client.quota?.allocated_uses ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{client.quota?.used_uses ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{client.quota?.valid_until ? new Date(client.quota.valid_until).toLocaleDateString() : 'No expiry'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(client)}
                      className="text-xs text-gray-500 hover:text-gray-900 underline"
                    >
                      {client.is_active ? 'Deactivate' : 'Activate'}
                    </button>
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
