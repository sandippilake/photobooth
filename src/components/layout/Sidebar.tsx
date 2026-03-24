'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserRole } from '@/types'

const NAV_ITEMS: Record<UserRole, { label: string; href: string }[]> = {
  admin: [
    { label: 'Agents',   href: '/admin/agents' },
    { label: 'Clients',  href: '/admin/clients' },
    { label: 'Packages', href: '/admin/packages' },
    { label: 'Frames',   href: '/admin/frames' },
  ],
  agent: [
    { label: 'Clients', href: '/agent/clients' },
  ],
  client: [
    { label: 'Events', href: '/client/events' },
    { label: 'Frames', href: '/client/frames' },
  ],
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Platform Admin',
  agent: 'Agent',
  client: 'Client',
}

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  agent: 'bg-teal-100 text-teal-700',
  client: 'bg-blue-100 text-blue-700',
}

export default function Sidebar({ role, name, email }: { role: UserRole; name: string; email: string }) {
  const pathname = usePathname()
  const items = NAV_ITEMS[role]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h1 className="font-semibold text-gray-900">PhotoBooth</h1>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block', ROLE_COLORS[role])}>
          {ROLE_LABELS[role]}
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(item => (
          <Link key={item.href} href={item.href}
            className={cn(
              'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
        <button onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  )
}
