interface Props { used: number; total: number; label?: boolean }
export default function QuotaBar({ used, total, label = true }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const cls = pct >= 90 ? 'warn' : pct >= 70 ? 'mid' : ''
  return (
    <div className="mg-quota-bar-wrap">
      <div className="mg-quota-bar-track">
        <div className={"mg-quota-bar-fill " + cls} style={{width: pct + '%'}} />
      </div>
      {label && <span className="mg-quota-text">{used}/{total}</span>}
    </div>
  )
}
