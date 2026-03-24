'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/manage/Sidebar'
import QuotaBar from '@/components/manage/QuotaBar'
import VoucherModal from '@/components/manage/VoucherModal'
import TransactionLog from '@/components/manage/TransactionLog'

export default function ClientDetailPage() {
  const { user, loading: authLoading } = useSession()
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agent')) router.push('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role !== 'agent') return
    fetch('/api/manage/clients/' + id).then(r => r.json()).then(d => { setData(d.data); setLoading(false) })
  }, [id, user])

  if (authLoading || loading) return <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color:'var(--muted)' }}>Loading...</p></main></div>
  if (!data) return <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color:'var(--danger)' }}>Not found.</p></main></div>

  const { client, events, recentLogs } = data
  return (
    <div className="mg-shell"><Sidebar />
      <main className="mg-main">
        <Link href="/manage/clients" className="mg-back">← All Clients</Link>
        <div className="mg-page-header">
          <div><h1 className="mg-page-title">{client.name}</h1><p className="mg-page-subtitle">{client.email}</p></div>
          <span className={"mg-badge " + (client.is_active ? 'active' : 'inactive')}>{client.is_active ? 'Active' : 'Inactive'}</span>
        </div>
        <div className="mg-stats-row">
          <div className="mg-stat-card"><div className="mg-stat-label">Allocated</div><div className="mg-stat-value">{client.quota_allocated}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Used</div><div className="mg-stat-value accent">{client.quota_used}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Remaining</div><div className="mg-stat-value success">{client.quota_allocated - client.quota_used}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Events</div><div className="mg-stat-value accent2">{events.length}</div></div>
        </div>
        <div className="mg-table-wrap">
          <div className="mg-table-head"><span className="mg-table-title">Events</span></div>
          {events.length === 0 ? <div className="mg-empty"><div className="mg-empty-icon">📅</div><p className="mg-empty-title">No events yet</p></div> : (
            <table className="mg-table">
              <thead><tr><th>Event</th><th>Status</th><th>Event Quota</th><th>Created</th></tr></thead>
              <tbody>{events.map((e:any) => (
                <tr key={e.id}>
                  <td><div style={{ fontWeight:500 }}>{e.name}</div><div style={{ fontSize:12, color:'var(--muted)' }}>{e.slug}</div></td>
                  <td><span className={"mg-badge " + (e.is_active ? 'active' : 'inactive')}>{e.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{e.quota_allocated > 0 ? <QuotaBar used={e.quota_used} total={e.quota_allocated} /> : <span style={{ color:'var(--muted)', fontSize:12 }}>Unlimited</span>}</td>
                  <td style={{ color:'var(--muted)', fontSize:12 }}>{new Date(e.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="mg-table-wrap">
          <div className="mg-table-head"><span className="mg-table-title">Recent Usage</span></div>
          {recentLogs.length === 0 ? <div className="mg-empty"><p>No usage yet</p></div> : (
            <table className="mg-table">
              <thead><tr><th>Action</th><th>Guest</th><th>Event</th><th>Time</th></tr></thead>
              <tbody>{recentLogs.map((l:any, i:number) => (
                <tr key={i}>
                  <td><span className={"mg-badge " + (l.action === 'downloaded' ? 'active' : 'agent')}>{l.action}</span></td>
                  <td style={{ color:'var(--muted)' }}>{l.guest_name || '—'}</td>
                  <td style={{ fontSize:12 }}>{l.event_name}</td>
                  <td style={{ fontSize:12, color:'var(--muted)' }}>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <TransactionLog url={'/api/manage/transactions?agent_id=' + id + '&limit=50'} title="Transactions with this client" compact={true} />
      </main>
    </div>
  )
}
