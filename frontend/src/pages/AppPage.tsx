import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Send, Loader2, ExternalLink, History,
  RefreshCw, RotateCcw, Wand2, CheckCircle, XCircle,
  Download, RefreshCcw, ChevronRight, ChevronLeft,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { App, AppVersion, ChatMessage } from '@/types'

const CHAT_SUGGESTIONS = [
  'Make the accent color blue',
  'Add a dark mode toggle',
  'Add a reset button',
  'Make the font larger',
  'Add animations',
  'Make it more compact',
]

export default function AppPage() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()

  const [app, setApp] = useState<(App & { active_code?: string }) | null>(null)
  const [versions, setVersions] = useState<AppVersion[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [previewKey, setPreviewKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sidePanel, setSidePanel] = useState<'chat' | 'history'>('chat')
  const [panelOpen, setPanelOpen] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [exporting, setExporting] = useState(false)

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

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { if (app) document.title = `${app.name} — CoCreate` }, [app])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    if (!input.trim() || sending || !appId) return
    const msg = input.trim()
    setInput('')
    setSending(true)

    const tempId = `temp-${Date.now()}`
    setMessages(prev => [...prev, { id: tempId, app_id: appId, role: 'user', content: msg, created_at: new Date().toISOString() }])

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
      setSidePanel('chat')
    } catch { alert('Failed to restore version') }
    finally { setRestoringId(null) }
  }

  async function handleRegenerate() {
    if (!app || !appId || regenerating) return
    if (!confirm('Regenerate this app from scratch? Current version will be replaced.')) return
    setRegenerating(true)
    try {
      const result = await api.generateApp(app.description, app.name)
      if (result.success) {
        await refresh()
        setPreviewKey(k => k + 1)
      } else {
        alert('Regeneration failed: ' + (result.error ?? 'Unknown error'))
      }
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to regenerate')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleExport() {
    if (!appId || exporting) return
    setExporting(true)
    try {
      const res = await fetch(`/api/apps/${appId}/export`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${app?.name ?? appId}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
    </div>
  )

  if (!app) return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <p className="text-gray-400">App not found.</p>
      <button onClick={() => navigate('/')} className="text-brand-400 hover:underline">Go home</button>
    </div>
  )

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-800/60 bg-gray-950/80 backdrop-blur flex-shrink-0 z-10">
        <div className="px-4 h-13 flex items-center gap-3 py-2">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-400 hover:text-white transition text-sm flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="h-4 w-px bg-gray-800 mx-1 flex-shrink-0" />

          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
              <Wand2 className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-white truncate">{app.name}</span>
            {app.active_version && (
              <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">v{app.active_version}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              title="Regenerate from scratch"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition disabled:opacity-40"
            >
              {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Regenerate</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || !app.has_build}
              title="Download as zip"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition disabled:opacity-40"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Export</span>
            </button>
            <a
              href={`/apps/${appId}/preview`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Open</span>
            </a>
          </div>
        </div>
      </header>

      {/* Body: preview + side panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-w-0">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-600 truncate">{app.description}</p>
            <button onClick={() => setPreviewKey(k => k + 1)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-300 transition flex-shrink-0 ml-2">
              <RefreshCw className="w-3 h-3" /> Reload
            </button>
          </div>

          {app.has_build ? (
            <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-xl flex flex-col">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800 bg-gray-900 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
                </div>
                <div className="flex-1 bg-gray-800 rounded px-3 py-0.5 text-xs text-gray-500 text-center truncate">{app.name}</div>
              </div>
              <iframe
                key={previewKey}
                src={`/apps/${appId}/preview`}
                className="flex-1 w-full border-0"
                title={app.name}
              />
            </div>
          ) : (
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center gap-3">
              <Wand2 className="w-10 h-10 text-gray-700" />
              <p className="text-gray-500 text-sm">App hasn't been built yet.</p>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-2 text-sm bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition disabled:opacity-40"
              >
                {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setPanelOpen(o => !o)}
          className="flex-shrink-0 self-center bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full w-5 h-10 flex items-center justify-center transition z-10"
          title={panelOpen ? 'Collapse panel' : 'Expand panel'}
        >
          {panelOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Side panel */}
        {panelOpen && (
          <div className="w-80 xl:w-96 flex-shrink-0 flex flex-col border-l border-gray-800 bg-gray-950">
            {/* Panel tabs */}
            <div className="flex border-b border-gray-800 flex-shrink-0">
              {(['chat', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSidePanel(tab)}
                  className={`flex-1 py-2.5 text-sm font-medium transition capitalize ${
                    sidePanel === tab
                      ? 'text-brand-300 border-b-2 border-brand-500'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab}
                  {tab === 'chat' && messages.length > 0 && (
                    <span className="ml-1.5 text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{messages.length}</span>
                  )}
                  {tab === 'history' && versions.length > 0 && (
                    <span className="ml-1.5 text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{versions.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Chat */}
            {sidePanel === 'chat' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3">
                  {messages.length === 0 && (
                    <div className="pt-6 text-center">
                      <p className="text-gray-600 text-sm mb-4">Ask me to change anything.</p>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {CHAT_SUGGESTIONS.map(s => (
                          <button
                            key={s}
                            onClick={() => { setInput(s); inputRef.current?.focus() }}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded-full transition"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0 mr-1.5 mt-1">
                          <Wand2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-brand-600 text-white rounded-br-sm'
                          : msg.content.startsWith('Error:')
                          ? 'bg-red-950/50 border border-red-800 text-red-300 rounded-bl-sm'
                          : 'bg-gray-800 text-gray-200 rounded-bl-sm'
                      }`}>
                        {msg.role === 'assistant' && !msg.content.startsWith('Error:') && (
                          <div className="flex items-center gap-1 mb-1">
                            {msg.content.includes('Done!') ? (
                              <CheckCircle className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                            <span className="text-xs text-gray-500">CoCreate</span>
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {sending && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center flex-shrink-0">
                        <Wand2 className="w-2.5 h-2.5 text-white" />
                      </div>
                      <div className="flex gap-1 bg-gray-800 px-3 py-2.5 rounded-xl rounded-bl-sm">
                        {[0, 1, 2].map(i => (
                          <div key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t border-gray-800 flex-shrink-0">
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 flex gap-2 items-end focus-within:border-brand-600 transition">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={sending}
                      placeholder="Describe a change..."
                      rows={1}
                      className="flex-1 bg-transparent text-gray-200 placeholder-gray-600 text-sm focus:outline-none resize-none leading-relaxed"
                      style={{ maxHeight: '100px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || sending}
                      className="flex-shrink-0 w-8 h-8 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-700 mt-1.5 text-center">Enter to send · Shift+Enter for newline</p>
                </div>
              </div>
            )}

            {/* History */}
            {sidePanel === 'history' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
                {versions.length === 0 && (
                  <p className="text-gray-600 text-sm text-center pt-6">No versions yet.</p>
                )}
                {versions.map(v => (
                  <div
                    key={v.id}
                    className={`rounded-xl p-3 border flex items-start gap-3 ${
                      v.is_active ? 'border-brand-700/60 bg-brand-950/20' : 'border-gray-800 bg-gray-900'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                      v.is_active ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {v.version_number}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 text-xs leading-relaxed mb-1 line-clamp-2">{v.prompt}</p>
                      <p className="text-xs text-gray-600">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    {v.is_active ? (
                      <span className="text-xs text-brand-400 font-medium flex-shrink-0">Active</span>
                    ) : (
                      <button
                        onClick={() => handleRestore(v.id)}
                        disabled={restoringId === v.id}
                        className="flex items-center gap-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-lg transition flex-shrink-0"
                      >
                        {restoringId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
