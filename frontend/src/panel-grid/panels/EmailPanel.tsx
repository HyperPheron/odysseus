import { useEffect, useState } from 'react'
import { apiRequest } from '../api/client'
import './EmailPanel.css'

interface EmailSummary {
  uid: string
  subject: string
  from_name: string
  date_display: string
  is_read: boolean
}

export function EmailPanel() {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<{ emails: EmailSummary[] }>('/api/email/list?folder=INBOX&limit=30')
      .then((data) => setEmails(data.emails))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load emails'))
  }, [])

  if (error) {
    return <p className="email-panel__error">{error}</p>
  }

  if (emails.length === 0) {
    return <p className="email-panel__placeholder">No emails.</p>
  }

  return (
    <ul className="email-panel__list">
      {emails.map((email) => (
        <li
          key={email.uid}
          className={email.is_read ? 'email-panel__item' : 'email-panel__item email-panel__item--unread'}
        >
          <span className="email-panel__from">{email.from_name}</span>
          <span className="email-panel__subject">{email.subject}</span>
          <span className="email-panel__date">{email.date_display}</span>
        </li>
      ))}
    </ul>
  )
}
