import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ManageFramesClient from './ManageFramesClient'

export default async function ManageFramesPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <ManageFramesClient token={session.token ?? ''} />
}
