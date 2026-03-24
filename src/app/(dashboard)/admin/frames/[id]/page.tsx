import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import FrameEditorPage from './FrameEditorPage'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/login')
  const { id } = await params
  return <FrameEditorPage frameId={id} token={session.token} />
}
