import assert from 'node:assert/strict';
import test from 'node:test';
import { canUseShiftControl } from '../src/modules/workforce/model/shift-access.js';
import { toUiUser } from '../src/shared/auth/user.mapper.js';

test('shift control is available only to the backend operator role', () => {
  for (const role of ['admin', 'operator', 'accountant', 'manager']) {
    assert.equal(canUseShiftControl(toUiUser({ roles: [role] }).role), role === 'operator', role);
  }
  for (const role of [undefined, null, '', 'Админ', 'Руководитель', 'manager', 'Бухгалтер', 'unknown']) {
    assert.equal(canUseShiftControl(role), false);
  }
  assert.equal(canUseShiftControl('operator'), true);
});
