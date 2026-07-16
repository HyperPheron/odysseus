import type { Layout } from 'react-grid-layout'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WORKSPACE_NAMES = ['Trading Day', 'Ops', 'Comms'] as const
export type Workspace = (typeof WORKSPACE_NAMES)[number]

function defaultLayoutForWorkspace(workspace: Workspace): Layout {
  // Asymmetric bento layouts per workspace — chat anchors a tall column,
  // data panels tile around it with structural variety per workspace.
  // All workspaces include all six panels with intentional size variety.
  const layouts: Record<Workspace, Layout> = {
    'Trading Day': [
      { i: 'chat', x: 0, y: 0, w: 5, h: 20 },
      { i: 'signals', x: 5, y: 0, w: 7, h: 12 },
      { i: 'calendar', x: 5, y: 12, w: 3, h: 8 },
      { i: 'email', x: 8, y: 12, w: 4, h: 8 },
      { i: 'security-monitor', x: 0, y: 20, w: 6, h: 8 },
      { i: 'discord-recap', x: 6, y: 20, w: 6, h: 8 },
    ],
    'Ops': [
      { i: 'chat', x: 7, y: 0, w: 5, h: 20 },
      { i: 'security-monitor', x: 0, y: 0, w: 7, h: 12 },
      { i: 'signals', x: 0, y: 12, w: 7, h: 8 },
      { i: 'calendar', x: 0, y: 20, w: 4, h: 8 },
      { i: 'email', x: 4, y: 20, w: 3, h: 8 },
      { i: 'discord-recap', x: 7, y: 20, w: 5, h: 8 },
    ],
    'Comms': [
      { i: 'chat', x: 0, y: 0, w: 5, h: 20 },
      { i: 'discord-recap', x: 5, y: 0, w: 7, h: 10 },
      { i: 'email', x: 5, y: 10, w: 7, h: 10 },
      { i: 'signals', x: 0, y: 20, w: 4, h: 8 },
      { i: 'calendar', x: 4, y: 20, w: 4, h: 8 },
      { i: 'security-monitor', x: 8, y: 20, w: 4, h: 8 },
    ],
  }
  return layouts[workspace]
}

export function createDefaultLayouts(): Record<Workspace, Layout> {
  return WORKSPACE_NAMES.reduce(
    (acc, workspace) => {
      acc[workspace] = defaultLayoutForWorkspace(workspace)
      return acc
    },
    {} as Record<Workspace, Layout>,
  )
}

interface LayoutStoreState {
  activeWorkspace: Workspace
  layouts: Record<Workspace, Layout>
  setActiveWorkspace: (workspace: Workspace) => void
  updateLayout: (workspace: Workspace, layout: Layout) => void
  resetLayout: (workspace: Workspace) => void
}

export const useLayoutStore = create<LayoutStoreState>()(
  persist(
    (set) => ({
      activeWorkspace: 'Trading Day',
      layouts: createDefaultLayouts(),
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      updateLayout: (workspace, layout) =>
        set((state) => ({
          layouts: { ...state.layouts, [workspace]: layout },
        })),
      resetLayout: (workspace) =>
        set((state) => ({
          layouts: { ...state.layouts, [workspace]: defaultLayoutForWorkspace(workspace) },
        })),
    }),
    {
      name: 'hermes-panel-layouts',
      version: 3,
      migrate: (_state: unknown) => {
        // v2 → v3: discard old layouts and return fresh v3 defaults (adds signals, security-monitor, discord-recap)
        return {
          activeWorkspace: 'Trading Day',
          layouts: createDefaultLayouts(),
        } as LayoutStoreState
      },
    },
  ),
)
