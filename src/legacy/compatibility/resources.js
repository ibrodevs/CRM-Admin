import { apiPath, apiRequest, queryString } from '../../shared/api/client.js';

const list = (path, params, signal) => apiRequest(apiPath(path) + queryString(params), { signal });
const get = (path, signal) => apiRequest(apiPath(path), { signal });
const create = (path, body, options) => apiRequest(apiPath(path), { method: 'POST', body, ...options });
const patch = (path, body) => apiRequest(apiPath(path), { method: 'PATCH', body });
const remove = (path) => apiRequest(apiPath(path), { method: 'DELETE' });

export { jobsApi } from '../../modules/integrations/api.js';

export { crmApi } from './crmApi.js';

export { travelPolicyApi } from '../../modules/companies/api.js';

export { accountApi } from '../../modules/account/api.js';

export { usersApi } from '../../modules/users/api.js';

export { ordersApi } from '../../modules/orders/api.js';

export { suppliersApi } from '../../modules/suppliers/api.js';

export { communicationsApi } from '../../modules/chats/api.js';

export { notificationsApi } from '../../modules/notifications/api.js';

export { integrationsApi } from '../../modules/integrations/api.js';

export { workforceApi } from '../../modules/workforce/api.js';

export { workspaceApi } from './workspaceApi.js';

export { workspaceSettingsApi } from '../../modules/settings/api.js';

export { workspaceActionsApi } from '../../modules/workspace/api.js';

export { proposalsApi } from '../../modules/proposals/api.js';

export { serviceCardsApi } from '../../modules/services/api.js';

export { documentsApi } from '../../modules/documents/api.js';

export { aftersalesApi } from '../../modules/returns/api.js';

export { bookingApi } from '../../modules/orders/api.js';

export { groupsApi } from '../../modules/orders/api.js';

export { financeApi } from '../../modules/finance/api.js';

export { calendarApi } from '../../modules/calendar/api.js';

export { servicesApi } from '../../modules/services/api.js';
