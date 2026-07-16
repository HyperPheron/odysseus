export type PanelPermission = 'read' | 'write'
export type PanelSurface = 'native' | 'webview'

export interface PanelManifestEntry {
  id: string
  title: string
  dataSource: string
  refreshPolicy: string
  permissions: PanelPermission[]
  surface: PanelSurface
}

export const PANEL_MANIFEST: PanelManifestEntry[] = [
  {
    id: 'chat',
    title: 'Chat',
    dataSource: 'odysseus:chat',
    refreshPolicy: 'realtime',
    permissions: ['read', 'write'],
    surface: 'native',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    dataSource: 'odysseus:calendar',
    refreshPolicy: 'interval:60s',
    permissions: ['read', 'write'],
    surface: 'native',
  },
  {
    id: 'email',
    title: 'Email',
    dataSource: 'odysseus:email',
    refreshPolicy: 'interval:30s',
    permissions: ['read', 'write'],
    surface: 'native',
  },
  {
    id: 'signals',
    title: 'Trading Signals',
    dataSource: 'gateway:signals',
    refreshPolicy: 'live/ws',
    permissions: ['read'],
    surface: 'native',
  },
  {
    id: 'security-monitor',
    title: 'Security Monitor',
    dataSource: 'gateway:security',
    refreshPolicy: 'interval:30s',
    permissions: ['read'],
    surface: 'native',
  },
  {
    id: 'discord-recap',
    title: 'Discord Intel Recap',
    dataSource: 'gateway:discord',
    refreshPolicy: 'interval:60s',
    permissions: ['read'],
    surface: 'native',
  },
]
