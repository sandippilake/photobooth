import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminFramesClient from './AdminFramesClient'

export default async function AdminFramesPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <AdminFramesClient token={session.token} />
}
