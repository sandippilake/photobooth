'use client'
import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/manage/Sidebar'
import QuotaBar from '@/components/manage/QuotaBar'
import VoucherModal from '@/components/manage/VoucherModal'
import TransactionLog from '@/components/manage/TransactionLog'

interface Agent {
  id: string; name: string; email: string; is_active: number; client_count: number
  usages_purchased: number; usages_allocated: number; usages_used: number
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

function DualBar({ label, used, total, color }: { label: string; used: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>
        <span>{label}</span><span>{used}/{total}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 100, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 100, transition: 'width .3s' }} />
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const { user, loading: authLoading } = useSession()
  const router = useRouter()
  const [agents,  setAgents]  = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState<{ type: string; agent?: Agent } | null>(null)
  const [form,    setForm]    = useState({ name: '', email: '', password: '' })
  const [pw,      setPw]      = useState('')
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)
  const [pwDone,  setPwDone]  = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) router.push('/login')
  }, [user, authLoading])

  const load = async () => {
    setLoading(true)
    const d = await fetch('/api/manage/agents').then(r => r.json())
    setAgents(d.data || [])
    setLoading(false)
  }
  useEffect(() => { if (user?.role === 'admin') load() }, [user])

  const go = async (url: string, method: string, body: object) => {
    setSaving(true); setErr('')
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d   = await res.json(); setSaving(false)
    if (!res.ok) { setErr(d.error || 'Failed'); return false }
    return true
  }

  const totals = {
    usagesSold: agents.reduce((s, a) => s + a.usages_purchased, 0),
    usagesUsed: agents.reduce((s, a) => s + a.usages_used, 0),
    albumsSold: agents.reduce((s, a) => s + a.albums_purchased, 0),
    albumsUsed: agents.reduce((s, a) => s + a.albums_used, 0),
    clients:    agents.reduce((s, a) => s + Number(a.client_count), 0),
  }

  if (authLoading) return <div className="mg-shell"><Sidebar /><main className="mg-main"><p style={{ color: 'var(--muted)' }}>Loading...</p></main></div>

  return (
    <div className="mg-shell"><Sidebar />
      <main className="mg-main">

        <div className="mg-page-header">
          <div><h1 className="mg-page-title">Agents</h1><p className="mg-page-subtitle">Create agents · Issue vouchers for usages and albums</p></div>
          <button className="mg-btn mg-btn-primary" onClick={() => { setForm({ name: '', email: '', password: '' }); setErr(''); setModal({ type: 'create' }) }}>
            + New Agent
          </button>
        </div>

        {/* Platform totals */}
        <div className="mg-stats-row">
          <div className="mg-stat-card"><div className="mg-stat-label">Agents</div><div className="mg-stat-value accent">{agents.length}</div></div>
          <div className="mg-stat-card"><div className="mg-stat-label">Clients</div><div className="mg-stat-value accent2">{totals.clients}</div></div>
          <div className="mg-stat-card">
            <div className="mg-stat-label">Usages Issued</div>
            <div className="mg-stat-value">{totals.usagesSold}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{totals.usagesUsed} consumed</div>
          </div>
          <div className="mg-stat-card">
            <div className="mg-stat-label">Albums Issued</div>
            <div className="mg-stat-value success">{totals.albumsSold}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{totals.albumsUsed} consumed</div>
          </div>
        </div>

        {/* Agent table */}
        <div className="mg-table-wrap">
          <div className="mg-table-head"><span className="mg-table-title">All Agents</span></div>
          {loading ? <div className="mg-empty"><p>Loading...</p></div> : agents.length === 0 ? (
            <div className="mg-empty"><div className="mg-empty-icon">👥</div><p className="mg-empty-title">No agents yet</p></div>
          ) : (
            <table className="mg-table">
              <thead><tr><th>Agent</th><th>Status</th><th>Clients</th><th>Usages</th><th>Albums</th><th>Actions</th></tr></thead>
              <tbody>{agents.map(a => (
                <tr key={a.id}>
                  <td>
                    <Link href={"/manage/agents/" + a.id} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>{a.name}</Link>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.email}</div>
                  </td>
                  <td><span className={"mg-badge " + (a.is_active ? 'active' : 'inactive')}>{a.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ fontWeight: 600 }}>{a.client_count}</td>
                  <td style={{ minWidth: 130 }}>
                    <DualBar label="issued / consumed" used={a.usages_used} total={a.usages_purchased} color="var(--accent)" />
                    <DualBar label="issued / sold on" used={a.usages_allocated} total={a.usages_purchased} color="var(--accent2)" />
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{a.usages_purchased - a.usages_allocated} unsold</div>
                  </td>
                  <td style={{ minWidth: 130 }}>
                    <DualBar label="issued / consumed" used={a.albums_used} total={a.albums_purchased} color="var(--success)" />
                    <DualBar label="issued / sold on" used={a.albums_allocated} total={a.albums_purchased} color="#a78bfa" />
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{a.albums_purchased - a.albums_allocated} unsold</div>
                  </td>
                  <td>
                    <div className="mg-actions-cell">
                      <Link href={"/manage/agents/" + a.id} className="mg-btn mg-btn-ghost mg-btn-sm">View</Link>
                      <button className="mg-btn mg-btn-primary mg-btn-sm"
                        onClick={() => setModal({ type: 'voucher', agent: a })}>
                        + Voucher
                      </button>
                      <button className="mg-btn mg-btn-ghost mg-btn-sm"
                        onClick={() => { setPw(''); setErr(''); setPwDone(false); setModal({ type: 'reset', agent: a }) }}>
                        Reset PW
                      </button>
                      <button className={"mg-btn mg-btn-sm " + (a.is_active ? 'mg-btn-danger' : 'mg-btn-ghost')}
                        onClick={async () => { await go('/api/manage/agents/' + a.id + '/status', 'PATCH', { is_active: !a.is_active }); load() }}>
                        {a.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>

        {/* Recent platform transactions */}
        <TransactionLog url="/api/manage/transactions?limit=20" title="Recent Vouchers" />

      </main>

      {/* Create agent */}
      {modal?.type === 'create' && <Modal title="New Agent" onClose={() => setModal(null)}>
        {err && <p className="mg-error-msg">{err}</p>}
        {(['name', 'email', 'password'] as const).map(f => (
          <div className="mg-field" key={f}><label className="mg-label">{f}</label>
          <input className="mg-input" type={f === 'password' ? 'password' : 'text'}
            value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} /></div>
        ))}
        <p className="mg-hint" style={{ marginBottom: 16 }}>
          Agent starts with zero quota. Issue a voucher after creating to top up.
        </p>
        <div className="mg-modal-actions">
          <button className="mg-btn mg-btn-ghost" onClick={() => setModal(null)}>Cancel</button>
          <button className="mg-btn mg-btn-primary" disabled={saving}
            onClick={async () => {
              if (await go('/api/manage/agents', 'POST', { ...form, usages: 0, albums: 0 })) { load(); setModal(null) }
            }}>
            {saving ? 'Creating...' : 'Create Agent'}
          </button>
        </div>
      </Modal>}

      {/* Voucher modal */}
      {modal?.type === 'voucher' && modal.agent && (
        <VoucherModal
          recipientId={modal.agent.id}
          recipientName={modal.agent.name}
          recipientRole="agent"
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}

      {/* Reset password */}
      {modal?.type === 'reset' && <Modal title="Reset Password" onClose={() => setModal(null)}>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>
          For <strong style={{ color: 'var(--text)' }}>{modal.agent!.email}</strong>
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
              onClick={async () => { if (await go('/api/manage/agents/' + modal.agent!.id + '/password', 'PATCH', { password: pw })) setPwDone(true) }}>
              {saving ? 'Saving...' : 'Set Password'}
            </button>
          </div></>
        )}
      </Modal>}
    </div>
  )
}
