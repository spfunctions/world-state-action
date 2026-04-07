# world-state-action

[![Test](https://github.com/spfunctions/world-state-action/actions/workflows/test.yml/badge.svg)](https://github.com/spfunctions/world-state-action/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

GitHub Action that injects **real-time prediction-market world state** into your
CI/CD workflows. Use it to add market context to PR summaries, gate deployments
on global uncertainty, or alert when geopolitical risk spikes.

```yaml
- uses: spfunctions/world-state-action@v2
  id: world
- run: echo "${{ steps.world.outputs.world_state }}" >> $GITHUB_STEP_SUMMARY
```

---

## Use cases

### 1. Add market context to every PR summary

```yaml
on: pull_request
jobs:
  context:
    runs-on: ubuntu-latest
    steps:
      - uses: spfunctions/world-state-action@v2
        id: world
      - run: |
          {
            echo "## Current world state"
            echo "${{ steps.world.outputs.world_state }}"
          } >> $GITHUB_STEP_SUMMARY
```

### 2. Gate deploys on global uncertainty

Block production deploys when prediction markets are pricing extreme uncertainty
(crisis regime). Set a `threshold` and the action `setFailed`s the workflow if
exceeded:

```yaml
- name: Check market uncertainty
  uses: spfunctions/world-state-action@v2
  with:
    endpoint: index
    threshold: 80      # fail if uncertainty > 80
```

### 3. Read individual signals

```yaml
- uses: spfunctions/world-state-action@v2
  id: idx
  with:
    endpoint: index
- run: |
    echo "Uncertainty:  ${{ steps.idx.outputs.uncertainty }}/100"
    echo "Geopolitical: ${{ steps.idx.outputs.geopolitical }}/100"
    echo "Momentum:     ${{ steps.idx.outputs.momentum }}"
```

### 4. Alert on what changed since the last run

```yaml
- uses: spfunctions/world-state-action@v2
  id: delta
  with:
    endpoint: delta
    since: 6h
- run: |
    cat <<EOF | gh api repos/${{ github.repository }}/issues/123/comments -F body=@-
    Market changes in the last 6h:
    ${{ steps.delta.outputs.world_state }}
    EOF
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `endpoint` | `world` | Which API to call: `world`, `index`, or `delta` |
| `format` | `markdown` | `markdown` (LLM-readable) or `json` (parseable) |
| `since` | `1h` | For `delta`: lookback window (`30m`, `1h`, `6h`, `24h`, or ISO timestamp) |
| `threshold` | — | Fail the workflow if `uncertainty` exceeds this integer (0-100) |

### Endpoint cheatsheet

| `endpoint` | Hits | Sets `world_state` to | Sets index outputs? |
|------------|------|------------------------|---------------------|
| `world` | `/api/agent/world?format={format}` | The full snapshot | only when `format=json` |
| `index` | `/api/public/index` | The four-signal index JSON | yes |
| `delta` | `/api/agent/world/delta?since={since}&format={format}` | Just the change list | no |

## Outputs

| Output | Description | Set when |
|--------|-------------|----------|
| `world_state` | The endpoint's full body (string) | always |
| `uncertainty` | Uncertainty index (0-100) | `endpoint=index` or `endpoint=world` with `format=json` |
| `geopolitical` | Geopolitical risk (0-100) | same as above |
| `momentum` | Momentum (-1 to +1) | same as above |

## Threshold gating

The `threshold` input only works when an `uncertainty` value is available
(`endpoint=index` or `endpoint=world` with `format=json`). If you set
`threshold` with `endpoint=world` and `format=markdown`, the action emits a
`warning` instead of silently passing.

If `uncertainty > threshold`, the action calls `core.setFailed`, which fails
the step (and the job, unless you set `continue-on-error: true`).

## Errors

- Non-integer `threshold` → `setFailed("Invalid threshold: ...")`
- Unknown `endpoint` → `setFailed("Unknown endpoint: ...")`
- Non-2xx from the API → `setFailed("SimpleFunctions API error <status> ...")`
- Network error → `setFailed("<underlying error>")`

## Sister packages

| Need | Package |
|------|---------|
| Use the same data inside an LLM agent | [`agent-world-awareness`](https://github.com/spfunctions/agent-world-awareness), [`prediction-market-context`](https://github.com/spfunctions/prediction-market-context) |
| Just the uncertainty number / regime label | [`prediction-market-uncertainty`](https://github.com/spfunctions/prediction-market-uncertainty), [`prediction-market-regime`](https://github.com/spfunctions/prediction-market-regime) |
| Detect actionable mispricings | [`prediction-market-edge-detector`](https://github.com/spfunctions/prediction-market-edge-detector) |
| MCP / Claude / Cursor | [`simplefunctions-cli`](https://github.com/spfunctions/simplefunctions-cli) |

## Development

```bash
npm install
npm test       # 11 fetch-mocked unit tests
npm run build  # rebuild dist/index.js (committed and used by action.yml)
```

## License

MIT — built by [SimpleFunctions](https://simplefunctions.dev).
