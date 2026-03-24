'use client'

import { useEffect, useState } from 'react'

interface Agent {
  id: string
  name: string
  email: string
  is_active: boolean
  created_at: string
  quota?: {
    total_purchased: number
    total_allocated: number
    total_used: number
  }
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL

export default function AgentsClient({ token }: { token: string }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', quota: '1000' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    setLoading(true)
    try {
      const res = await fetch(`${DIRECTUS_URL}/items/users?filter[role][_eq]=agent&fields=id,name,email,is_active,created_at`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      const agentList: Agent[] = data.data || []

      const withQuotas = await Promise.all(agentList.map(async agent => {
        const qRes = await fetch(`${DIRECTUS_URL}/items/agent_quota_pools?filter[agent_id][_eq]=${agent.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const qData = await qRes.json()
        const q = qData.data?.[0]
        return { ...agent, quota: q ? { total_purchased: q.total_purchased, total_allocated: q.total_allocated, total_used: q.total_used } : undefined }
      }))

      setAgents(withQuotas)
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
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', quota: '1000' })
      loadAgents()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  async function toggleActive(agent: Agent) {
    await fetch(`${DIRECTUS_URL}/items/users/${agent.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !agent.is_active }),
    })
    loadAgents()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage reseller accounts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Add agent
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">New agent</h2>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Initial quota (uses)</label>
              <input
                type="number"
                value={form.quota}
                onChange={e => setForm(f => ({ ...f, quota: e.target.value }))}
                required
                min="0"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                {saving ? 'Creating...' : 'Create agent'}
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
      ) : agents.length === 0 ? (
        <div className="text-sm text-gray-500">No agents yet. Create one to get started.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Quota</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Used</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent, i) => (
                <tr key={agent.id} className={i < agents.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{agent.name}</td>
                  <td className="px-4 py-3 text-gray-600">{agent.email}</td>
                  <td className="px-4 py-3 text-gray-600">{agent.quota?.total_purchased ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{agent.quota?.total_used ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(agent)}
                      className="text-xs text-gray-500 hover:text-gray-900 underline"
                    >
                      {agent.is_active ? 'Deactivate' : 'Activate'}
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
