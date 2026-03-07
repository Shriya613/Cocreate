const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  generateApp: (description: string, name?: string) =>
    request<{
      app_id: string
      version_id: string
      name: string
      success: boolean
      error?: string
    }>('/generate', {
      method: 'POST',
      body: JSON.stringify({ description, name: name ?? '' }),
    }),

  listApps: () => request<import('@/types').App[]>('/apps'),

  getApp: (id: string) =>
    request<import('@/types').App & { active_code?: string }>(`/apps/${id}`),

  deleteApp: (id: string) =>
    request<{ ok: boolean }>(`/apps/${id}`, { method: 'DELETE' }),

  listVersions: (id: string) =>
    request<import('@/types').AppVersion[]>(`/apps/${id}/versions`),

  restoreVersion: (appId: string, versionId: string) =>
    request<{ ok: boolean; version_number: number }>(`/apps/${appId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ version_id: versionId }),
    }),

  getChat: (id: string) =>
    request<import('@/types').ChatMessage[]>(`/apps/${id}/chat`),

  sendMessage: (id: string, message: string) =>
    request<{
      message_id: string
      app_id: string
      version_id?: string
      version_number?: number
      success: boolean
      reply: string
    }>(`/apps/${id}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}
