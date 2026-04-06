# world-state-action

GitHub Action that injects real-time prediction market world state into your CI/CD workflows.

## Usage

### Add world context to PR summary
```yaml
- uses: spfunctions/world-state-action@main
  id: world
- run: echo "${{ steps.world.outputs.world_state }}" >> $GITHUB_STEP_SUMMARY
```

### Gate deployment on uncertainty
```yaml
- uses: spfunctions/world-state-action@main
  with:
    endpoint: index
    threshold: 80  # Fails if uncertainty > 80
```

### Get uncertainty index
```yaml
- uses: spfunctions/world-state-action@main
  id: idx
  with:
    endpoint: index
- run: echo "Uncertainty is ${{ steps.idx.outputs.uncertainty }}/100"
```

## Inputs
| Input | Default | Description |
|-------|---------|-------------|
| `endpoint` | `world` | `world`, `index`, or `delta` |
| `format` | `markdown` | `json` or `markdown` |
| `since` | `1h` | For delta: `1h`, `6h`, `24h` |
| `threshold` | - | Fail if uncertainty exceeds this |

## Outputs
| Output | Description |
|--------|-------------|
| `world_state` | The world state data |
| `uncertainty` | Uncertainty index (0-100) |
| `geopolitical` | Geopolitical risk (0-100) |
| `momentum` | Momentum (-1 to +1) |

## License
MIT — [SimpleFunctions](https://simplefunctions.dev)
