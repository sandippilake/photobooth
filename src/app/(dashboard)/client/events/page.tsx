import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EventsClient from './EventsClient'

export default async function EventsPage() {
  const session = await getSession()
  if (!session || session.role !== 'client') redirect('/login')
  return <EventsClient token={session.token} clientId={session.id} />
}
