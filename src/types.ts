// ── SF API Response Types ────────────────────────────────────────────────────

export interface WorldIndex {
  uncertainty: number;  // 0-100
  geopolitical: number; // 0-100
  momentum: number;     // -1 to +1
  activity: number;     // 0-100
}

export interface WorldState {
  index: WorldIndex;
  regimeSummary: string;
  traditional: Array<{ symbol: string; price: number; changePct: number }>;
  actionableEdges: Array<{
    title: string;
    ticker: string;
    venue: string;
    marketPrice: number;
    thesisPrice: number;
    edge: number;
    executableEdge: number;
    direction: string;
    spread: number;
    liquidityScore: string;
  }>;
  movers: Array<{
    title: string;
    ticker: string;
    price: number;
    delta: number;
    venue: string;
  }>;
  stableAnchors: Array<{ title: string; ticker: string; price: number }>;
  contagionHighlights: Array<{ trigger: string; lagging: string; gap: number }>;
  divergences: Array<{ description: string; implication?: string }>;
  deltaWindow: string;
  generatedAt: string;
  marketCount?: number;
}

export interface UncertaintyIndex {
  uncertainty: number;
  geopolitical: number;
  momentum: number;
  activity: number;
  components: {
    medianSpread: number;
    avgSpread: number;
    spreadP90: number;
    totalDepth: number;
    tickersTracked: number;
    geoMovers: number;
    geoAvgDelta: number;
    totalChanges24h: number;
    priceUpCount: number;
    priceDownCount: number;
  };
  timestamp: string;
}

export interface WorldDelta {
  from: string;
  to: string;
  changes: string[];
  markdown: string;
  latencyMs?: number;
}

// ── Action Config ────────────────────────────────────────────────────────────

export type Endpoint = 'world' | 'index' | 'delta';
export type Format = 'json' | 'markdown';

export interface ActionInputs {
  format: Format;
  endpoint: Endpoint;
  since: string;
  threshold?: number;
}
