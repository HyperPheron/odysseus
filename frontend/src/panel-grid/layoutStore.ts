import type { Layout } from 'react-grid-layout'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WORKSPACE_NAMES = ['Trading Day', 'Ops', 'Comms'] as const
export type Workspace = (typeof WORKSPACE_NAMES)[number]

function defaultLayoutForWorkspace(workspace: Workspace): Layout {
  // Asymmetric bento layouts per workspace — chat anchors a tall column,
  // data panels tile around it with structural variety per workspace.
  const layouts: Record<Workspace, Layout> = {
    'Trading Day': [
      { i: 'chat', x: 0, y: 0, w: 5, h: 20 },
      { i: 'calendar', x: 5, y: 0, w: 7, h: 9 },
      { i: 'email', x: 5, y: 9, w: 7, h: 11 },
    ],
    'Ops': [
      { i: 'chat', x: 7, y: 0, w: 5, h: 20 },
      { i: 'calendar', x: 0, y: 12, w: 7, h: 8 },
      { i: 'email', x: 0, y: 0, w: 7, h: 12 },
    ],
    'Comms': [
      { i: 'chat', x: 0, y: 0, w: 5, h: 20 },
      { i: 'calendar', x: 5, y: 13, w: 7, h: 7 },
      { i: 'email', x: 5, y: 0, w: 7, h: 13 },
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
      version: 2,
      migrate: () => {
        // Discard v1 layouts (uniform grids) and return fresh v2 defaults (asymmetric bento)
        return {
          activeWorkspace: 'Trading Day',
          layouts: createDefaultLayouts(),
        } as LayoutStoreState
      },
    },
  ),
)
