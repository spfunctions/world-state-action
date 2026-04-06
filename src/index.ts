import * as core from '@actions/core';
import type { ActionInputs, WorldState, UncertaintyIndex, WorldDelta } from './types.js';

const BASE_URL = 'https://simplefunctions.dev';
const TIMEOUT_MS = 15_000;

// ── Fetch helper ─────────────────────────────────────────────────────────────

async function sfFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`SF API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

async function sfFetchText(path: string, params?: Record<string, string>): Promise<string> {
  const url = new URL(path, BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== '') url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`SF API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ── Input parsing ────────────────────────────────────────────────────────────

function getInputs(): ActionInputs {
  const format = core.getInput('format') || 'markdown';
  const endpoint = core.getInput('endpoint') || 'world';
  const since = core.getInput('since') || '1h';
  const thresholdRaw = core.getInput('threshold');

  if (format !== 'json' && format !== 'markdown') {
    throw new Error(`Invalid format "${format}". Must be "json" or "markdown".`);
  }
  if (endpoint !== 'world' && endpoint !== 'index' && endpoint !== 'delta') {
    throw new Error(`Invalid endpoint "${endpoint}". Must be "world", "index", or "delta".`);
  }

  let threshold: number | undefined;
  if (thresholdRaw) {
    threshold = Number(thresholdRaw);
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      throw new Error(`Invalid threshold "${thresholdRaw}". Must be 0-100.`);
    }
  }

  return { format, endpoint, since, threshold };
}

// ── Endpoint handlers ────────────────────────────────────────────────────────

async function handleWorld(inputs: ActionInputs): Promise<void> {
  core.info(`Fetching world state (format=${inputs.format})...`);

  if (inputs.format === 'markdown') {
    const md = await sfFetchText('/api/agent/world', { format: 'markdown' });
    core.setOutput('world_state', md);
  } else {
    const data = await sfFetch<WorldState>('/api/agent/world', { format: 'json' });
    core.setOutput('world_state', JSON.stringify(data));

    // Also extract index values from the world state
    if (data.index) {
      core.setOutput('uncertainty', String(data.index.uncertainty));
      core.setOutput('geopolitical', String(data.index.geopolitical));
      core.setOutput('momentum', String(data.index.momentum));
    }
  }

  // Always fetch the index to populate output values
  await fetchAndSetIndex(inputs.threshold);
}

async function handleIndex(inputs: ActionInputs): Promise<void> {
  core.info('Fetching uncertainty index...');
  const data = await sfFetch<UncertaintyIndex>('/api/public/index');

  core.setOutput('world_state', JSON.stringify(data));
  core.setOutput('uncertainty', String(data.uncertainty));
  core.setOutput('geopolitical', String(data.geopolitical));
  core.setOutput('momentum', String(data.momentum));

  core.info(`Uncertainty: ${data.uncertainty}/100 | Geopolitical: ${data.geopolitical}/100 | Momentum: ${data.momentum}`);

  // Gate check
  if (inputs.threshold !== undefined && data.uncertainty > inputs.threshold) {
    core.setFailed(
      `Uncertainty ${data.uncertainty} exceeds threshold ${inputs.threshold}. ` +
      `Deployment gate blocked.`
    );
  }
}

async function handleDelta(inputs: ActionInputs): Promise<void> {
  core.info(`Fetching delta (since=${inputs.since}, format=${inputs.format})...`);

  if (inputs.format === 'markdown') {
    const md = await sfFetchText('/api/agent/world/delta', {
      since: inputs.since,
      format: 'markdown',
    });
    core.setOutput('world_state', md);
  } else {
    const data = await sfFetch<WorldDelta>('/api/agent/world/delta', {
      since: inputs.since,
      format: 'json',
    });
    core.setOutput('world_state', JSON.stringify(data));
  }

  // Also fetch index for the output values
  await fetchAndSetIndex(inputs.threshold);
}

// ── Shared: fetch index and set outputs ──────────────────────────────────────

async function fetchAndSetIndex(threshold?: number): Promise<void> {
  try {
    const idx = await sfFetch<UncertaintyIndex>('/api/public/index');
    core.setOutput('uncertainty', String(idx.uncertainty));
    core.setOutput('geopolitical', String(idx.geopolitical));
    core.setOutput('momentum', String(idx.momentum));

    core.info(`SF Index: uncertainty=${idx.uncertainty}, geopolitical=${idx.geopolitical}, momentum=${idx.momentum}`);

    if (threshold !== undefined && idx.uncertainty > threshold) {
      core.setFailed(
        `Uncertainty ${idx.uncertainty} exceeds threshold ${threshold}. ` +
        `Deployment gate blocked.`
      );
    }
  } catch (err) {
    core.warning(`Could not fetch SF Index: ${err instanceof Error ? err.message : err}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    switch (inputs.endpoint) {
      case 'world':
        await handleWorld(inputs);
        break;
      case 'index':
        await handleIndex(inputs);
        break;
      case 'delta':
        await handleDelta(inputs);
        break;
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();
