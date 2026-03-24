import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ClientFramesClient from './ClientFramesClient'

export default async function ClientFramesPage() {
  const session = await getSession()
  if (!session || session.role !== 'client') redirect('/login')
  return <ClientFramesClient token={session.token} clientId={session.id} />
}
