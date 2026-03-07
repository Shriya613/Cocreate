import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Send,
  Loader2,
  ExternalLink,
  History,
  RefreshCw,
  RotateCcw,
  Wand2,
  CheckCircle,
  XCircle,
  Monitor,
  MessageSquare,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { App, AppVersion, ChatMessage } from '@/types'

type Panel = 'preview' | 'chat' | 'history'

export default function AppPage() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()

  const [app, setApp] = useState<(App & { active_code?: string }) | null>(null)
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [panel, setPanel] = useState<Panel>('preview')
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [loading, setLoading] = useState(true)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const refresh = useCallback(async () => {
    if (!appId) return
    const [appData, versionData, chatData] = await Promise.all([
      api.getApp(appId),
      api.listVersions(appId),
      api.getChat(appId),
    ])
    setApp(appData)
    setVersions(versionData)
    setMessages(chatData)
    setLoading(false)
  }, [appId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending || !appId) return
    const msg = input.trim()
    setInput('')
    setSending(true)

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [
      ...prev,
      { id: tempId, app_id: appId, role: 'user', content: msg, created_at: new Date().toISOString() },
    ])

    try {
      const result = await api.sendMessage(appId, msg)

      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `u-${tempId}`, app_id: appId, role: 'user', content: msg, created_at: new Date().toISOString() },
        { id: result.message_id, app_id: appId, role: 'assistant', content: result.reply, created_at: new Date().toISOString() },
      ])

      if (result.success) {
        await refresh()
        setPreviewKey(k => k + 1)
        setPanel('preview')
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Something went wrong'
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: `u-${tempId}`, app_id: appId, role: 'user', content: msg, created_at: new Date().toISOString() },
        { id: `err-${tempId}`, app_id: appId, role: 'assistant', content: `Error: ${errMsg}`, created_at: new Date().toISOString() },
      ])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  async function handleRestore(versionId: string) {
    if (!appId) return
    setRestoringId(versionId)
    try {
      await api.restoreVersion(appId, versionId)
      await refresh()
      setPreviewKey(k => k + 1)
      setPanel('preview')
    } catch {
      alert('Failed to restore version')
    } finally {
      setRestoringId(null)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400">App not found.</p>
        <button onClick={() => navigate('/')} className="text-brand-400 hover:underline">
          Go home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="h-4 w-px bg-gray-700 mx-1" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-white truncate">{app.name}</span>
            {app.active_version && (
              <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">
                v{app.active_version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <a
              href={`/apps/${appId}/preview`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          </div>
        </div>

        {/* Panel tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 pb-2">
          {([
            { id: 'preview', label: 'Preview', icon: Monitor },
            { id: 'chat', label: 'Chat', icon: MessageSquare },
            { id: 'history', label: 'History', icon: History },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPanel(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
                panel === id
                  ? 'bg-brand-900/60 text-brand-300 border border-brand-700/50'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {id === 'chat' && messages.length > 0 && (
                <span className="ml-0.5 text-xs bg-gray-700 text-gray-300 px-1.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Preview panel */}
        {panel === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{app.description}</p>
              <button
                onClick={() => setPreviewKey(k => k + 1)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload
              </button>
            </div>

            {app.has_build ? (
              <div className="relative bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-700" />
                    <div className="w-3 h-3 rounded-full bg-gray-700" />
                    <div className="w-3 h-3 rounded-full bg-gray-700" />
                  </div>
                  <div className="flex-1 bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-500 text-center">
                    {app.name}
                  </div>
                </div>
                <iframe
                  key={previewKey}
                  src={`/apps/${appId}/preview`}
                  className="w-full border-0"
                  style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}
                  title={app.name}
                />
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
                <Wand2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">App hasn't been built yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Chat panel */}
        {panel === 'chat' && (
          <div className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4 mb-4 pr-1">
              {messages.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No messages yet. Ask me to change something about your app.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {[
                      'Make the accent color blue',
                      'Add a dark mode toggle',
                      'Add a reset button',
                      'Make it more compact',
                    ].map(s => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-full transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                      <Wand2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white rounded-br-sm'
                        : msg.content.startsWith('Error:')
                        ? 'bg-red-950/50 border border-red-800 text-red-300 rounded-bl-sm'
                        : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.content.startsWith('Error:') && (
                      <div className="flex items-center gap-1.5 mb-1">
                        {msg.content.includes('Done!') ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span className="text-xs text-gray-400">CoCreate</span>
                      </div>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
                    <Wand2 className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex gap-1 bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3 flex gap-3 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                placeholder="Describe a change... (Enter to send)"
                rows={1}
                className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 text-sm focus:outline-none resize-none leading-relaxed"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 w-9 h-9 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* History panel */}
        {panel === 'history' && (
          <div className="max-w-2xl space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              {versions.length} version{versions.length !== 1 ? 's' : ''} — click Restore to roll back.
            </p>
            {versions.map(v => (
              <div
                key={v.id}
                className={`bg-gray-900 border rounded-xl p-4 flex items-start gap-4 ${
                  v.is_active ? 'border-brand-700/60 bg-brand-950/20' : 'border-gray-800'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  v.is_active ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}>
                  {v.version_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-sm leading-relaxed mb-1 truncate">{v.prompt}</p>
                  <p className="text-xs text-gray-600">{new Date(v.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {v.is_active ? (
                    <span className="text-xs text-brand-400 font-medium">Active</span>
                  ) : (
                    <button
                      onClick={() => handleRestore(v.id)}
                      disabled={restoringId === v.id}
                      className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition"
                    >
                      {restoringId === v.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
