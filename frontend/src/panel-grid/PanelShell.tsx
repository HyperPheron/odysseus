import type { ReactNode } from 'react'
import './PanelShell.css'

interface PanelShellProps {
  title: string
  children?: ReactNode
}

export function PanelShell({ title, children }: PanelShellProps) {
  return (
    <div className="panel-shell">
      <div className="panel-shell__handle">
        <h2 className="panel-shell__title">{title}</h2>
      </div>
      <div className="panel-shell__body">
        {children ?? <p className="panel-shell__placeholder">No content wired yet.</p>}
      </div>
    </div>
  )
}
