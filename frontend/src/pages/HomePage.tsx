import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Loader2, Wand2, Trash2, ExternalLink, Clock, ChevronRight, Zap, Code2, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'
import type { App, GenerateStatus } from '@/types'

const EXAMPLE_PROMPTS = [
  'A Pomodoro timer with session tracking and a streak counter',
  'A Solitaire card game with full rules and drag-to-move',
  'A habit tracker where I can add daily habits and mark them done',
  'A split-bill calculator for a group dinner',
  'A countdown timer to a custom date with confetti on arrival',
  'A workout log where I can add exercises, sets, and reps',
  'A budget tracker with income, expenses, and a monthly chart',
  'A tournament bracket for 8 players, single elimination',
]

type Stage = 'idle' | 'writing' | 'building' | 'done' | 'error'

const STAGE_LABELS: Record<Stage, string> = {
  idle: '',
  writing: 'Mistral Large is writing your app...',
  building: 'Vite is building it...',
  done: 'Done!',
  error: '',
}

export default function HomePage() {
  const [apps, setApps] = useState<App[]>([])
  const [description, setDescription] = useState('')
  const [appName, setAppName] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [promptIdx, setPromptIdx] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  useEffect(() => { loadApps() }, [])

  // Cycle example placeholder
  useEffect(() => {
    const t = setInterval(() => setPromptIdx(i => (i + 1) % EXAMPLE_PROMPTS.length), 4000)
    return () => clearInterval(t)
  }, [])

  async function loadApps() {
    try { setApps(await api.listApps()) } catch { /* ignore */ }
  }

  async function handleGenerate() {
    if (!description.trim() || stage !== 'idle') return
    setStage('writing')
    setErrorMsg('')

    try {
      // Short delay so UI shows "writing" before the long LLM call
      const result = await api.generateApp(description.trim(), appName.trim())
      if (!result.success) {
        setStage('error')
        setErrorMsg(result.error ?? 'Build failed. Please try again.')
        return
      }
      setStage('done')
      setTimeout(() => {
        setDescription('')
        setAppName('')
        setStage('idle')
        navigate(`/app/${result.app_id}`)
      }, 400)
    } catch (e: unknown) {
      setStage('error')
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
    } catch { alert('Failed to delete app') }
    finally { setDeletingId(null) }
  }

  const isLoading = stage === 'writing' || stage === 'building'

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate()
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
          <span className="text-gray-500 text-sm ml-1 hidden sm:block">Build apps with words</span>
          {apps.length > 0 && (
            <span className="ml-auto text-xs bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
              {apps.length} app{apps.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-900/40 border border-brand-700/40 text-brand-300 text-xs px-3 py-1.5 rounded-full mb-5">
            <Zap className="w-3 h-3" />
            Powered by Mistral Large + Vite
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight leading-tight">
            Describe it.{' '}
            <span className="bg-gradient-to-r from-brand-400 to-brand-600 bg-clip-text text-transparent">
              Build it.
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Turn a single sentence into a fully working React app — then iterate conversationally.
          </p>
        </div>

        {/* Generator box */}
        <div className="max-w-2xl mx-auto mb-16">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl">
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
              placeholder={EXAMPLE_PROMPTS[promptIdx]}
              value={description}
              onChange={e => { setDescription(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={3}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition resize-none leading-relaxed mb-3"
              style={{ minHeight: '80px' }}
            />

            {/* Progress bar */}
            {isLoading && (
              <div className="mb-3 h-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000"
                  style={{ width: stage === 'writing' ? '45%' : '90%' }}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">
                {isLoading ? STAGE_LABELS[stage] : '⌘ + Enter to generate'}
              </span>
              <button
                onClick={handleGenerate}
                disabled={!description.trim() || isLoading}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-brand-900/40"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Working...</span></>
                ) : (
                  <><Sparkles className="w-4 h-4" /><span>Generate App</span></>
                )}
              </button>
            </div>

            {stage === 'error' && (
              <div className="mt-3 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3 text-red-300 text-sm flex items-start justify-between gap-3">
                <span>{errorMsg}</span>
                <button onClick={() => setStage('idle')} className="text-red-400 hover:text-red-200 flex-shrink-0 text-xs underline">Dismiss</button>
              </div>
            )}
          </div>

          {/* Example prompt chips */}
          {stage === 'idle' && !description && (
            <div className="mt-4">
              <p className="text-xs text-gray-600 text-center mb-2">Try one of these</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_PROMPTS.slice(0, 4).map(p => (
                  <button
                    key={p}
                    onClick={() => { setDescription(p); textareaRef.current?.focus() }}
                    className="text-xs bg-gray-800/80 hover:bg-gray-700 border border-gray-700/50 text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-full transition truncate max-w-[260px]"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* App grid */}
        {apps.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                Your Apps
              </h2>
              <button onClick={loadApps} className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 transition">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
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

        {apps.length === 0 && stage === 'idle' && (
          <div className="text-center py-16 text-gray-700">
            <Code2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-gray-500 mb-1">No apps yet.</p>
            <p className="text-sm">Describe one above to get started.</p>
          </div>
        )}
      </main>
    </div>
  )
}

function AppCard({ app, deleting, onDelete, onClick }: {
  app: App; deleting: boolean
  onDelete: (e: React.MouseEvent) => void; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-gray-900 border border-gray-800 hover:border-brand-700/60 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-xl hover:shadow-brand-900/20 hover:-translate-y-0.5"
    >
      <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${app.has_build ? 'bg-green-400' : 'bg-yellow-500'}`} title={app.has_build ? 'Built' : 'Not built'} />

      <div className="flex flex-col h-full min-h-[100px]">
        <h3 className="font-semibold text-white text-base mb-1.5 pr-4 leading-snug">{app.name}</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-4 flex-1 line-clamp-2">{app.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">{getRelativeTime(app.updated_at)}</span>
            {app.active_version && (
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">v{app.active_version}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={e => { e.stopPropagation(); window.open(`/apps/${app.id}/preview`, '_blank') }}
              className="p-1.5 text-gray-600 hover:text-gray-300 transition rounded-lg hover:bg-gray-800"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="p-1.5 text-gray-600 hover:text-red-400 transition rounded-lg hover:bg-gray-800"
              title="Delete"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-brand-400 transition" />
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
  return `${Math.floor(hours / 24)}d ago`
}
