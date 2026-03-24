import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null }, { status: 401 })
  return NextResponse.json({
    user: {
      id:                 session.id,
      email:              session.email,
      name:               session.name,
      role:               session.role,
      referring_agent_id: session.referring_agent_id ?? null,
    }
  })
}
