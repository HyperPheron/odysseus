export type FeedGateway = 'signals' | 'security' | 'discord'

const ENV_KEYS: Record<FeedGateway, string> = {
  signals: 'VITE_SIGNALS_TOKEN',
  security: 'VITE_SECURITY_TOKEN',
  discord: 'VITE_DISCORD_TOKEN',
}

/**
 * Resolve the bearer token for a feed gateway.
 * In the Tauri shell this reads the OS keychain (Windows Credential Manager)
 * via the `get_feed_token` command; in browser dev it falls back to Vite env.
 */
interface TauriInternals {
  invoke: (cmd: string, args: Record<string, unknown>) => Promise<unknown>
}

export async function getFeedToken(gateway: FeedGateway): Promise<string> {
  const tauri = (window as { __TAURI_INTERNALS__?: TauriInternals }).__TAURI_INTERNALS__
  if (tauri) {
    return (await tauri.invoke('get_feed_token', { gateway })) as string
  }
  const token = import.meta.env[ENV_KEYS[gateway]] as string | undefined
  if (!token) {
    throw new Error(`Missing ${ENV_KEYS[gateway]} for ${gateway} gateway`)
  }
  return token
}
