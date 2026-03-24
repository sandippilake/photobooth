'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/manage/Sidebar'
import QuotaBar from '@/components/manage/QuotaBar'
import VoucherModal from '@/components/manage/VoucherModal'
import TransactionLog from '@/components/manage/TransactionLog'

export default function AgentDetailPage() {
  const { user, loading: authLoading } = useSession()
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [data, setData]     = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role !== 'admin') return
    fetch('/api/manage/agents/' + id).then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
  }, [id, user])

  if (authLoading || loading) return <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color:'var(--muted)' }}>Loading...</p></main></div>
  if (!data) return <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color:'var(--danger)' }}>Not found.</p></main></div>

  const { agent, clients } = data
  return (
    <div className="mg-shell"><Sidebar />
      <main className="mg-main">
        <Link href="/manage/agents" className="mg-back">← All Agents</Link>
        <div className="mg-page-header">
          <div><h1 className="mg-page-title">{agent.name}</h1><p className="mg-page-subtitle">{agent.email}</p></div>
          <span className={"mg-badge " + (agent.is_active ? 'active' : 'inactive')}>{agent.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="mg-stats-row">
          <div className="mg-stat-card"><div className="mg-stat-label">Total Quota</div><div className="mg-stat-value">{agent.quota_total}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Allocated</div><div className="mg-stat-value accent">{agent.quota_allocated}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Used</div><div className="mg-stat-value success">{agent.quota_used}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Available</div><div className="mg-stat-value accent2">{agent.quota_total - agent.quota_allocated}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Clients</div><div className="mg-stat-value">{clients.length}</div></div>
        </div>
        <div className="mg-table-wrap">
          <div className="mg-table-head"><span className="mg-table-title">Clients</span></div>
          {clients.length === 0 ? <div className="mg-empty"><div className="mg-empty-icon">🏢</div><p className="mg-empty-title">No clients yet</p></div> : (
            <table className="mg-table">
              <thead><tr><th>Client</th><th>Status</th><th>Quota</th><th>Joined</th></tr></thead>
              <tbody>{clients.map((c:any) => (
                <tr key={c.id}>
                  <td><div style={{ fontWeight:500 }}>{c.name}</div><div style={{ fontSize:12, color:'var(--muted)' }}>{c.email}</div></td>
                  <td><span className={"mg-badge " + (c.is_active ? 'active' : 'inactive')}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td><QuotaBar used={c.quota_used} total={c.quota_allocated} /></td>
                  <td style={{ color:'var(--muted)', fontSize:12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <TransactionLog url={'/api/manage/transactions?agent_id=' + id + '&limit=50'} title="Transactions with this agent" compact={false} />
      </main>
    </div>
  )
}
