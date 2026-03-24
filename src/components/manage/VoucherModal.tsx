'use client'
import { useState } from 'react'

interface Props {
  recipientId:   string
  recipientName: string
  recipientRole: 'agent' | 'client'
  /** For agents: show remaining pool amounts */
  poolUsages?:   number
  poolAlbums?:   number
  onClose:  () => void
  onSaved:  () => void
}

export default function VoucherModal({
  recipientId, recipientName, recipientRole,
  poolUsages, poolAlbums,
  onClose, onSaved,
}: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [usages,  setUsages]  = useState('0')
  const [albums,  setAlbums]  = useState('0')
  const [ref,     setRef]     = useState('')
  const [date,    setDate]    = useState(today)
  const [notes,   setNotes]   = useState('')
  const [err,     setErr]     = useState('')
  const [saving,  setSaving]  = useState(false)

  const submit = async () => {
    setErr('')
    if (!notes.trim()) { setErr('Notes are required'); return }
    if (Number(usages) <= 0 && Number(albums) <= 0) {
      setErr('At least one of usages or albums must be greater than 0'); return
    }
    setSaving(true)
    const res = await fetch('/api/manage/vouchers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_id:        recipientId,
        usages:       Number(usages),
        albums:       Number(albums),
        invoice_ref:  ref,
        voucher_date: date,
        notes,
      }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setErr(d.error || 'Failed'); return }
    onSaved()
    onClose()
  }

  return (
    <div className="mg-modal-overlay" onClick={onClose}>
      <div className="mg-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>

        <p className="mg-modal-title">New Voucher</p>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: -16, marginBottom: 20 }}>
          Issuing to <strong style={{ color: 'var(--text)' }}>{recipientName}</strong>
          {' '}({recipientRole})
        </p>

        {/* Pool availability hint for agents */}
        {(poolUsages !== undefined || poolAlbums !== undefined) && (
          <div style={{
            background: 'rgba(240,192,96,.08)', border: '1px solid rgba(240,192,96,.2)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 18,
            fontSize: 13, color: 'var(--accent)',
          }}>
            Your pool: <strong>{poolUsages ?? '—'}</strong> usages available
            · <strong>{poolAlbums ?? '—'}</strong> albums available
          </div>
        )}

        {err && <p className="mg-error-msg">{err}</p>}

        {/* Date + Invoice ref */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="mg-field">
            <label className="mg-label">Voucher Date</label>
            <input className="mg-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="mg-field">
            <label className="mg-label">Invoice / Ref # <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(optional)</span></label>
            <input className="mg-input" type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="e.g. INV-2024-001" />
          </div>
        </div>

        {/* Quantities */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="mg-field">
            <label className="mg-label">📸 Usages</label>
            <input className="mg-input" type="number" min="0" value={usages} onChange={e => setUsages(e.target.value)} />
            <p className="mg-hint">Photo save / share / download credits</p>
          </div>
          <div className="mg-field">
            <label className="mg-label">📖 Albums</label>
            <input className="mg-input" type="number" min="0" value={albums} onChange={e => setAlbums(e.target.value)} />
            <p className="mg-hint">PDF + flipbook generation credits</p>
          </div>
        </div>

        {/* Notes — required */}
        <div className="mg-field">
          <label className="mg-label">Notes <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea
            className="mg-input"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Paid ₹5000 cash on 12 Mar · Wedding season package · Top-up per agreement"
            style={{ resize: 'vertical', minHeight: 70 }}
          />
        </div>

        <div className="mg-modal-actions">
          <button className="mg-btn mg-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="mg-btn mg-btn-primary" disabled={saving} onClick={submit}>
            {saving ? 'Issuing...' : 'Issue Voucher'}
          </button>
        </div>
      </div>
    </div>
  )
}
