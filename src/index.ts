import * as core from '@actions/core'

const BASE = 'https://simplefunctions.dev'

type Endpoint = 'world' | 'index' | 'delta'
type Format = 'markdown' | 'json'

async function sfFetch(path: string, params: Record<string, string> = {}): Promise<{ text: string; json: any | null }> {
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`SimpleFunctions API error ${res.status} for ${url.pathname}`)
  }
  const ct = res.headers.get('content-type') || ''
  const text = await res.text()
  let json: any | null = null
  if (ct.includes('json')) {
    try {
      json = JSON.parse(text)
    } catch {
      /* leave as text */
    }
  }
  return { text, json }
}

function setIndexOutputs(idx: { uncertainty?: number; geopolitical?: number; momentum?: number }): void {
  if (idx.uncertainty != null) core.setOutput('uncertainty', String(idx.uncertainty))
  if (idx.geopolitical != null) core.setOutput('geopolitical', String(idx.geopolitical))
  if (idx.momentum != null) core.setOutput('momentum', String(idx.momentum))
}

export async function run(): Promise<void> {
  try {
    const endpoint = ((core.getInput('endpoint') || 'world').trim() as Endpoint)
    const format = ((core.getInput('format') || 'markdown').trim() as Format)
    const since = (core.getInput('since') || '1h').trim()
    const thresholdRaw = core.getInput('threshold')

    let uncertaintyForThreshold: number | null = null

    if (endpoint === 'index') {
      const { json } = await sfFetch('/api/public/index')
      if (!json) throw new Error('Index endpoint did not return JSON')
      core.setOutput('world_state', JSON.stringify(json))
      setIndexOutputs(json)
      uncertaintyForThreshold = typeof json.uncertainty === 'number' ? json.uncertainty : null
    } else if (endpoint === 'delta') {
      const { text, json } = await sfFetch('/api/agent/world/delta', { since, format })
      core.setOutput('world_state', format === 'json' && json ? JSON.stringify(json) : text)
    } else if (endpoint === 'world') {
      const { text, json } = await sfFetch('/api/agent/world', { format })
      core.setOutput('world_state', format === 'json' && json ? JSON.stringify(json) : text)
      if (format === 'json' && json?.index) {
        setIndexOutputs(json.index)
        uncertaintyForThreshold =
          typeof json.index.uncertainty === 'number' ? json.index.uncertainty : null
      }
    } else {
      throw new Error(`Unknown endpoint: ${endpoint}. Use 'world', 'index', or 'delta'.`)
    }

    if (thresholdRaw) {
      const threshold = parseInt(thresholdRaw, 10)
      if (Number.isNaN(threshold)) {
        throw new Error(`Invalid threshold: '${thresholdRaw}' (expected integer 0-100)`)
      }
      if (uncertaintyForThreshold != null && uncertaintyForThreshold > threshold) {
        core.setFailed(
          `Uncertainty ${uncertaintyForThreshold} exceeds threshold ${threshold} — failing the workflow`,
        )
        return
      }
      if (uncertaintyForThreshold == null) {
        core.warning(
          `threshold was set but no uncertainty was returned for endpoint='${endpoint}' format='${format}'. Use endpoint='index' or endpoint='world' with format='json' to enable threshold gating.`,
        )
      }
    }

    core.info(`World state fetched (endpoint=${endpoint}, format=${format})`)
  } catch (err: any) {
    core.setFailed(err?.message ?? String(err))
  }
}

// Auto-run only when invoked directly (not when imported by tests).
const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  /index\.(c?js|mjs)$/.test(process.argv[1] ?? '')
if (isMain) run()
