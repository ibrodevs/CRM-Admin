import assert from 'node:assert/strict';
import test from 'node:test';
import { preferencesFromForm, preferencesToForm, formatProfileDate } from '../src/shared/preferences/preferences.js';
import { serviceAccessFromUi, serviceAccessToUi } from '../src/modules/settings/service-access.js';

test('profile preferences map backend values in both directions', () => {
  const value = {theme:'system',date_format:'YYYY-MM-DD',time_format:'12h',base_currency:'KGS',language:'ky',page_size:50,start_page:'orders'};
  assert.deepEqual(preferencesFromForm(preferencesToForm(value)), value);
  assert.equal(preferencesToForm({}).timeFmt, '24 часа');
  assert.equal(formatProfileDate('2026-09-07T12:00:00Z', {date_format:'MM/DD/YYYY'}), '09/07/2026');
});
test('disabling every service cannot serialize as unrestricted access', () => {
  const rows = serviceAccessFromUi({fullAccess:false,kinds:{}});
  assert.ok(rows.length > 0);
  assert.ok(rows.every((row) => row.allowed_actions.length === 0));
  assert.equal(serviceAccessToUi(rows).fullAccess, false);
  assert.deepEqual(serviceAccessFromUi({fullAccess:true,kinds:{}}), []);
});
test('hotel transfer visa and document actions round-trip without losing rights', () => {
  const rows = [{service_kind:'hotel',allowed_actions:['cancel','correct_document','send_document']},{service_kind:'transfer',allowed_actions:['book']},{service_kind:'visa',allowed_actions:['view']},{service_kind:'bus',allowed_actions:['search']}];
  const result = serviceAccessFromUi(serviceAccessToUi(rows),rows);
  for (const row of rows) assert.deepEqual(result.find((item) => item.service_kind === row.service_kind),row);
});
