import { useEffect, useReducer, useRef, useCallback } from 'react'
import { getFeedToken } from '../api/feedToken'

export interface Signal {
  ts: string
  symbol: string
  price: number
  side: 'buy' | 'sell' | 'hold'
  strength: number
}

export interface SignalsFeedState {
  isConnected: boolean
  isReconnecting: boolean
  signals: Signal[]
  symbolSeries: Record<string, number[]> // sparkline data, capped at ~60 points per symbol
  error: string | null
}

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
      // Update signals list: keep latest per symbol, maintain order
      const signalMap = new Map(state.signals.map((s) => [s.symbol, s]))
      signalMap.set(signal.symbol, signal)
      const updatedSignals = Array.from(signalMap.values())

      // Append price to series and cap at POINT_CAP
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

interface UseSignalsFeedOptions {
  baseUrl?: string
}

export function useSignalsFeed(options?: UseSignalsFeedOptions) {
  const [state, dispatch] = useReducer(signalsFeedReducer, initialState)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number | undefined>(undefined)
  const reconnectDelayRef = useRef(100)

  const connect = useCallback(async () => {
    dispatch({ type: 'CONNECTING' })
    try {
      const token = await getFeedToken('signals')
      const baseUrl = options?.baseUrl ?? import.meta.env.VITE_FEED_BASE_URL ?? 'http://localhost:7100'
      const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/signals'

      const ws = new WebSocket(wsUrl, ['hermes-bearer', token])

      ws.onopen = () => {
        dispatch({ type: 'CONNECTED' })
        reconnectDelayRef.current = 100
      }

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'snapshot') {
            dispatch({
              type: 'SNAPSHOT',
              signals: data.signals ?? [],
              series: data.series ?? {},
            })
          } else if (data.type === 'signal') {
            dispatch({ type: 'SIGNAL', signal: data.signal })
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Failed to parse message'
          dispatch({ type: 'ERROR', error: message })
        }
      }

      ws.onerror = () => {
        dispatch({ type: 'ERROR', error: 'WebSocket error' })
      }

      ws.onclose = () => {
        dispatch({ type: 'DISCONNECTED' })
        // Schedule reconnect: exponential backoff capped at 30s
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        const delay = Math.min(reconnectDelayRef.current, 30000)
        reconnectDelayRef.current *= 2
        dispatch({ type: 'RECONNECTING' })
        reconnectTimerRef.current = setTimeout(() => connect(), delay)
      }

      wsRef.current = ws
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to get feed token'
      dispatch({ type: 'ERROR', error: message })
      // Schedule reconnect on error
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      const delay = Math.min(reconnectDelayRef.current, 30000)
      reconnectDelayRef.current *= 2
      dispatch({ type: 'RECONNECTING' })
      reconnectTimerRef.current = setTimeout(() => connect(), delay)
    }
  }, [options?.baseUrl])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  return state
}
