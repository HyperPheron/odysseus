import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import './CalendarPanel.css'

interface CalendarEvent {
  uid: string
  summary: string
  dtstart: string
  dtend: string
}

function startOfWeek(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - now.getDay())
  return now.toISOString()
}

function endOfWeek(): string {
  const now = new Date()
  now.setHours(23, 59, 59, 999)
  now.setDate(now.getDate() + (6 - now.getDay()))
  return now.toISOString()
}

export function CalendarPanel() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams({ start: startOfWeek(), end: endOfWeek() })
    apiRequest<{ events: CalendarEvent[] }>(`/api/calendar/events?${params}`)
      .then((data) => setEvents(data.events))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load events'))
  }, [])

  if (error) {
    return <p className="calendar-panel__error">{error}</p>
  }

  if (events.length === 0) {
    return <p className="calendar-panel__placeholder">No events this week.</p>
  }

  return (
    <ul className="calendar-panel__list">
      {events.map((event) => (
        <li key={event.uid} className="calendar-panel__event">
          <span className="calendar-panel__time">
            {new Date(event.dtstart).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
          </span>
          <span className="calendar-panel__summary">{event.summary}</span>
        </li>
      ))}
    </ul>
  )
}
