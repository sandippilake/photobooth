'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/manage/Sidebar'
import QuotaBar from '@/components/manage/QuotaBar'

export default function ClientUsagePage() {
  const { user, loading: authLoading } = useSession()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'client')) router.push('/login')
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role==='client')
      fetch('/api/manage/client-usage').then(r=>r.json()).then(d=>{setData(d);setLoading(false)})
  }, [user])

  if (authLoading||loading) return <div className="mg-shell"><Sidebar/><main className="mg-main"><p style={{color:'var(--muted)'}}>Loading...</p></main></div>
  if (!data) return <div className="mg-shell"><Sidebar/><main className="mg-main"><p style={{color:'var(--danger)'}}>Failed to load.</p></main></div>

  const { quota, events, recentLogs } = data
  const usagesRemaining = quota.allocated_uses - quota.used_uses
  const albumsRemaining = quota.albums_allocated - quota.albums_used

  return (
    <div className="mg-shell"><Sidebar/>
      <main className="mg-main">
        <div className="mg-page-header">
          <div><h1 className="mg-page-title">My Usage</h1><p className="mg-page-subtitle">Your purchased quota and consumption</p></div>
        </div>

        {/* Quota summary */}
        <div className="mg-stats-row">
          <div className="mg-stat-card">
            <div className="mg-stat-label">Usages Purchased</div>
            <div className="mg-stat-value">{quota.allocated_uses}</div>
          </div>
          <div className="mg-stat-card">
            <div className="mg-stat-label">Usages Consumed</div>
            <div className="mg-stat-value accent">{quota.used_uses}</div>
          </div>
          <div className="mg-stat-card">
            <div className="mg-stat-label">Usages Remaining</div>
            <div className={"mg-stat-value " + (usagesRemaining < 50 ? 'danger' : 'success')}>{usagesRemaining}</div>
          </div>
          <div className="mg-stat-card">
            <div className="mg-stat-label">Albums Purchased</div>
            <div className="mg-stat-value">{quota.albums_allocated}</div>
          </div>
          <div className="mg-stat-card">
            <div className="mg-stat-label">Albums Remaining</div>
            <div className={"mg-stat-value " + (albumsRemaining === 0 ? 'danger' : 'success')}>{albumsRemaining}</div>
          </div>
        </div>

        {/* Usage bars */}
        <div className="mg-table-wrap" style={{padding:24,marginBottom:24}}>
          <div style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
              <span style={{fontWeight:600}}>Usages</span>
              <span style={{color:'var(--muted)'}}>{quota.used_uses} of {quota.allocated_uses} consumed</span>
            </div>
            <div style={{height:8,background:'rgba(255,255,255,.08)',borderRadius:100,overflow:'hidden'}}>
              <div style={{height:'100%',width:(quota.allocated_uses>0?Math.min(100,Math.round(quota.used_uses/quota.allocated_uses*100)):0)+'%',background:'var(--accent)',borderRadius:100,transition:'width .5s'}}/>
            </div>
          </div>
          <div>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
              <span style={{fontWeight:600}}>Albums</span>
              <span style={{color:'var(--muted)'}}>{quota.albums_used} of {quota.albums_allocated} consumed</span>
            </div>
            <div style={{height:8,background:'rgba(255,255,255,.08)',borderRadius:100,overflow:'hidden'}}>
              <div style={{height:'100%',width:(quota.albums_allocated>0?Math.min(100,Math.round(quota.albums_used/quota.albums_allocated*100)):0)+'%',background:'var(--success)',borderRadius:100,transition:'width .5s'}}/>
            </div>
          </div>
        </div>

        {/* Per-event breakdown */}
        <div className="mg-table-wrap" style={{marginBottom:24}}>
          <div className="mg-table-head"><span className="mg-table-title">Events</span></div>
          {events.length===0 ? <div className="mg-empty"><div className="mg-empty-icon">📅</div><p className="mg-empty-title">No events yet</p></div> : (
            <table className="mg-table">
              <thead><tr><th>Event</th><th>Status</th><th>Album</th><th>Actions</th><th>Consented Photos</th><th>Event Quota</th></tr></thead>
              <tbody>{events.map((e:any)=>(
                <tr key={e.id}>
                  <td><div style={{fontWeight:500}}>{e.name}</div><div style={{fontSize:12,color:'var(--muted)'}}>{e.slug}</div></td>
                  <td><span className={"mg-badge "+(e.is_active?'active':'inactive')}>{e.is_active?'Active':'Inactive'}</span></td>
                  <td>
                    {e.album_enabled
                      ? <span className="mg-badge active">Enabled</span>
                      : <span className="mg-badge inactive">Off</span>}
                  </td>
                  <td style={{color:'var(--accent)',fontWeight:600}}>{e.total_actions}</td>
                  <td style={{color:'var(--success)',fontWeight:600}}>{e.consented_photos}</td>
                  <td>
                    {e.quota_allocated > 0
                      ? <QuotaBar used={e.quota_used} total={e.quota_allocated}/>
                      : <span style={{fontSize:12,color:'var(--muted)'}}>Unlimited</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        {/* Recent usage log */}
        <div className="mg-table-wrap">
          <div className="mg-table-head"><span className="mg-table-title">Recent Activity (last 30)</span></div>
          {recentLogs.length===0 ? <div className="mg-empty"><p>No activity yet</p></div> : (
            <table className="mg-table">
              <thead><tr><th>Action</th><th>Consent</th><th>Guest</th><th>Event</th><th>Time</th></tr></thead>
              <tbody>{recentLogs.map((l:any,i:number)=>(
                <tr key={i}>
                  <td><span className={"mg-badge "+(l.action==='downloaded'?'active':'agent')}>{l.action}</span></td>
                  <td>
                    {l.consent
                      ? <span className="mg-badge active">✓ Given</span>
                      : <span style={{fontSize:11,color:'var(--muted)'}}>Declined</span>}
                  </td>
                  <td style={{color:'var(--muted)'}}>{l.guest_name||'—'}</td>
                  <td style={{fontSize:12}}>{l.event_name}</td>
                  <td style={{fontSize:12,color:'var(--muted)'}}>{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
