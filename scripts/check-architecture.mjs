import assert from 'node:assert/strict';
import fs from 'node:fs';
import { architectureViolations, dependencyCycles, dependencyGraph } from './lib/architecture.mjs';

const { edges, unresolved } = dependencyGraph();
const debt = JSON.parse(fs.readFileSync(new URL('../test/fixtures/architecture-debt.json', import.meta.url), 'utf8'));
const knownLegacy = new Set(debt.legacyEdges.map((edge) => edge.join(' -> ')));
const knownCycles = new Set(debt.cycleEdges.map((edge) => edge.join(' -> ')));
const cycles = dependencyCycles(edges);
const legacy = edges.filter(([from, to]) => !from.startsWith('src/legacy/') && to.startsWith('src/legacy/'));
const newCycles = edges.filter(([from, to]) => cycles.some((group) => group.includes(from) && group.includes(to)))
  .filter((edge) => !knownCycles.has(edge.join(' -> ')));
assert.deepEqual(unresolved, [], 'Every relative import must resolve');
assert.deepEqual(architectureViolations(edges), [], 'Layer boundaries and public APIs must be respected');
assert.deepEqual(legacy.filter((edge) => !knownLegacy.has(edge.join(' -> '))), [], 'Do not add new legacy dependencies');
assert.deepEqual(newCycles, [], 'Do not introduce new cyclic dependencies');
console.log(`Architecture verified: ${edges.length} imports; ${legacy.length} documented legacy edges; ${cycles.length} retained cycles.`);
