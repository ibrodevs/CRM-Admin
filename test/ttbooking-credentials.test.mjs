import assert from 'node:assert/strict';
import test from 'node:test';
import { TTBOOKING_DEFAULTS, ttbookingCredential, publicSupplierApi } from '../src/modules/suppliers/model/ttbooking.js';

test('TT Booking is assigned to this supplier with explicit environment and secret', () => {
  const config = { ...TTBOOKING_DEFAULTS, agency: '42', user: '7', password_key: 'secret' };
  const credential = ttbookingCredential(config);
  assert.equal(credential.provider_adapter, 'ttbooking');
  assert.equal(credential.environment, 'sandbox');
  assert.deepEqual(credential.secrets, { url: TTBOOKING_DEFAULTS.url, agency: '42', user: '7', password_key: 'secret', locale: 'ru' });
});

test('ordinary supplier settings exclude credentials and passenger data', () => {
  const config = { ...TTBOOKING_DEFAULTS, agency: '42', user: '7', password_key: 'secret', password: 'another', token: 'token', phone: 'phone' };
  assert.deepEqual(publicSupplierApi(config), { url: TTBOOKING_DEFAULTS.url, version: '' });
});

test('blank secret is omitted during rotation so backend can retain it', () => {
  const credential = ttbookingCredential({ ...TTBOOKING_DEFAULTS, agency: '42', user: '7', environment: 'production' });
  assert.equal(credential.environment, 'production');
  assert.equal(Object.hasOwn(credential.secrets, 'password_key'), false);
});
