import { apiPath, apiRequest } from './client';

export const authApi = {
  session: (signal) => apiRequest('/api/session', { signal }),
  login: (login, password) => apiRequest('/api/session/login', {
    method: 'POST', body: { login, password }, idempotent: false,
  }),
  verifyTwoFactor: (challengeToken, code) => apiRequest('/api/session/2fa', {
    method: 'POST', body: { challenge_token: challengeToken, code }, idempotent: false,
  }),
  logout: () => apiRequest('/api/session', { method: 'DELETE', idempotent: false }),
  requestPasswordReset: (email) => apiRequest('/api/session/password-reset', {
    method: 'POST', body: { email }, idempotent: false,
  }),
  requestDemoAccess: (body) => apiRequest(apiPath('public/demo-access/'), {
    method: 'POST', body, idempotent: false,
  }),
};
