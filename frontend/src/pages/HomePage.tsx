import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, Wand2, Trash2, ExternalLink, Clock, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import type { App, GenerateStatus } from '@/types'

export default function HomePage() {
  const [apps, setApps] = useState<App[]>([])
  const [description, setDescription] = useState('')
  const [appName, setAppName] = useState('')
  const [status, setStatus] = useState<GenerateStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    loadApps()
  }, [])

  async function loadApps() {
    try {
      const data = await api.listApps()
      setApps(data)
    } catch {
      // ignore on initial load
    }
  }

  async function handleGenerate() {
    if (!description.trim() || status !== 'idle') return
    setStatus('generating')
    setErrorMsg('')

    try {
      const result = await api.generateApp(description.trim(), appName.trim())
      if (!result.success) {
        setStatus('error')
        setErrorMsg(result.error ?? 'Build failed. Please try again.')
        return
      }
      setDescription('')
      setAppName('')
      setStatus('idle')
      navigate(`/app/${result.app_id}`)
    } catch (e: unknown) {
      setStatus('error')
      setErrorMsg(e instanceof Error ? e.message : 'Something went wrong')
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this app and all its versions?')) return
    setDeletingId(id)
    try {
      await api.deleteApp(id)
      setApps(prev => prev.filter(a => a.id !== id))
    } catch {
      alert('Failed to delete app')
    } finally {
      setDeletingId(null)
    }
  }

  const isLoading = status === 'generating' || status === 'building'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleGenerate()
    }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">CoCreate</span>
          <span className="text-gray-500 text-sm ml-1">Build apps with words</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Describe it.{' '}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Build it.
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Turn a single sentence into a fully working app — then iterate conversationally.
          </p>
        </div>

        {/* Generator */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl">
            <div className="mb-3">
              <input
                type="text"
                placeholder="App name (optional)"
                value={appName}
                onChange={e => setAppName(e.target.value)}
                disabled={isLoading}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition mb-3"
              />
              <textarea
                ref={textareaRef}
                placeholder="Describe the app you want to build... (e.g. 'A water intake tracker where I can log glasses and see my daily goal')"
                value={description}
                onChange={e => { setDescription(e.target.value); autoResize() }}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                rows={3}
                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none leading-relaxed"
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">⌘ + Enter to generate</span>
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || isLoading}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-brand-900/40"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{status === 'generating' ? 'Generating...' : 'Building...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate App</span>
                  </>
                )}
              </button>
            </div>

            {status === 'error' && (
              <div className="mt-3 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm">
                {errorMsg}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="mt-4 flex items-center justify-center gap-3 text-gray-400 text-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span>
                {status === 'generating'
                  ? 'Gemini is writing your app...'
                  : 'Vite is building it...'}
              </span>
            </div>
          )}
        </div>

        {/* App grid */}
        {apps.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-200 mb-5 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              Your Apps
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  deleting={deletingId === app.id}
                  onDelete={e => handleDelete(e, app.id)}
                  onClick={() => navigate(`/app/${app.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {apps.length === 0 && status === 'idle' && (
          <div className="text-center py-16 text-gray-600">
            <Wand2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No apps yet. Describe one above to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function AppCard({
  app,
  deleting,
  onDelete,
  onClick,
}: {
  app: App
  deleting: boolean
  onDelete: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const relTime = getRelativeTime(app.updated_at)

  return (
    <div
      onClick={onClick}
      className="group relative bg-gray-900 border border-gray-800 hover:border-brand-700 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-brand-900/20"
    >
      {/* Status dot */}
      <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${app.has_build ? 'bg-green-400' : 'bg-yellow-500'}`} />

      <div className="flex flex-col h-full">
        <h3 className="font-semibold text-white text-base mb-1 pr-4 leading-snug">{app.name}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1 line-clamp-2">
          {app.description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">{relTime}</span>
            {app.active_version && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                v{app.active_version}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); window.open(`/apps/${app.id}/preview`, '_blank') }}
              className="p-1.5 text-gray-600 hover:text-gray-300 transition rounded-lg hover:bg-gray-800"
              title="Open app"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1.5 text-gray-600 hover:text-red-400 transition rounded-lg hover:bg-gray-800"
              title="Delete app"
            >
              {deleting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-400 transition" />
          </div>
        </div>
      </div>
    </div>
  )
}

function getRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
