import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PackagesClient from './PackagesClient'

export default async function PackagesPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  return <PackagesClient />
}
