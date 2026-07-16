import { useEffect, useState } from 'react'
import { getFeedToken } from '../api/feedToken'
import './SecurityMonitorPanel.css'

interface SecurityAlert {
  ts: string
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  source: string
  message: string
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

export function SecurityMonitorPanel() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const token = await getFeedToken('security')
      const baseUrl = import.meta.env.VITE_FEED_BASE_URL ?? 'http://localhost:7100'
      const url = `${baseUrl}/api/security/alerts?limit=50`
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setAlerts(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30000)
    return () => clearInterval(interval)
  }, [])

  const severityCounts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    high: alerts.filter((a) => a.severity === 'high').length,
    medium: alerts.filter((a) => a.severity === 'medium').length,
    low: alerts.filter((a) => a.severity === 'low').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  }

  return (
    <div className="security-monitor">
      <div className="security-monitor__header">
        <h2 className="security-monitor__title">Security Monitor</h2>
        <button
          type="button"
          className="security-monitor__refresh"
          onClick={loadAlerts}
          disabled={isLoading}
          aria-label="Refresh alerts"
        >
          ↻
        </button>
      </div>

      <div className="security-monitor__heatstrip">
        <div className={`heatstrip-cell heatstrip-cell--critical ${severityCounts.critical > 0 ? 'heatstrip-cell--active' : ''}`}>
          <div className="heatstrip-cell__label">Critical</div>
          <div className="heatstrip-cell__count">{severityCounts.critical}</div>
        </div>
        <div className={`heatstrip-cell heatstrip-cell--high ${severityCounts.high > 0 ? 'heatstrip-cell--active' : ''}`}>
          <div className="heatstrip-cell__label">High</div>
          <div className="heatstrip-cell__count">{severityCounts.high}</div>
        </div>
        <div className={`heatstrip-cell heatstrip-cell--medium ${severityCounts.medium > 0 ? 'heatstrip-cell--active' : ''}`}>
          <div className="heatstrip-cell__label">Medium</div>
          <div className="heatstrip-cell__count">{severityCounts.medium}</div>
        </div>
        <div className={`heatstrip-cell heatstrip-cell--low ${severityCounts.low > 0 ? 'heatstrip-cell--active' : ''}`}>
          <div className="heatstrip-cell__label">Low</div>
          <div className="heatstrip-cell__count">{severityCounts.low}</div>
        </div>
        <div className={`heatstrip-cell heatstrip-cell--info ${severityCounts.info > 0 ? 'heatstrip-cell--active' : ''}`}>
          <div className="heatstrip-cell__label">Info</div>
          <div className="heatstrip-cell__count">{severityCounts.info}</div>
        </div>
      </div>

      {error && <p className="security-monitor__error">{error}</p>}

      {isLoading && <p className="security-monitor__loading">Loading…</p>}

      {!isLoading && alerts.length === 0 && <p className="security-monitor__empty">No alerts</p>}

      {!isLoading && alerts.length > 0 && (
        <div className="security-monitor__stream">
          {alerts.map((alert, idx) => (
            <div key={idx} className={`alert alert--${alert.severity}`}>
              <div className="alert__header">
                <span className="alert__severity">{alert.severity.toUpperCase()}</span>
                <span className="alert__source">{alert.source}</span>
                <span className="alert__time">{formatTime(alert.ts)}</span>
              </div>
              <div className="alert__message">{alert.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
