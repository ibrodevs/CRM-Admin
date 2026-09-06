import { apiPath, apiRequest, queryString } from '../../src/shared/api/client';

const list = (path, params, signal) => apiRequest(apiPath(path) + queryString(params), { signal });
const get = (path, signal) => apiRequest(apiPath(path), { signal });
const create = (path, body, options) => apiRequest(apiPath(path), { method: 'POST', body, ...options });
const patch = (path, body) => apiRequest(apiPath(path), { method: 'PATCH', body });
const remove = (path) => apiRequest(apiPath(path), { method: 'DELETE' });

export { jobsApi } from '../../src/modules/integrations/api.js';

export { crmApi } from '../../src/modules/clients/api.js';

export { travelPolicyApi } from '../../src/modules/companies/api.js';

export { accountApi } from '../../src/modules/account/api.js';

export { usersApi } from '../../src/modules/users/api.js';

export { ordersApi } from '../../src/modules/orders/api.js';

export { suppliersApi } from '../../src/modules/suppliers/api.js';

export { communicationsApi } from '../../src/modules/chats/api.js';

export { notificationsApi } from '../../src/modules/notifications/api.js';

export { integrationsApi } from '../../src/modules/integrations/api.js';

export { workforceApi } from '../../src/modules/workforce/api.js';

export { workspaceApi } from '../../src/modules/workspace/api.js';

export { workspaceSettingsApi } from '../../src/modules/settings/api.js';

export { workspaceActionsApi } from '../../src/modules/workspace/api.js';

export { proposalsApi } from '../../src/modules/proposals/api.js';

export { serviceCardsApi } from '../../src/modules/services/api.js';

export { documentsApi } from '../../src/modules/documents/api.js';

export { aftersalesApi } from '../../src/modules/returns/api.js';

export { bookingApi } from '../../src/modules/orders/api.js';

export { groupsApi } from '../../src/modules/orders/api.js';

export { financeApi } from '../../src/modules/finance/api.js';

export { calendarApi } from '../../src/modules/calendar/api.js';

export { servicesApi } from '../../src/modules/services/api.js';
