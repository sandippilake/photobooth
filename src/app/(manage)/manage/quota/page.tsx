'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/manage/Sidebar'
import QuotaBar from '@/components/manage/QuotaBar'

function PoolBar({ label, used, total, color }: { label:string; used:number; total:number; color:string }) {
  const pct = total > 0 ? Math.min(100, Math.round(used/total*100)) : 0
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14}}>{label}</span>
        <span style={{fontSize:13,color:'var(--muted)'}}>{used} / {total} ({pct}%)</span>
      </div>
      <div style={{height:10,background:'rgba(255,255,255,.08)',borderRadius:100,overflow:'hidden'}}>
        <div style={{height:'100%',width:pct+'%',background:color,borderRadius:100,transition:'width .5s'}}/>
      </div>
    </div>
  )
}

export default function AgentQuotaPage() {
  const { user, loading: authLoading } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agent')) router.push('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role==='agent')
      fetch('/api/manage/clients').then(r=>r.json()).then(setData)
  }, [user])

  if (authLoading||!data) return <div className="mg-shell"><Sidebar/><main className="mg-main"><p style={{color:'var(--muted)'}}>Loading...</p></main></div>

  const pool    = data.quota_pool
  const clients = data.data || []
  const usagesAvail = pool ? pool.total_purchased - pool.total_allocated : 0
  const albumsAvail = pool ? pool.albums_purchased - pool.albums_allocated : 0

  return (
    <div className="mg-shell"><Sidebar/>
      <main className="mg-main">
        <div className="mg-page-header"><div><h1 className="mg-page-title">My Quota</h1><p className="mg-page-subtitle">What you bought from admin · What you sold to clients</p></div></div>

        {pool ? <>
          {/* Pool stats */}
          <div className="mg-stats-row">
            <div className="mg-stat-card">
              <div className="mg-stat-label">Usages Purchased</div>
              <div className="mg-stat-value">{pool.total_purchased}</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Usages Sold</div>
              <div className="mg-stat-value accent">{pool.total_allocated}</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Usages Available</div>
              <div className="mg-stat-value success">{usagesAvail}</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Usages Consumed</div>
              <div className="mg-stat-value accent2">{pool.total_used}</div>
            </div>
          </div>
          <div className="mg-stats-row">
            <div className="mg-stat-card">
              <div className="mg-stat-label">Albums Purchased</div>
              <div className="mg-stat-value">{pool.albums_purchased}</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Albums Sold</div>
              <div className="mg-stat-value accent">{pool.albums_allocated}</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Albums Available</div>
              <div className="mg-stat-value success">{albumsAvail}</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Albums Consumed</div>
              <div className="mg-stat-value accent2">{pool.albums_used}</div>
            </div>
          </div>

          {/* Pool bars */}
          <div className="mg-table-wrap" style={{padding:24,marginBottom:24,display:'flex',flexDirection:'column',gap:20}}>
            <PoolBar label="Usages" used={pool.total_used} total={pool.total_purchased} color="var(--accent)" />
            <PoolBar label="Albums" used={pool.albums_used} total={pool.albums_purchased} color="var(--success)" />
          </div>

          {/* Per-client breakdown */}
          <div className="mg-table-wrap">
            <div className="mg-table-head"><span className="mg-table-title">Per-client breakdown</span></div>
            {clients.length===0 ? <div className="mg-empty"><p>No clients yet</p></div> : (
              <table className="mg-table">
                <thead><tr><th>Client</th><th>Usages sold</th><th>Usages used</th><th>Albums sold</th><th>Albums used</th></tr></thead>
                <tbody>{clients.map((c:any)=>(
                  <tr key={c.id}>
                    <td><div style={{fontWeight:500}}>{c.name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{c.email}</div></td>
                    <td><QuotaBar used={c.usages_used} total={c.usages_allocated}/><span style={{fontSize:11,color:'var(--muted)'}}>{c.usages_allocated-c.usages_used} remaining</span></td>
                    <td style={{color:'var(--accent)',fontWeight:600}}>{c.usages_used}</td>
                    <td><QuotaBar used={c.albums_used} total={c.albums_allocated}/><span style={{fontSize:11,color:'var(--muted)'}}>{c.albums_allocated-c.albums_used} remaining</span></td>
                    <td style={{color:'var(--success)',fontWeight:600}}>{c.albums_used}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </> : <div className="mg-empty"><div className="mg-empty-icon">📊</div><p className="mg-empty-title">No quota pool</p><p>Contact your admin to purchase usages and albums</p></div>}
      </main>
    </div>
  )
}
