import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { root } from '../scripts/lib/architecture.mjs';
import { ROUTE_RESOURCE } from '../src/application/routing/routes.js';
const require = createRequire(import.meta.url);
const postcss = require('postcss');

test('architecture respects layers, public APIs and the finite compatibility budget', () => {
  execFileSync(process.execPath, ['scripts/check-architecture.mjs'], { cwd: root, stdio: 'pipe' });
  assert.equal(fs.existsSync(path.join(root, 'js')), false);
});

test('route permissions and resource gates cover the existing sections', () => {
  assert.deepEqual(ROUTE_RESOURCE, {
    dashboard: 'dashboard', calendar: 'calendar', orders: 'orders', suppliers: 'suppliers',
    chats: 'chats', finance: 'finance', documents: 'documents', receipts: 'documents',
    fulfillment: 'documents', settings: 'users', clients: 'clients', companies: 'companies',
    offers: 'proposals', notifications: 'notifications', returns: 'returns', services: 'orderServices',
    flights: 'orderServices', rail: 'orderServices', hotels: 'orderServices', transfers: 'orderServices',
    buses: 'orderServices', tours: 'orderServices',
  });
  const renderer = fs.readFileSync(path.join(root, 'src/application/routing/RouteRenderer.jsx'), 'utf8');
  for (const route of [...Object.keys(ROUTE_RESOURCE), 'profile', 'account']) {
    assert.ok(renderer.includes(`route === '${route}'`), route);
  }
  const entry = fs.readFileSync(path.join(root, 'app/page.jsx'), 'utf8');
  assert.match(entry, /dynamic\(\(\) => import\('\.\.\/src\/application\/CRMApp'\), \{ ssr: false \}\)/);
});

test('stylesheet fragments parse independently and preserve their cascade order', () => {
  const globals = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8');
  assert.deepEqual([...globals.matchAll(/@import '([^']+)';/g)].map((match) => match[1]), [
    '../src/styles/tokens.css', '../src/styles/base.css', '../src/styles/layout.css', '../src/styles/components.css',
  ]);
  const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file.endsWith('.css') ? [file] : [];
  });
  for (const file of walk(path.join(root, 'src/styles'))) postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  const layout = fs.readFileSync(path.join(root, 'app/layout.jsx'), 'utf8');
  assert.deepEqual([...layout.matchAll(/import '([^']+\.css)';/g)].map((match) => match[1]), [
    './globals.css', '../src/styles/modules/receipt-ui-fixes.css', '../src/styles/modules/receipt-workflow.css',
    '../src/styles/components/location-autocomplete.css', '../src/styles/components/compact-steppers.css', '../src/styles/preferences.css',
  ]);
});
