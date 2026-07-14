import type { ReactNode } from 'react'
import ReactGridLayout, { useContainerWidth } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { PANEL_MANIFEST } from './panelManifest'
import { PanelShell } from './PanelShell'
import { useLayoutStore, WORKSPACE_NAMES } from './layoutStore'
import './PanelGrid.css'

interface PanelGridProps {
  panelContent?: Record<string, ReactNode>
}

export function PanelGrid({ panelContent }: PanelGridProps) {
  const activeWorkspace = useLayoutStore((state) => state.activeWorkspace)
  const layouts = useLayoutStore((state) => state.layouts)
  const setActiveWorkspace = useLayoutStore((state) => state.setActiveWorkspace)
  const updateLayout = useLayoutStore((state) => state.updateLayout)
  const { width, containerRef, mounted } = useContainerWidth()

  return (
    <div className="panel-grid">
      <nav className="panel-grid__tabs">
        {WORKSPACE_NAMES.map((workspace) => (
          <button
            key={workspace}
            type="button"
            className={
              workspace === activeWorkspace
                ? 'panel-grid__tab panel-grid__tab--active'
                : 'panel-grid__tab'
            }
            onClick={() => setActiveWorkspace(workspace)}
          >
            {workspace}
          </button>
        ))}
      </nav>
      <div className="panel-grid__surface" ref={containerRef}>
        {mounted && (
          <ReactGridLayout
            width={width}
            layout={layouts[activeWorkspace]}
            gridConfig={{ cols: 12, rowHeight: 30, margin: [12, 12] }}
            dragConfig={{ handle: '.panel-shell__handle' }}
            onLayoutChange={(layout) => updateLayout(activeWorkspace, layout)}
          >
            {PANEL_MANIFEST.map((panel) => (
              <div key={panel.id}>
                <PanelShell title={panel.title}>{panelContent?.[panel.id]}</PanelShell>
              </div>
            ))}
          </ReactGridLayout>
        )}
      </div>
    </div>
  )
}
