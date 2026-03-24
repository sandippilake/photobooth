import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AlbumPageClient from './AlbumPageClient'

export default async function AlbumPage({ params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || session.role !== 'client') redirect('/login')
  return <AlbumPageClient eventId={params.id} />
}
