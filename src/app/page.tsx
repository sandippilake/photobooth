import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function Home() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin/agents')
  if (session.role === 'agent') redirect('/agent/clients')
  if (session.role === 'client') redirect('/client/events')
  redirect('/login')
}
