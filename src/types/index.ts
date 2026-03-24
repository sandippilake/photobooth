export type UserRole = 'admin' | 'agent' | 'client'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: UserRole
  agent_id: string | null
  token: string
}
