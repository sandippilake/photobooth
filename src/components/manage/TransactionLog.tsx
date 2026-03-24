'use client'
import { useEffect, useState } from 'react'

interface Tx {
  id:              string
  type:            'usages' | 'albums'
  quantity:        number
  notes:           string
  invoice_ref:     string | null
  voucher_date:    string
  created_at:      string
  from_role:       string
  to_role:         string
  from_name:       string
  to_name?:        string
  created_by_name: string
}

interface Props {
  url:       string
  title?:    string
  compact?:  boolean
}

export default function TransactionLog({ url, title = 'Voucher Log', compact = false }: Props) {
  const [txns,    setTxns]    = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then(d => { setTxns(d.data || []); setLoading(false) })
  }, [url])

  if (loading) return <div className="mg-empty"><p>Loading...</p></div>

  return (
    <div className="mg-table-wrap">
      <div className="mg-table-head">
        <span className="mg-table-title">{title}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>{txns.length} vouchers</span>
      </div>

      {txns.length === 0 ? (
        <div className="mg-empty">
          <div className="mg-empty-icon">📋</div>
          <p className="mg-empty-title">No vouchers yet</p>
          <p>Vouchers are created when quota is issued</p>
        </div>
      ) : (
        <table className="mg-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Ref</th>
              <th>Type</th>
              <th>Qty</th>
              {!compact && <th>From</th>}
              {!compact && <th>To</th>}
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {txns.map(tx => (
              <tr key={tx.id}>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                  <div>{tx.voucher_date ? new Date(tx.voucher_date).toLocaleDateString() : '—'}</div>
                  <div style={{ fontSize: 10, marginTop: 2 }}>
                    logged {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'monospace' }}>
                  {tx.invoice_ref || <span style={{ color: 'var(--muted)' }}>—</span>}
                </td>
                <td>
                  <span className={"mg-badge " + (tx.type === 'usages' ? 'agent' : 'active')}>
                    {tx.type === 'usages' ? '📸 usages' : '📖 albums'}
                  </span>
                </td>
                <td>
                  <span style={{
                    fontWeight: 700, fontSize: 15,
                    color: tx.quantity > 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                  </span>
                </td>
                {!compact && (
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 500 }}>{tx.from_name}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{tx.from_role}</div>
                  </td>
                )}
                {!compact && (
                  <td style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 500 }}>{tx.to_name || '—'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{tx.to_role}</div>
                  </td>
                )}
                <td style={{ fontSize: 13, maxWidth: 260 }}>{tx.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
