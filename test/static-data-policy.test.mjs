import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function source(path) {
  return readFile(join(root, path), 'utf8');
}

test('production data module clears demo business arrays unless demo mode is enabled', async () => {
  const data = await source('js/data.jsx');
  const avia = await source('js/data/avia.jsx');
  const services = await source('js/data/services.jsx');
  assert.match(data, /NEXT_PUBLIC_DEMO_MODE\s*===\s*'true'/);
  assert.match(data, /items\.splice\(0,\s*items\.length\)/);
  assert.match(data, /Object\.keys\(COMPANY_STAFF\)\.forEach/);
  assert.match(avia, /\[FLIGHT_OFFERS,\s*AIR_SERVICES,\s*AIR_STATS\]/);
  assert.match(services, /Object\.keys\(SVC_DATA\)\.forEach/);
  assert.match(services, /HOTELS\.splice\(0,\s*HOTELS\.length\)/);
});

test('page-level demo seeds are disabled outside demo mode', async () => {
  const dashboard = await source('js/page_dashboard.jsx');
  const groups = await source('js/page_groups.jsx');
  const extras = await source('js/order_extras.jsx');
  assert.match(dashboard, /SUPPLIER_STATS\.splice\(0,\s*SUPPLIER_STATS\.length\)/);
  assert.match(dashboard, /SUPPLIER_ERRORS\.splice\(0,\s*SUPPLIER_ERRORS\.length\)/);
  assert.match(groups, /GROUP_ORDERS\.splice\(0,\s*GROUP_ORDERS\.length\)/);
  assert.match(extras, /Object\.keys\(ORG_REGISTRY\)\.forEach/);
});

test('legacy current user is synced from authenticated backend user', async () => {
  const sync = await source('js/core/backend-data-sync.js');
  const auth = await source('js/core/auth-context.jsx');
  assert.match(sync, /export function syncLegacyCurrentUser/);
  assert.match(sync, /Object\.assign\(CURRENT_USER/);
  assert.match(sync, /window\.CURRENT_USER = CURRENT_USER/);
  assert.match(auth, /syncLegacyCurrentUser\(uiUser\)/);
});

test('authenticated user adapter does not fall back to a hardcoded employee avatar', async () => {
  const adapters = await source('js/api/adapters.js');
  assert.doesNotMatch(adapters, /avatar-aisuluu\.png/);
});

test('flight attachment drawer does not provide demo company fallbacks', async () => {
  const flights = await source('js/page_flights.jsx');
  assert.doesNotMatch(flights, /ОсОО «Гранд лимитед»/);
  assert.doesNotMatch(flights, /ОсОО «Asia Travel»/);
  assert.doesNotMatch(flights, /ИП Мамажанов/);
  assert.match(flights, /companyOptions = \[\]/);
});

test('supplier cards do not synthesize business credentials or metrics', async () => {
  const suppliers = await source('js/page_suppliers.jsx');
  assert.doesNotMatch(suppliers, /https:\/\/api\.'/);
  assert.doesNotMatch(suppliers, /sk_'\s*\+/);
  assert.doesNotMatch(suppliers, /tok_'\s*\+/);
  assert.doesNotMatch(suppliers, /Меркель Александр/);
  assert.doesNotMatch(suppliers, /Договор оферты/);
  assert.doesNotMatch(suppliers, /ДС №2/);
  assert.doesNotMatch(suppliers, /ул\. Киевская 124/);
  assert.doesNotMatch(suppliers, /MiniLineChart/);
  assert.doesNotMatch(suppliers, /ОсОО по ИНН/);
});

test('client previews are not rendered as inert clickable anchors', async () => {
  const services = await source('js/page_services.jsx');
  assert.doesNotMatch(services, /href="#"/);
  assert.doesNotMatch(services, /onClick=\{\(e\) => e\.preventDefault\(\)\}/);
});

test('manual import and document drawers avoid fake generated people or parser data', async () => {
  const extras = await source('js/order_extras.jsx');
  const policy = await source('js/travel_policy.jsx');
  assert.doesNotMatch(extras, /Меркель Александр/);
  assert.doesNotMatch(extras, /До окончания срока: 3 месяца/);
  assert.doesNotMatch(policy, /Импортов Импорт/);
  assert.doesNotMatch(policy, /document_upload_placeholder/);
});
