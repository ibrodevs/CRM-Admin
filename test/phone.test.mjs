import test from 'node:test';
import assert from 'node:assert/strict';
import { phoneValue, phoneDisplay, phoneCountry, changePhoneCountry, isPhoneInput, PHONE_COUNTRIES } from '../src/shared/lib/phone.js';

test('phone fields support countries, preserve canonical numbers and distinguish the shared +7 plan', () => {
  assert.ok(PHONE_COUNTRIES.length > 200);
  assert.equal(phoneValue('+7 (900) 111-22-33'), '+79001112233');
  assert.equal(phoneValue('8 (900) 111-22-33', 'RU'), '+79001112233');
  assert.equal(phoneValue('+996 700 123 456'), '+996700123456');
  assert.equal(phoneCountry('+996700123456'), 'KG');
  assert.equal(phoneCountry('+77011234567'), 'KZ');
  assert.equal(phoneCountry('+79001112233'), 'RU');
  assert.equal(phoneCountry('+7', 'KZ'), 'KZ');
  assert.equal(changePhoneCountry('+79001112233', 'RU', 'KG'), '+9969001112233');
  assert.equal(phoneDisplay('+79001112233'), '+7 900 111 22 33');
  assert.equal(phoneValue(''), '');
});
test('shared input recognizes phone forms while excluding extensions, passwords and location searches', () => {
  for (const props of [{ type: 'tel' }, { 'aria-label': 'Рабочий телефон' }, { leadIcon: 'phone' }, { 'aria-label': 'Телефон WhatsApp' }]) assert.equal(isPhoneInput(props), true);
  for (const props of [{ 'aria-label': 'Внутренний номер' }, { 'aria-label': 'Добавочный телефон' }, { 'aria-label': 'Пароль' }, { placeholder: 'Город' }, { type: 'search', 'aria-label': 'Телефон' }, { placeholder: 'Email или телефон' }, { leadIcon: 'phone', phoneInput: false }]) assert.equal(isPhoneInput(props), false);
});
