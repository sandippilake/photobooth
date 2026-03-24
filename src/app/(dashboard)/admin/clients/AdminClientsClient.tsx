'use client'
import { useEffect, useState } from 'react'

interface Agent   { id: string; name: string }
interface Package { id: string; name: string; usages: number; albums: number; price: number; commission_pct: number }
interface Client  {
  id: string; name: string; email: string; is_active: boolean; created_at: string
  package: {
    package_name: string; usages_total: number; usages_used: number
    albums_total: number; payment_status: string; commission_amount: number
    agent_name: string | null
  } | null
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL
const empty = { name: '', email: '', password: '', package_id: '', agent_id: '', payment_status: 'pending', notes: '' }

export default function AdminClientsClient({ token }: { token: string }) {
  const [clients, setClients]   = useState<Client[]>([])
  const [agents, setAgents]     = useState<Agent[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ ...empty })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [clientsRes, agentsRes, pkgsRes] = await Promise.all([
      fetch('/api/admin/clients'),
      fetch('/api/admin/agents'),
      fetch('/api/admin/packages'),
    ])
    const [clientsData, agentsData, pkgsData] = await Promise.all([
      clientsRes.json(), agentsRes.json(), pkgsRes.json(),
    ])
    setClients(clientsData.data || [])
    setAgents(agentsData.data || [])
    setPackages((pkgsData.data || []).filter((p: any) => p.is_active))
    setLoading(false)
  }

  const selectedPkg = packages.find(p => p.id === form.package_id)
  const commission  = selectedPkg
    ? ((selectedPkg.price * selectedPkg.commission_pct) / 100)
    : 0

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setForm({ ...empty })
      load()
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function toggleActive(client: Client) {
    await fetch(`${DIRECTUS_URL}/items/users/${client.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !client.is_active }),
    })
    load()
  }

  async function markPaid(clientId: string) {
    await fetch('/api/admin/clients/' + clientId + '/payment', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'paid' }),
    })
    load()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create clients and assign packages</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          Add client
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-lg">
          <h2 className="font-medium text-gray-900 mb-4">New client</h2>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
              <select value={form.package_id} onChange={e => setForm(f => ({ ...f, package_id: e.target.value }))} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select a package</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.usages} uses, {p.albums} album{p.albums !== 1 ? 's' : ''} · ₹{Number(p.price).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>
            {selectedPkg && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                Price: ₹{Number(selectedPkg.price).toLocaleString('en-IN')} ·
                Commission: {selectedPkg.commission_pct}% = ₹{commission.toLocaleString('en-IN')}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Referring agent <span className="text-gray-400 font-normal">— optional</span>
              </label>
              <select value={form.agent_id} onChange={e => setForm(f => ({ ...f, agent_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment status</label>
              <select value={form.payment_status} onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">— optional</span></label>
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Invoice #1234"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg">
                {saving ? 'Creating...' : 'Create client'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }}
                className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100">
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Package</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Agent</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Commission</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <tr key={client.id} className={i < clients.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email}</td>
                  <td className="px-4 py-3 text-gray-600">{client.package?.package_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.package ? `${client.package.usages_used} / ${client.package.usages_total}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{client.package?.agent_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.package ? `₹${Number(client.package.commission_amount).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {client.package ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${client.package.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {client.package.payment_status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${client.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      {client.package?.payment_status === 'pending' && (
                        <button onClick={() => markPaid(client.id)}
                          className="text-xs text-green-600 hover:text-green-800 underline">
                          Mark paid
                        </button>
                      )}
                      <button onClick={() => toggleActive(client)}
                        className="text-xs text-gray-500 hover:text-gray-900 underline">
                        {client.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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
