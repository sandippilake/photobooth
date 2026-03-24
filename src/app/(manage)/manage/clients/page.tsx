'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/manage/Sidebar'
import QuotaBar from '@/components/manage/QuotaBar'
import VoucherModal from '@/components/manage/VoucherModal'

interface Client {
  id: string; name: string; email: string; is_active: number; event_count: number
  usages_allocated: number; usages_used: number
  albums_allocated: number; albums_used: number
}
interface Pool {
  total_purchased: number; total_allocated: number; total_used: number
  albums_purchased: number; albums_allocated: number; albums_used: number
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="mg-modal-overlay" onClick={onClose}>
      <div className="mg-modal" onClick={e => e.stopPropagation()}>
        <p className="mg-modal-title">{title}</p>{children}
      </div>
    </div>
  )
}

export default function ClientsPage() {
  const { user, loading: authLoading } = useSession()
  const router  = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [pool,    setPool]    = useState<Pool | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<{ type: string; client?: Client } | null>(null)
  const [form,    setForm]    = useState({ name: '', email: '', password: '' })
  const [pw,      setPw]      = useState('')
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)
  const [pwDone,  setPwDone]  = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agent')) router.push('/login')
  }, [user, authLoading])

  const load = async () => {
    setLoading(true)
    const d = await fetch('/api/manage/clients').then(r => r.json())
    setClients(d.data || []); setPool(d.quota_pool || null); setLoading(false)
  }
  useEffect(() => { if (user?.role === 'agent') load() }, [user])

  const usagesAvail = pool ? pool.total_purchased  - pool.total_allocated  : 0
  const albumsAvail = pool ? pool.albums_purchased - pool.albums_allocated : 0

  const go = async (url: string, method: string, body: object) => {
    setSaving(true); setErr('')
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d   = await res.json(); setSaving(false)
    if (!res.ok) { setErr(d.error || 'Failed'); return false }
    return true
  }

  if (authLoading) return <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color: 'var(--muted)' }}>Loading...</p></main></div>

  return (
    <div className="mg-shell"><Sidebar />
      <main className="mg-main">

        <div className="mg-page-header">
          <div><h1 className="mg-page-title">Clients</h1><p className="mg-page-subtitle">Create clients · Issue vouchers from your pool</p></div>
          <button className="mg-btn mg-btn-primary"
            onClick={() => { setForm({ name: '', email: '', password: '' }); setErr(''); setModal({ type: 'create' }) }}>
            + New Client
          </button>
        </div>

        {/* My pool */}
        {pool && (
          <div className="mg-stats-row">
            <div className="mg-stat-card">
              <div className="mg-stat-label">Usages Pool</div>
              <div className="mg-stat-value">{pool.total_purchased}</div>
              <QuotaBar used={pool.total_used} total={pool.total_purchased} label={false} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{usagesAvail} available to sell</div>
            </div>
            <div className="mg-stat-card">
              <div className="mg-stat-label">Albums Pool</div>
              <div className="mg-stat-value success">{pool.albums_purchased}</div>
              <QuotaBar used={pool.albums_used} total={pool.albums_purchased} label={false} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{albumsAvail} available to sell</div>
            </div>
            <div className="mg-stat-card"><div className="mg-stat-label">Usages Sold</div><div className="mg-stat-value accent">{pool.total_allocated}</div></div>
            <div className="mg-stat-card"><div className="mg-stat-label">Albums Sold</div><div className="mg-stat-value accent2">{pool.albums_allocated}</div></div>
            <div className="mg-stat-card"><div className="mg-stat-label">Clients</div><div className="mg-stat-value">{clients.length}</div></div>
          </div>
        )}

        {/* Clients table */}
        <div className="mg-table-wrap">
          <div className="mg-table-head"><span className="mg-table-title">All Clients</span></div>
          {loading ? <div className="mg-empty"><p>Loading...</p></div> : clients.length === 0 ? (
            <div className="mg-empty"><div className="mg-empty-icon">🏢</div><p className="mg-empty-title">No clients yet</p></div>
          ) : (
            <table className="mg-table">
              <thead><tr><th>Client</th><th>Status</th><th>Events</th><th>Usages</th><th>Albums</th><th>Actions</th></tr></thead>
              <tbody>{clients.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link href={"/manage/clients/" + c.id} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>{c.name}</Link>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.email}</div>
                  </td>
                  <td><span className={"mg-badge " + (c.is_active ? 'active' : 'inactive')}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontWeight: 600 }}>{c.event_count}</td>
                  <td>
                    <QuotaBar used={c.usages_used} total={c.usages_allocated} />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{c.usages_allocated - c.usages_used} remaining</div>
                  </td>
                  <td>
                    <QuotaBar used={c.albums_used} total={c.albums_allocated} />
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{c.albums_allocated - c.albums_used} remaining</div>
                  </td>
                  <td>
                    <div className="mg-actions-cell">
                      <Link href={"/manage/clients/" + c.id} className="mg-btn mg-btn-ghost mg-btn-sm">View</Link>
                      <button className="mg-btn mg-btn-primary mg-btn-sm"
                        onClick={() => setModal({ type: 'voucher', client: c })}>
                        + Voucher
                      </button>
                      <button className="mg-btn mg-btn-ghost mg-btn-sm"
                        onClick={() => { setPw(''); setErr(''); setPwDone(false); setModal({ type: 'reset', client: c }) }}>
                        Reset PW
                      </button>
                      <button className={"mg-btn mg-btn-sm " + (c.is_active ? 'mg-btn-danger' : 'mg-btn-ghost')}
                        onClick={async () => { await go('/api/manage/clients/' + c.id + '/status', 'PATCH', { is_active: !c.is_active }); load() }}>
                        {c.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </main>

      {/* Create client */}
      {modal?.type === 'create' && <Modal title="New Client" onClose={() => setModal(null)}>
        {err && <p className="mg-error-msg">{err}</p>}
        {(['name', 'email', 'password'] as const).map(f => (
          <div className="mg-field" key={f}><label className="mg-label">{f}</label>
          <input className="mg-input" type={f === 'password' ? 'password' : 'text'}
            value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} /></div>
        ))}
        <p className="mg-hint" style={{ marginBottom: 16 }}>
          Client starts with zero quota. Issue a voucher after creating to allocate credits.
        </p>
        <div className="mg-modal-actions">
          <button className="mg-btn mg-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
          <button className="mg-btn mg-btn-primary" disabled={saving}
            onClick={async () => {
              if (await go('/api/manage/clients', 'POST', { ...form, usages: 0, albums: 0 })) { load(); setModal(null) }
            }}>
            {saving ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      </Modal>}

      {/* Voucher modal */}
      {modal?.type === 'voucher' && modal.client && (
        <VoucherModal
          recipientId={modal.client.id}
          recipientName={modal.client.name}
          recipientRole="client"
          poolUsages={usagesAvail}
          poolAlbums={albumsAvail}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {/* Reset password */}
      {modal?.type === 'reset' && <Modal title="Reset Password" onClose={() => setModal(null)}>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          For <strong style={{ color: 'var(--text)' }}>{modal.client!.email}</strong>
        </p>
        {pwDone ? (
          <><p style={{ color: 'var(--success)', marginBottom: 20 }}>Password updated. Share manually.</p>
          <div className="mg-modal-actions"><button className="mg-btn mg-btn-primary" onClick={() => setModal(null)}>Done</button></div></>
        ) : (
          <>{err && <p className="mg-error-msg">{err}</p>}
          <div className="mg-field"><label className="mg-label">New Password</label>
          <input className="mg-input" type="text" value={pw} onChange={e => setPw(e.target.value)} placeholder="min 6 chars" /></div>
          <div className="mg-modal-actions">
            <button className="mg-btn mg-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="mg-btn mg-btn-primary" disabled={saving}
              onClick={async () => { if (await go('/api/manage/clients/' + modal.client!.id + '/password', 'PATCH', { password: pw })) setPwDone(true) }}>
              {saving ? 'Saving...' : 'Set Password'}
            </button>
          </div></>
        )}
      </Modal>}
    </div>
  )
}
