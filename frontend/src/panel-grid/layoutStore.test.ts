import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultLayouts, useLayoutStore, WORKSPACE_NAMES } from './layoutStore'
import { PANEL_MANIFEST } from './panelManifest'

describe('layoutStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useLayoutStore.setState({
      activeWorkspace: 'Trading Day',
      layouts: createDefaultLayouts(),
    })
  })

  it('seeds every named workspace with a default layout entry per manifest panel (v3: 6 panels)', () => {
    const { layouts } = useLayoutStore.getState()
    for (const workspace of WORKSPACE_NAMES) {
      const ids = layouts[workspace].map((entry) => entry.i).sort()
      const expectedIds = PANEL_MANIFEST.map((panel) => panel.id).sort()
      expect(ids).toEqual(expectedIds)
      expect(layouts[workspace]).toHaveLength(6) // v3 has 6 panels
    }
  })

  it('defaults active workspace to Trading Day', () => {
    expect(useLayoutStore.getState().activeWorkspace).toBe('Trading Day')
  })

  it('switches active workspace without touching layouts', () => {
    const before = useLayoutStore.getState().layouts
    useLayoutStore.getState().setActiveWorkspace('Ops')
    expect(useLayoutStore.getState().activeWorkspace).toBe('Ops')
    expect(useLayoutStore.getState().layouts).toBe(before)
  })

  it('updates only the target workspace layout, leaving others untouched', () => {
    const opsBefore = useLayoutStore.getState().layouts.Ops
    const commsBefore = useLayoutStore.getState().layouts.Comms
    const nextChatLayout = useLayoutStore
      .getState()
      .layouts['Trading Day'].map((entry) =>
        entry.i === 'chat' ? { ...entry, x: 7, y: 0, w: 5, h: 20 } : entry,
      )

    useLayoutStore.getState().updateLayout('Trading Day', nextChatLayout)

    expect(useLayoutStore.getState().layouts['Trading Day']).toEqual(nextChatLayout)
    expect(useLayoutStore.getState().layouts.Ops).toBe(opsBefore)
    expect(useLayoutStore.getState().layouts.Comms).toBe(commsBefore)
  })

  it('resets a workspace layout back to the manifest default', () => {
    useLayoutStore.getState().updateLayout('Comms', [])
    expect(useLayoutStore.getState().layouts.Comms).toEqual([])

    useLayoutStore.getState().resetLayout('Comms')

    const ids = useLayoutStore.getState().layouts.Comms.map((entry) => entry.i).sort()
    const expectedIds = PANEL_MANIFEST.map((panel) => panel.id).sort()
    expect(ids).toEqual(expectedIds)
    expect(useLayoutStore.getState().layouts.Comms).toHaveLength(6)
  })

  it('has no duplicate panel ids in the manifest', () => {
    expect(new Set(PANEL_MANIFEST.map((panel) => panel.id)).size).toBe(PANEL_MANIFEST.length)
  })
})
