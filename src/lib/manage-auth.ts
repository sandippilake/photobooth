import { getSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export type Role = 'admin' | 'agent' | 'client'

export async function requireRole(...roles: Role[]) {
  const session = await getSession()
  if (!session)
    return { error: NextResponse.json({ error: 'Unauthenticated' }, { status: 401 }), session: null }
  if (!roles.includes(session.role as Role))
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null }
  return { error: null, session }
}
