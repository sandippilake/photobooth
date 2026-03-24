'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'

const ADMIN_NAV = [
  { href:'/manage/agents',       label:'Agents',       icon:'👥' },
  { href:'/manage/transactions', label:'Transactions', icon:'📋' },
  { href:'/manage/frames',        label:'Frames',        icon:'🖼️' },
  { href:'/manage/frame-converter', label:'Frame Converter', icon:'✨' },
]
const AGENT_NAV = [
  { href:'/manage/clients',      label:'Clients',      icon:'🏢' },
  { href:'/manage/quota',        label:'My Quota',     icon:'📊' },
  { href:'/manage/transactions', label:'Transactions', icon:'📋' },
]
const CLIENT_NAV = [
  { href:'/client/events',  label:'Events',   icon:'📅' },
  { href:'/client/frames',  label:'Frames',   icon:'🖼️' },
  { href:'/manage/usage',   label:'My Usage', icon:'📈' },
]

export default function Sidebar() {
  const { user } = useSession()
  const pathname = usePathname()
  const router   = useRouter()
  const role = user?.role ?? ''
  const name = user?.name || user?.email || '?'
  const nav  = role==='admin' ? ADMIN_NAV : role==='agent' ? AGENT_NAV : CLIENT_NAV

  const signOut = async () => {
    await fetch('/api/auth/logout', { method:'POST' })
    router.push('/login')
  }

  return (
    <aside className="mg-sidebar">
      <div className="mg-logo">Photo<span>Booth</span></div>
      <p className="mg-nav-label">Management</p>
      {nav.map(i => (
        <Link key={i.href} href={i.href}
          className={"mg-nav-link"+(pathname.startsWith(i.href)?' active':'')}>
          <span>{i.icon}</span>{i.label}
        </Link>
      ))}
      <div className="mg-sidebar-footer">
        <div className="mg-user-pill">
          <div className="mg-user-avatar">{name[0].toUpperCase()}</div>
          <div>
            <div className="mg-user-name">{name.split('@')[0]}</div>
            <div className="mg-user-role">{role}</div>
          </div>
        </div>
        <button onClick={signOut} style={{marginTop:10,width:'100%'}} className="mg-btn mg-btn-ghost mg-btn-sm">
          Sign out
        </button>
      </div>
    </aside>
  )
}
