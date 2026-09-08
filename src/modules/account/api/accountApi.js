import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const accountApi = {
  statistics: (params, signal) => list('me/statistics/', params, signal),
  me: (signal) => get('me/', signal),
  uploadAvatar: (file) => { const body = new FormData(); body.append('avatar', file); return apiRequest(apiPath('me/avatar/'), { method: 'PUT', body }); },
  removeAvatar: () => remove('me/avatar/'),
  updateMe: (body) => patch('me/', body),
  preferences: (signal) => get('me/preferences/', signal),
  updatePreferences: (body) => patch('me/preferences/', body),
  changePassword: (currentPassword, newPassword) => create('auth/password/change/', {
    current_password: currentPassword, new_password: newPassword,
  }, { idempotent: false }),
  twoFactorStatus: (signal) => get('auth/2fa/status/', signal),
  twoFactorSetup: () => create('auth/2fa/setup/', {}, { idempotent: false }),
  twoFactorConfirm: (code) => create('auth/2fa/confirm/', { code }, { idempotent: false }),
  twoFactorDisable: (currentPassword, code) => create('auth/2fa/disable/', {
    current_password: currentPassword, code,
  }, { idempotent: false }),
  sessions: (signal) => get('auth/sessions/', signal),
  revokeSession: (id) => remove(`auth/sessions/${id}/`),
  logoutAll: () => create('auth/logout-all/', {}, { idempotent: false }),
};
