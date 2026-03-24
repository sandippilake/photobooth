import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminClientsClient from './AdminClientsClient'

export default async function AdminClientsPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <AdminClientsClient token={session.token} />
}
