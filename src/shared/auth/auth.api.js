import { apiPath, apiRequest } from '../api/client.js';

export const authApi = {
  security: () => apiRequest(apiPath('auth/security/'), { handlesUnauthorized: true }),
  updateSecurity: (body) => apiRequest(apiPath('auth/security/'), { method: 'PATCH', body }),
  activity: () => apiRequest(apiPath('auth/activity/'), { method: 'POST', idempotent: false }),
  lock: () => apiRequest(apiPath('auth/lock/'), { method: 'POST', idempotent: false }),
  unlock: (pin) => apiRequest(apiPath('auth/unlock/'), { method: 'POST', body: { pin }, idempotent: false, handlesUnauthorized: true }),
  session: (signal) => apiRequest('/api/session', { signal, handlesUnauthorized: true }),
  login: (login, password) => apiRequest('/api/session/login', {
    method: 'POST', body: { login, password }, idempotent: false, handlesUnauthorized: true,
  }),
  verifyTwoFactor: (challengeToken, code) => apiRequest('/api/session/2fa', {
    method: 'POST', body: { challenge_token: challengeToken, code }, idempotent: false, handlesUnauthorized: true,
  }),
  logout: () => apiRequest('/api/session', { method: 'DELETE', idempotent: false, handlesUnauthorized: true }),
  requestPasswordReset: (email) => apiRequest('/api/session/password-reset', {
    method: 'POST', body: { email }, idempotent: false,
  }),
  confirmPasswordReset: (token, newPassword) => apiRequest('/api/session/password-reset', { method: 'POST', body: { token, new_password: newPassword }, idempotent: false, handlesUnauthorized: true }),
  requestDemoAccess: (body) => apiRequest(apiPath('public/demo-access/'), {
    method: 'POST', body, idempotent: false,
  }),
};
