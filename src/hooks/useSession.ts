'use client'
import { useEffect, useState } from 'react'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'agent' | 'client'
  referring_agent_id: string | null
}

export function useSession() {
  const [user, setUser]       = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { setUser(d?.user || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return { user, loading }
}
