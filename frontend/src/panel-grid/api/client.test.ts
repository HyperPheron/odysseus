import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest, ApiError } from './client'

describe('apiRequest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns parsed JSON on a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ hello: 'world' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiRequest<{ hello: string }>('/api/ping')

    expect(result).toEqual({ hello: 'world' })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/ping'),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('returns undefined for a 204 response without parsing a body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiRequest('/api/void')

    expect(result).toBeUndefined()
  })

  it('throws ApiError with status and body text on a failed response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('missing token'),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest('/api/secret')).rejects.toMatchObject({
      status: 401,
      message: 'missing token',
    })
    await expect(apiRequest('/api/secret')).rejects.toBeInstanceOf(ApiError)
  })
})
