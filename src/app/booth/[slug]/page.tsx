import { createDirectus, rest, staticToken, readItems } from '@directus/sdk'
import { notFound } from 'next/navigation'
import BoothPage from './BoothPage'

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

async function getAdminToken() {
  const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.DIRECTUS_ADMIN_EMAIL,
      password: process.env.DIRECTUS_ADMIN_PASSWORD,
    }),
    cache: 'no-store',
  })
  const data = await res.json()
  return data.data?.access_token
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const token = await getAdminToken()
  const client = createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest())

  const events = await client.request(readItems('events' as never, {
    filter: { slug: { _eq: slug }, is_active: { _eq: true } },
    fields: ['id', 'name', 'tagline', 'slug', 'pin', 'storage_enabled', 'client_id', 'thanks_message', 'bg_color', 'accent_color'],
    limit: 1,
  })) as any[]

  if (!events.length) notFound()
  const event = events[0]

  const eventFrames = await client.request(readItems('event_frames' as never, {
    filter: { event_id: { _eq: event.id }, is_active: { _eq: true } },
  })) as any[]

  const frameIds = eventFrames.map((ef: any) => ef.frame_id)
  let frames: any[] = []
  if (frameIds.length > 0) {
    frames = await client.request(readItems('frames' as never, {
      filter: { id: { _in: frameIds } },
      fields: ['id', 'name', 'png_url', 'thumbnail_url', 'placeholder_schema', 'crop_rect', 'image_objects'],
    })) as any[]
  }

  const framesWithCustomizations = frames.map(frame => {
    const ef = eventFrames.find((ef: any) => ef.frame_id === frame.id)
    return { ...frame, customizations: ef?.customizations || null }
  })

  return <BoothPage slug={slug} eventData={event} framesData={framesWithCustomizations} />
}
