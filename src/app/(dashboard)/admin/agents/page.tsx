import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AgentsClient from './AgentsClient'

export default async function AgentsPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <AgentsClient token={session.token} />
}
