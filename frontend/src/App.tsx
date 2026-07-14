import './App.css'
import { PanelGrid } from './panel-grid/PanelGrid'
import { ChatPanel } from './panel-grid/panels/ChatPanel'
import { CalendarPanel } from './panel-grid/panels/CalendarPanel'
import { EmailPanel } from './panel-grid/panels/EmailPanel'

function App() {
  return (
    <div className="app-shell">
      <PanelGrid
        panelContent={{
          chat: <ChatPanel />,
          calendar: <CalendarPanel />,
          email: <EmailPanel />,
        }}
      />
    </div>
  )
}

export default App
