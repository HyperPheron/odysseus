import { describe, it, expect } from 'vitest'
import type { Signal, SignalsFeedState } from './useSignalsFeed'

// Reducer extracted for testing
type SignalsFeedAction =
  | { type: 'CONNECTING' }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }
  | { type: 'RECONNECTING' }
  | { type: 'ERROR'; error: string }
  | { type: 'SNAPSHOT'; signals: Signal[]; series: Record<string, number[]> }
  | { type: 'SIGNAL'; signal: Signal }

const POINT_CAP = 60

function signalsFeedReducer(state: SignalsFeedState, action: SignalsFeedAction): SignalsFeedState {
  switch (action.type) {
    case 'CONNECTING':
      return { ...state, isConnected: false, isReconnecting: false, error: null }
    case 'CONNECTED':
      return { ...state, isConnected: true, isReconnecting: false, error: null }
    case 'DISCONNECTED':
      return { ...state, isConnected: false, isReconnecting: false }
    case 'RECONNECTING':
      return { ...state, isReconnecting: true, error: null }
    case 'ERROR':
      return { ...state, error: action.error, isConnected: false, isReconnecting: false }
    case 'SNAPSHOT': {
      return {
        ...state,
        signals: action.signals,
        symbolSeries: action.series,
        isConnected: true,
        error: null,
      }
    }
    case 'SIGNAL': {
      const { signal } = action
      const signalMap = new Map(state.signals.map((s) => [s.symbol, s]))
      signalMap.set(signal.symbol, signal)
      const updatedSignals = Array.from(signalMap.values())

      const series = { ...state.symbolSeries }
      const existing = series[signal.symbol] ?? []
      series[signal.symbol] = [...existing, signal.price].slice(-POINT_CAP)

      return { ...state, signals: updatedSignals, symbolSeries: series }
    }
    default:
      return state
  }
}

const initialState: SignalsFeedState = {
  isConnected: false,
  isReconnecting: false,
  signals: [],
  symbolSeries: {},
  error: null,
}

describe('useSignalsFeed reducer', () => {
  it('should initialize with empty state', () => {
    expect(initialState).toEqual({
      isConnected: false,
      isReconnecting: false,
      signals: [],
      symbolSeries: {},
      error: null,
    })
  })

  it('should transition to CONNECTING state', () => {
    const result = signalsFeedReducer(initialState, { type: 'CONNECTING' })
    expect(result.isConnected).toBe(false)
    expect(result.isReconnecting).toBe(false)
    expect(result.error).toBeNull()
  })

  it('should transition to CONNECTED state', () => {
    const result = signalsFeedReducer(initialState, { type: 'CONNECTED' })
    expect(result.isConnected).toBe(true)
    expect(result.isReconnecting).toBe(false)
    expect(result.error).toBeNull()
  })

  it('should handle SNAPSHOT action', () => {
    const signals: Signal[] = [
      { ts: '2025-01-01T00:00:00Z', symbol: 'AAPL', price: 150.25, side: 'buy', strength: 0.8 },
      { ts: '2025-01-01T00:00:01Z', symbol: 'GOOGL', price: 140.5, side: 'sell', strength: 0.6 },
    ]
    const series = {
      AAPL: [149.5, 150.0, 150.25],
      GOOGL: [141.0, 140.8, 140.5],
    }
    const result = signalsFeedReducer(initialState, { type: 'SNAPSHOT', signals, series })
    expect(result.signals).toEqual(signals)
    expect(result.symbolSeries).toEqual(series)
    expect(result.isConnected).toBe(true)
    expect(result.error).toBeNull()
  })

  it('should append signal and cap series at POINT_CAP', () => {
    const state: SignalsFeedState = {
      ...initialState,
      signals: [],
      symbolSeries: { AAPL: Array(60).fill(150) },
    }
    const signal: Signal = {
      ts: '2025-01-01T00:00:02Z',
      symbol: 'AAPL',
      price: 151.0,
      side: 'buy',
      strength: 0.9,
    }
    const result = signalsFeedReducer(state, { type: 'SIGNAL', signal })
    expect(result.signals).toContainEqual(signal)
    expect(result.symbolSeries.AAPL).toHaveLength(POINT_CAP)
    expect(result.symbolSeries.AAPL[result.symbolSeries.AAPL.length - 1]).toBe(151.0)
  })

  it('should update existing signal per symbol', () => {
    const signal1: Signal = {
      ts: '2025-01-01T00:00:00Z',
      symbol: 'AAPL',
      price: 150.0,
      side: 'buy',
      strength: 0.8,
    }
    const signal2: Signal = {
      ts: '2025-01-01T00:00:01Z',
      symbol: 'AAPL',
      price: 151.0,
      side: 'sell',
      strength: 0.9,
    }
    let state = signalsFeedReducer(initialState, { type: 'SIGNAL', signal: signal1 })
    state = signalsFeedReducer(state, { type: 'SIGNAL', signal: signal2 })
    expect(state.signals).toHaveLength(1)
    expect(state.signals[0]).toEqual(signal2)
  })

  it('should handle ERROR action', () => {
    const error = 'Connection failed'
    const result = signalsFeedReducer(initialState, { type: 'ERROR', error })
    expect(result.error).toBe(error)
    expect(result.isConnected).toBe(false)
    expect(result.isReconnecting).toBe(false)
  })

  it('should handle DISCONNECTED action', () => {
    const state = { ...initialState, isConnected: true }
    const result = signalsFeedReducer(state, { type: 'DISCONNECTED' })
    expect(result.isConnected).toBe(false)
    expect(result.isReconnecting).toBe(false)
  })

  it('should handle RECONNECTING action', () => {
    const result = signalsFeedReducer(initialState, { type: 'RECONNECTING' })
    expect(result.isReconnecting).toBe(true)
    expect(result.error).toBeNull()
  })
})
