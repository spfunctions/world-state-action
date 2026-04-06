import * as core from '@actions/core'

const BASE = 'https://simplefunctions.dev'

async function run() {
  try {
    const endpoint = core.getInput('endpoint') || 'world'
    const format = core.getInput('format') || 'markdown'
    const since = core.getInput('since') || '1h'
    const threshold = core.getInput('threshold')

    let data: any
    if (endpoint === 'index') {
      const res = await fetch(`${BASE}/api/public/index`)
      data = await res.json()
      core.setOutput('uncertainty', String(data.uncertainty))
      core.setOutput('geopolitical', String(data.geopolitical))
      core.setOutput('momentum', String(data.momentum))
      core.setOutput('world_state', JSON.stringify(data))
    } else if (endpoint === 'delta') {
      const res = await fetch(`${BASE}/api/agent/world/delta?since=${since}&format=${format}`)
      data = format === 'json' ? await res.json() : await res.text()
      core.setOutput('world_state', typeof data === 'string' ? data : JSON.stringify(data))
    } else {
      const res = await fetch(`${BASE}/api/agent/world?format=${format}`)
      data = format === 'json' ? await res.json() : await res.text()
      core.setOutput('world_state', typeof data === 'string' ? data : JSON.stringify(data))
      if (format === 'json' && data.index) {
        core.setOutput('uncertainty', String(data.index.uncertainty))
        core.setOutput('geopolitical', String(data.index.geopolitical))
        core.setOutput('momentum', String(data.index.momentum))
      }
    }

    if (threshold) {
      const u = endpoint === 'index' ? data.uncertainty : data?.index?.uncertainty
      if (u != null && u > parseInt(threshold)) {
        core.setFailed(`Uncertainty ${u} exceeds threshold ${threshold}`)
      }
    }

    core.info(`World state fetched (${endpoint}, ${format})`)
  } catch (err: any) {
    core.setFailed(err.message)
  }
}
run()
