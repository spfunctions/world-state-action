# SimpleFunctions World State Action

[![GitHub Action](https://img.shields.io/badge/GitHub%20Action-world--state-green?logo=github)](https://github.com/spfunctions/world-state-action)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Inject real-time prediction market world state into your GitHub Actions workflows. Probabilities from 9,706 markets (Kalshi + Polymarket), updated every 15 minutes. No API key required.

## Quick Start

```yaml
- uses: spfunctions/world-state-action@v1
  id: world
- run: echo "${{ steps.world.outputs.world_state }}" >> $GITHUB_STEP_SUMMARY
```

## Usage Examples

### Add world context to PR descriptions

```yaml
name: PR Context
on: [pull_request]

jobs:
  context:
    runs-on: ubuntu-latest
    steps:
      - uses: spfunctions/world-state-action@v1
        id: world

      - run: echo "${{ steps.world.outputs.world_state }}" >> $GITHUB_STEP_SUMMARY
```

### Gate deployments on uncertainty

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: spfunctions/world-state-action@v1
        with:
          endpoint: index
          threshold: 80  # Fail if uncertainty > 80

      - name: Deploy (only runs if uncertainty is below threshold)
        run: ./deploy.sh
```

### Daily summary issue

```yaml
name: Daily Market Brief
on:
  schedule:
    - cron: '0 9 * * *'  # 9am UTC daily

jobs:
  briefing:
    runs-on: ubuntu-latest
    steps:
      - uses: spfunctions/world-state-action@v1
        id: world
        with:
          format: markdown

      - uses: peter-evans/create-issue-from-file@v4
        with:
          title: "Daily Market Brief"
          content: ${{ steps.world.outputs.world_state }}
```

### Track changes over time

```yaml
- uses: spfunctions/world-state-action@v1
  id: delta
  with:
    endpoint: delta
    since: 24h
    format: json

- run: echo '${{ steps.delta.outputs.world_state }}' | jq '.changes[]'
```

### JSON output for parsing

```yaml
- uses: spfunctions/world-state-action@v1
  id: world
  with:
    format: json

- run: echo '${{ steps.world.outputs.world_state }}' | jq '.index'
```

### Post to Slack on high uncertainty

```yaml
name: Uncertainty Alert
on:
  schedule:
    - cron: '*/30 * * * *'  # Every 30 minutes

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: spfunctions/world-state-action@v1
        id: world
        with:
          endpoint: index

      - name: Alert if uncertainty > 75
        if: steps.world.outputs.uncertainty > 75
        uses: slackapi/slack-github-action@v2
        with:
          payload: |
            {"text": "Uncertainty alert: ${{ steps.world.outputs.uncertainty }}/100\nGeopolitical: ${{ steps.world.outputs.geopolitical }}/100\nMomentum: ${{ steps.world.outputs.momentum }}"}
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `format` | Output format: `json` or `markdown` | `markdown` |
| `endpoint` | Which endpoint: `world`, `index`, or `delta` | `world` |
| `since` | For delta endpoint: time window (`1h`, `6h`, `24h`) | `1h` |
| `threshold` | Uncertainty threshold for gate mode (0-100). Action fails if exceeded. | _(none)_ |

## Outputs

| Output | Description |
|--------|-------------|
| `world_state` | Full world state content (~800 tokens markdown, or JSON) |
| `uncertainty` | SF Index: uncertainty score (0-100) |
| `geopolitical` | SF Index: geopolitical risk score (0-100) |
| `momentum` | SF Index: directional momentum (-1 to +1) |

## Endpoints

| Endpoint | API Path | Description |
|----------|----------|-------------|
| `world` | `/api/agent/world` | Full calibrated world state from prediction markets |
| `index` | `/api/public/index` | SF Prediction Market Index (four numbers) |
| `delta` | `/api/agent/world/delta` | Incremental changes since a given time |

## How it works

This action calls the [SimpleFunctions](https://simplefunctions.dev) public API to fetch real-time prediction market data. No API key required. Data is derived from 9,706 active markets on Kalshi and Polymarket, updated every 15 minutes.

The **uncertainty index** (0-100) is computed from orderbook spread distributions across all tracked markets. High values mean markets disagree -- more uncertainty. The **geopolitical** score tracks price velocity in geo-related markets. **Momentum** (-1 to +1) captures directional bias across all markets.

## License

MIT

---

**Part of [SimpleFunctions](https://simplefunctions.dev)** -- context flow for prediction markets.

- [npm package](https://github.com/spfunctions/prediction-market-context) -- `prediction-market-context` for Node.js/TypeScript
- [Awesome Prediction Markets](https://github.com/spfunctions/awesome-prediction-markets) -- curated list for developers
- [CLI](https://github.com/spfunctions/simplefunctions-cli) -- 43 commands for prediction market intelligence
- [MCP Server](https://simplefunctions.dev/api/mcp/mcp) -- connect any LLM to prediction markets
