import { createDirectus, rest, authentication, staticToken } from '@directus/sdk'

export type UserRole = 'admin' | 'agent' | 'client'

export interface DirectusUser {
  id: string
  email: string
  name: string
  role: UserRole
  referring_agent_id: string | null
  is_active: boolean
  created_at: string
}

export interface Frame {
  id: string
  name: string
  type: 'gallery' | 'custom'
  placeholder_schema: PlaceholderSchema[] | null
  png_url: string | null
  thumbnail_url: string | null
  is_global: boolean
  created_by: string | null
  created_at: string
}

export interface PlaceholderSchema {
  id: string
  label: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  maxChars: number
  defaultText: string
  align: 'left' | 'center' | 'right'
}

export interface Event {
  id: string
  client_id: string
  name: string
  description: string | null
  tagline: string | null
  slug: string
  is_active: boolean
  storage_enabled: boolean
  created_at: string
}

export interface EventFrame {
  id: string
  event_id: string
  frame_id: string
  customizations: Record<string, string> | null
  is_active: boolean
  created_at: string
}

export interface UsageLog {
  id: string
  event_id: string
  client_id: string
  action: 'downloaded' | 'shared'
  ip_hash: string | null
  created_at: string
}

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL!

export const directus = createDirectus(DIRECTUS_URL).with(rest())

export const getDirectusClient = (token: string) =>
  createDirectus(DIRECTUS_URL).with(staticToken(token)).with(rest())

export const authClient = createDirectus(DIRECTUS_URL).with(authentication()).with(rest())
