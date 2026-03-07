export interface App {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  has_build: boolean
  active_version: number | null
}

export interface AppVersion {
  id: string
  app_id: string
  version_number: number
  prompt: string
  created_at: string
  is_active: number
}

export interface ChatMessage {
  id: string
  app_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type GenerateStatus = 'idle' | 'generating' | 'building' | 'done' | 'error'
