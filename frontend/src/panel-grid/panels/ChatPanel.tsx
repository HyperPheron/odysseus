import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { apiRequest } from '../api/client'
import './ChatPanel.css'

interface SessionSummary {
  id: string
  name: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatPanel() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<SessionSummary[]>('/api/sessions')
      .then((sessions) => setSessionId(sessions[0]?.id ?? null))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load sessions'))
  }, [])

  async function handleSend() {
    if (!sessionId || !draft.trim() || isSending) return
    const message = draft.trim()
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setDraft('')
    setIsSending(true)
    setError(null)
    try {
      const result = await apiRequest<{ response: string }>('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message, session: sessionId }),
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  if (!sessionId) {
    return <p className="chat-panel__placeholder">{error ?? 'No chat session found.'}</p>
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__messages">
        {messages.map((message, index) => (
          <div key={index} className={`chat-panel__message chat-panel__message--${message.role}`}>
            {message.role === 'assistant' ? (
              <ReactMarkdown rehypePlugins={[rehypeSanitize]}>
                {message.content}
              </ReactMarkdown>
            ) : (
              message.content
            )}
          </div>
        ))}
      </div>
      {error && <p className="chat-panel__error">{error}</p>}
      <div className="chat-panel__composer">
        <input
          className="chat-panel__input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && handleSend()}
          placeholder="Message..."
          disabled={isSending}
        />
        <button type="button" onClick={handleSend} disabled={isSending || !draft.trim()}>
          Send
        </button>
      </div>
    </div>
  )
}
