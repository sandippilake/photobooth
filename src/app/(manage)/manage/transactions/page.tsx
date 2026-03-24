'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/manage/Sidebar'
import TransactionLog from '@/components/manage/TransactionLog'

export default function TransactionsPage() {
  const { user, loading: authLoading } = useSession()
  const router = useRouter()
  const [agentFilter, setAgentFilter] = useState('')
  const [agents,      setAgents]      = useState<any[]>([])

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
    if (!authLoading && user?.role === 'client') router.push('/manage/usage')
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role === 'admin')
      fetch('/api/manage/agents').then(r => r.json()).then(d => setAgents(d.data || []))
  }, [user])

  if (authLoading) return (
    <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color: 'var(--muted)' }}>Loading...</p></main></div>
  )

  const apiUrl = agentFilter
    ? '/api/manage/transactions?agent_id=' + agentFilter + '&limit=500'
    : '/api/manage/transactions?limit=500'

  return (
    <div className="mg-shell"><Sidebar />
      <main className="mg-main">
        <div className="mg-page-header">
          <div>
            <h1 className="mg-page-title">Vouchers</h1>
            <p className="mg-page-subtitle">
              {user?.role === 'admin'
                ? 'All quota vouchers issued across the platform'
                : 'Vouchers you received from admin · Vouchers you issued to clients'}
            </p>
          </div>
          {user?.role === 'admin' && agents.length > 0 && (
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="mg-input"
              style={{ width: 'auto', minWidth: 220 }}>
              <option value="">All agents</option>
              {agents.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
              ))}
            </select>
          )}
        </div>

        <TransactionLog
          key={apiUrl}
          url={apiUrl}
          title={agentFilter ? 'Filtered by agent' : 'All Vouchers'}
        />
      </main>
    </div>
  )
}
