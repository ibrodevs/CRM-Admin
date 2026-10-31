import test from 'node:test';
import assert from 'node:assert/strict';
import { providerDefaults, providerSecrets, publicProviderSettings } from '../src/modules/suppliers/model/provider-setup.js';
import { hotelProviderCriteria } from '../src/modules/services/hotels/search-criteria.js';
const provider = { key: 'ttbooking', fields: [{ key: 'url', label: 'URL', required: true, default: 'https://dev.ttbooking.ru/api/scbs/json' }, { key: 'password_key', label: 'Key', required: true, secret: true }, { key: 'status_map', label: 'Statuses', kind: 'json' }] };
test('supplier setup requires explicit provider and required credentials', () => {
  assert.throws(() => providerSecrets(null, {}), /Выберите/);
  assert.throws(() => providerSecrets(provider, providerDefaults(provider)), /Key/);
});
test('supplier credentials serialize only catalog fields and parse JSON', () => {
  const result = providerSecrets(provider, { ...providerDefaults(provider), password_key: 'fixture-secret', status_map: '{"1":"booked"}', arbitrary: 'ignored' });
  assert.deepEqual(result.status_map, { '1': 'booked' });
  assert.equal(result.password_key, 'fixture-secret');
  assert.equal(result.arbitrary, undefined);
});
test('supplier setup rejects invalid contract JSON', () => {
  for (const status_map of ['broken', '[]', 'null', '"string"']) assert.throws(() => providerSecrets(provider, { url: 'https://example.invalid', password_key: 'fixture', status_map }));
});
test('public supplier settings never contain credential keys or passwords', () => {
  const result = publicProviderSettings(provider, 'sandbox', { url: 'https://example.invalid', password_key: 'fixture-secret', login: 'private-login', status_map: { '1': 'booked' } });
  assert.equal(result.provider_adapter, 'ttbooking');
  assert.equal(result.environment, 'sandbox');
  assert.equal(JSON.stringify(result).includes('fixture-secret'), false);
  assert.equal(JSON.stringify(result).includes('private-login'), false);
});
test('ETG region ID remains scoped to its provider and supplier', () => {
  assert.deepEqual(hotelProviderCriteria({ source: 'ostrovok', supplier_id: 'supplier-etg', city_code: 100, value: 'Москва' }, 'Москва'), { ostrovok: { region_id: '100' }, provider_selection: { provider_adapter: 'ostrovok', supplier_id: 'supplier-etg' } });
  assert.deepEqual(hotelProviderCriteria({ source: 'ostrovok', supplier_id: 'supplier-etg', city_code: 100, value: 'Москва' }, 'Казань'), {});
});
test('iway criteria keeps local pickup time and exact coordinates', async () => {
  const { transferProviderCriteria } = await import('../src/modules/services/free-booking-search.js');
  assert.deepEqual(transferProviderCriteria({ dt: new Date(2027, 2, 10), pickup_clock: '12:30', from: 'Address A', to: 'Address B', start_point: '42.8,74.6', finish_point: '43.0,74.5', flight_number: 'TK347' }), { additional_service_types: [], text_tablet: undefined, origin_address: 'Address A', destination_address: 'Address B', start_place_point: '42.8,74.6', finish_place_point: '43.0,74.5', pickup_time: '2027-03-10 12:30', departure_time: undefined, flight_number: 'TK347', train_number: undefined });
});
test('configured credentials are not presented as verified connectivity', async () => {
  const { providerConnectionState } = await import('../src/modules/suppliers/model/provider-setup.js');
  assert.equal(providerConnectionState({ status: 'configured' }).status, 'configured');
  assert.equal(providerConnectionState({ status: 'configured' }).tone, 'warn');
  assert.equal(providerConnectionState({ status: 'connected' }).status, 'ok');
});
test('iway requested extras travel in search criteria instead of client supplied prices', async () => {
  const { transferProviderCriteria } = await import('../src/modules/services/free-booking-search.js');
  const result = transferProviderCriteria({ additional_service_types: ['booster', 'tollroad'], text_tablet: 'TEST', dt: new Date(2027, 2, 10), pickup_clock: '12:00' });
  assert.deepEqual(result.additional_service_types, ['booster', 'tollroad']);
  assert.equal(result.text_tablet, 'TEST');
  assert.equal(result.price, undefined);
});
