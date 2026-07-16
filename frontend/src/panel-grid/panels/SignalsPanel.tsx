import { useSignalsFeed } from './useSignalsFeed'
import './SignalsPanel.css'

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

function SymbolSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="sparkline">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const h = 20
  const w = 40

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} width="40" height="20">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function SignalsPanel() {
  const { isConnected, isReconnecting, signals, symbolSeries, error } = useSignalsFeed()

  return (
    <div className="signals-panel">
      <div className="signals-panel__header">
        <h2 className="signals-panel__title">Trading Signals</h2>
        <div className={`signals-panel__status signals-panel__status--${isConnected ? 'live' : isReconnecting ? 'reconnecting' : 'offline'}`}>
          {isConnected ? 'Live' : isReconnecting ? 'Reconnecting…' : 'Offline'}
        </div>
      </div>

      {error && <p className="signals-panel__error">{error}</p>}

      {signals.length === 0 ? (
        <p className="signals-panel__empty">{isConnected ? 'Waiting for signals…' : 'Not connected'}</p>
      ) : (
        <>
          <div className="signals-panel__ticker">
            {signals.map((signal) => (
              <div key={signal.symbol} className={`ticker-row ticker-row--${signal.side}`}>
                <div className="ticker-row__symbol">{signal.symbol}</div>
                <div className="ticker-row__price">${signal.price.toFixed(2)}</div>
                <div className="ticker-row__sparkline">
                  <SymbolSparkline values={symbolSeries[signal.symbol] ?? []} />
                </div>
                <div className="ticker-row__side">{signal.side.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div className="signals-panel__cards">
            {signals.map((signal) => (
              <div key={`${signal.symbol}-card`} className={`signal-card signal-card--${signal.side}`}>
                <div className="signal-card__header">
                  <span className="signal-card__symbol">{signal.symbol}</span>
                  <span className="signal-card__time">{formatTime(signal.ts)}</span>
                </div>
                <div className="signal-card__body">
                  <div className="signal-card__row">
                    <span className="signal-card__label">Price</span>
                    <span className="signal-card__value">${signal.price.toFixed(2)}</span>
                  </div>
                  <div className="signal-card__row">
                    <span className="signal-card__label">Side</span>
                    <span className="signal-card__badge">{signal.side}</span>
                  </div>
                  <div className="signal-card__row">
                    <span className="signal-card__label">Strength</span>
                    <span className="signal-card__strength">{(signal.strength * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
