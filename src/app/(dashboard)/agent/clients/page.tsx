import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ClientsClient from './ClientsClient'

export default async function ClientsPage() {
  const session = await getSession()
  if (!session || session.role !== 'agent') redirect('/login')
  return <ClientsClient agentId={session.id} />
}
