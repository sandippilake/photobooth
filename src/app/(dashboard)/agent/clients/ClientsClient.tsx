'use client'
import { useEffect, useState } from 'react'

interface Client {
  id: string
  name: string
  email: string
  is_active: boolean
  created_at: string
  package: {
    package_name: string
    usages_total: number
    usages_used: number
    albums_total: number
    albums_used: number
    payment_status: string
    commission_amount: number
  } | null
}

export default function ClientsClient({ agentId }: { agentId: string }) {
  const [clients, setClients]   = useState<Client[]>([])
  const [loading, setLoading]   = useState(true)
  const [totalCommission, setTotalCommission] = useState(0)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res  = await fetch('/api/agent/clients')
    const data = await res.json()
    const list = data.data || []
    setClients(list)
    setTotalCommission(
      list.reduce((sum: number, c: Client) =>
        sum + (c.package?.commission_amount || 0), 0)
    )
    setLoading(false)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">My Clients</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clients referred by you</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total clients</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{clients.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Active clients</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">
            {clients.filter(c => c.is_active).length}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total commission</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">
            ₹{totalCommission.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">No clients referred yet.</p>
          <p className="text-xs text-gray-400 mt-1">Contact admin to have clients assigned to you.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Package</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usage</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Payment</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Commission</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, i) => (
                <tr key={client.id} className={i < clients.length - 1 ? 'border-b border-gray-100' : ''}>
                  <td className="px-4 py-3 font-medium text-gray-900">{client.name}</td>
                  <td className="px-4 py-3 text-gray-600">{client.email}</td>
                  <td className="px-4 py-3 text-gray-600">{client.package?.package_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.package
                      ? `${client.package.usages_used} / ${client.package.usages_total}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {client.package ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                        ${client.package.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'}`}>
                        {client.package.payment_status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {client.package
                      ? `₹${Number(client.package.commission_amount).toLocaleString('en-IN')}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${client.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'}`}>
                      {client.is_active ? 'Active' : 'Inactive'}
                    </span>
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
