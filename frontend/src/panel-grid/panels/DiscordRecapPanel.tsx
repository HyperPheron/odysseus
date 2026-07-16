import { useEffect, useState } from 'react'
import { getFeedToken } from '../api/feedToken'
import './DiscordRecapPanel.css'

interface DiscordRecap {
  ts: string
  channel: string
  period: 'hourly' | 'daily'
  summary: string
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

export function DiscordRecapPanel() {
  const [recaps, setRecaps] = useState<DiscordRecap[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRecaps = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getFeedToken('discord')
      const baseUrl = import.meta.env.VITE_FEED_BASE_URL ?? 'http://localhost:7100'
      const url = `${baseUrl}/api/discord/recaps?limit=20`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setRecaps(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recaps')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRecaps()
    const interval = setInterval(loadRecaps, 60000)
    return () => clearInterval(interval)
  }, [])

  const groupedByPeriod = {
    daily: recaps.filter((r) => r.period === 'daily'),
    hourly: recaps.filter((r) => r.period === 'hourly'),
  }

  return (
    <div className="discord-recap">
      <div className="discord-recap__header">
        <h2 className="discord-recap__title">Discord Intel Recap</h2>
        <button
          type="button"
          className="discord-recap__refresh"
          onClick={loadRecaps}
          disabled={isLoading}
          aria-label="Refresh recaps"
        >
          ↻
        </button>
      </div>

      {error && <p className="discord-recap__error">{error}</p>}

      {isLoading && <p className="discord-recap__loading">Loading…</p>}

      {!isLoading && recaps.length === 0 && <p className="discord-recap__empty">No recaps available</p>}

      {!isLoading && recaps.length > 0 && (
        <div className="discord-recap__content">
          {groupedByPeriod.daily.length > 0 && (
            <div className="recap-section">
              <h3 className="recap-section__title">Daily</h3>
              <div className="recap-list">
                {groupedByPeriod.daily.map((recap, idx) => (
                  <div key={idx} className="recap-item">
                    <div className="recap-item__header">
                      <span className="recap-item__channel">{recap.channel}</span>
                      <span className="recap-item__time">{formatTime(recap.ts)}</span>
                    </div>
                    <p className="recap-item__summary">{recap.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {groupedByPeriod.hourly.length > 0 && (
            <div className="recap-section">
              <h3 className="recap-section__title">Hourly</h3>
              <div className="recap-list">
                {groupedByPeriod.hourly.map((recap, idx) => (
                  <div key={idx} className="recap-item">
                    <div className="recap-item__header">
                      <span className="recap-item__channel">{recap.channel}</span>
                      <span className="recap-item__time">{formatTime(recap.ts)}</span>
                    </div>
                    <p className="recap-item__summary">{recap.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
