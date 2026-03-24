import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ClientFrameEditorPage from './ClientFrameEditorPage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'client') redirect('/login')
  const { id } = await params
  return <ClientFrameEditorPage frameId={id} token={session.token} clientId={session.id} />
}
