# SimpleFunctions World State Action

Inject real-time prediction market world state into your GitHub Actions workflows. Probabilities from 9,706 markets (Kalshi + Polymarket), updated every 15 minutes. No API key required.

## Usage

```yaml
- name: Get world state
  id: world
  uses: spfunctions/world-state-action@v1

- name: Print world state
  run: echo "${{ steps.world.outputs.world_state }}"

- name: Check geopolitical risk
  run: |
    if [ "${{ steps.world.outputs.geopolitical }}" -gt 80 ]; then
      echo "::warning::Geopolitical risk is elevated: ${{ steps.world.outputs.geopolitical }}/100"
    fi
```

### Focus on specific topics

```yaml
- uses: spfunctions/world-state-action@v1
  with:
    focus: "energy,economy"
```

### Get incremental updates (for cron jobs)

```yaml
- uses: spfunctions/world-state-action@v1
  with:
    delta: "24h"
```

### JSON output for parsing

```yaml
- uses: spfunctions/world-state-action@v1
  id: world
  with:
    format: json

- name: Parse
  run: echo '${{ steps.world.outputs.world_state }}' | jq '.topics[0]'
```

### Daily briefing cron

```yaml
name: Daily World Briefing
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
          focus: "economy,energy,geopolitics"

      - name: Post to Slack
        uses: slackapi/slack-github-action@v2
        with:
          payload: |
            {"text": "Morning Briefing\nUncertainty: ${{ steps.world.outputs.uncertainty }}/100\nGeo Risk: ${{ steps.world.outputs.geopolitical }}/100\n\n${{ steps.world.outputs.world_state }}"}
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `focus` | Topics: geopolitics, economy, energy, elections, crypto, tech | All |
| `format` | `markdown` or `json` | `markdown` |
| `delta` | Incremental: `1h`, `6h`, `24h` (empty = full state) | Full |

## Outputs

| Output | Description |
|--------|-------------|
| `world_state` | Full world state content (~800 tokens markdown or JSON) |
| `uncertainty` | SF Index: uncertainty score (0-100) |
| `geopolitical` | SF Index: geopolitical risk score (0-100) |
| `momentum` | SF Index: directional momentum (-1 to +1) |

## How it works

This action calls the [SimpleFunctions](https://simplefunctions.dev) public API:
- `/api/agent/world` — calibrated world state from prediction markets
- `/api/public/index` — SF Prediction Market Index

No API key needed. Data updated every 15 minutes from Kalshi + Polymarket.

## License

MIT

---

**Part of [SimpleFunctions](https://simplefunctions.dev)** — context flow for prediction markets.

- [Awesome Prediction Markets](https://github.com/spfunctions/awesome-prediction-markets) — curated list for developers
- [CLI](https://github.com/spfunctions/simplefunctions-cli) — 43 commands for prediction market intelligence
- [MCP Server](https://simplefunctions.dev/api/mcp/mcp) — connect any LLM to prediction markets
