import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Hoisted mock so import order matches what the runner sees.
const coreMock = vi.hoisted(() => ({
  getInput: vi.fn<(name: string) => string>(),
  setOutput: vi.fn<(name: string, value: string) => void>(),
  setFailed: vi.fn<(msg: string) => void>(),
  warning: vi.fn<(msg: string) => void>(),
  info: vi.fn<(msg: string) => void>(),
}))
vi.mock('@actions/core', () => coreMock)

import { run } from '../src/index.js'

const INDEX_PAYLOAD = { uncertainty: 22, geopolitical: 0, momentum: -0.08, activity: 99 }
const WORLD_JSON_PAYLOAD = {
  index: { uncertainty: 22, geopolitical: 0, momentum: -0.08, activity: 99 },
  regimeSummary: 'Neutral',
}

function mockOnce(body: unknown, opts: { contentType?: string; status?: number } = {}) {
  const isString = typeof body === 'string'
  const ct = opts.contentType ?? (isString ? 'text/markdown' : 'application/json')
  return vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
    new Response(isString ? body : JSON.stringify(body), {
      status: opts.status ?? 200,
      headers: { 'content-type': ct },
    }),
  )
}

function lastUrl(spy: ReturnType<typeof vi.spyOn>): string {
  const arg = spy.mock.calls[0][0]
  return typeof arg === 'string' ? arg : (arg as URL).toString()
}

function inputs(map: Record<string, string>) {
  coreMock.getInput.mockImplementation((name: string) => map[name] ?? '')
}

beforeEach(() => {
  for (const fn of Object.values(coreMock)) (fn as any).mockReset()
})

afterEach(() => vi.restoreAllMocks())

// ── endpoint=index ─────────────────────────────────────────

describe('endpoint=index', () => {
  it('hits /api/public/index and sets all four outputs', async () => {
    inputs({ endpoint: 'index' })
    const spy = mockOnce(INDEX_PAYLOAD)
    await run()
    expect(lastUrl(spy)).toBe('https://simplefunctions.dev/api/public/index')
    expect(coreMock.setOutput).toHaveBeenCalledWith('world_state', JSON.stringify(INDEX_PAYLOAD))
    expect(coreMock.setOutput).toHaveBeenCalledWith('uncertainty', '22')
    expect(coreMock.setOutput).toHaveBeenCalledWith('geopolitical', '0')
    expect(coreMock.setOutput).toHaveBeenCalledWith('momentum', '-0.08')
  })
})

// ── endpoint=world ─────────────────────────────────────────

describe('endpoint=world', () => {
  it('defaults to markdown format', async () => {
    inputs({})
    const spy = mockOnce('# World', { contentType: 'text/markdown' })
    await run()
    expect(lastUrl(spy)).toBe('https://simplefunctions.dev/api/agent/world?format=markdown')
    expect(coreMock.setOutput).toHaveBeenCalledWith('world_state', '# World')
  })

  it('format=json populates index outputs from data.index', async () => {
    inputs({ endpoint: 'world', format: 'json' })
    mockOnce(WORLD_JSON_PAYLOAD)
    await run()
    expect(coreMock.setOutput).toHaveBeenCalledWith('uncertainty', '22')
    expect(coreMock.setOutput).toHaveBeenCalledWith('geopolitical', '0')
    expect(coreMock.setOutput).toHaveBeenCalledWith('momentum', '-0.08')
  })
})

// ── endpoint=delta ─────────────────────────────────────────

describe('endpoint=delta', () => {
  it('passes since param', async () => {
    inputs({ endpoint: 'delta', since: '6h' })
    const spy = mockOnce('# Delta', { contentType: 'text/markdown' })
    await run()
    expect(lastUrl(spy)).toContain('/api/agent/world/delta')
    expect(lastUrl(spy)).toContain('since=6h')
    expect(lastUrl(spy)).toContain('format=markdown')
  })

  it('default since is 1h', async () => {
    inputs({ endpoint: 'delta' })
    const spy = mockOnce('# Delta', { contentType: 'text/markdown' })
    await run()
    expect(lastUrl(spy)).toContain('since=1h')
  })
})

// ── threshold gate ─────────────────────────────────────────

describe('threshold', () => {
  it('passes when uncertainty <= threshold', async () => {
    inputs({ endpoint: 'index', threshold: '50' })
    mockOnce(INDEX_PAYLOAD)
    await run()
    expect(coreMock.setFailed).not.toHaveBeenCalled()
  })

  it('fails when uncertainty > threshold', async () => {
    inputs({ endpoint: 'index', threshold: '10' })
    mockOnce(INDEX_PAYLOAD) // uncertainty = 22 > 10
    await run()
    expect(coreMock.setFailed).toHaveBeenCalledWith(expect.stringContaining('exceeds threshold 10'))
  })

  it('warns when threshold is set but no uncertainty available', async () => {
    inputs({ endpoint: 'world', format: 'markdown', threshold: '50' })
    mockOnce('# World', { contentType: 'text/markdown' })
    await run()
    expect(coreMock.warning).toHaveBeenCalled()
    expect(coreMock.setFailed).not.toHaveBeenCalled()
  })

  it('rejects non-integer threshold', async () => {
    inputs({ endpoint: 'index', threshold: 'banana' })
    mockOnce(INDEX_PAYLOAD)
    await run()
    expect(coreMock.setFailed).toHaveBeenCalledWith(expect.stringContaining('Invalid threshold'))
  })
})

// ── error paths ────────────────────────────────────────────

describe('error handling', () => {
  it('setFailed on non-2xx', async () => {
    inputs({ endpoint: 'index' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('boom', { status: 503, headers: { 'content-type': 'text/plain' } }),
    )
    await run()
    expect(coreMock.setFailed).toHaveBeenCalledWith(expect.stringContaining('503'))
  })

  it('setFailed on unknown endpoint', async () => {
    inputs({ endpoint: 'bogus' })
    vi.spyOn(globalThis, 'fetch') // should not be called
    await run()
    expect(coreMock.setFailed).toHaveBeenCalledWith(expect.stringContaining('Unknown endpoint'))
  })
})
