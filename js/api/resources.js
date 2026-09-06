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

export const servicesApi = {
  list: (params = {}, signal) => list('services/', { page_size: 100, ...params }, signal),
  detail: (id, signal) => get(`services/${id}/`, signal),
  update: (id, body) => patch(`services/${id}/`, body),
  remove: (id) => remove(`services/${id}/`),
  search: (body) => create('service-searches/', body),
  searchV1: (body) => create('services/search/', body),
  searchStatus: (id, signal) => get(`service-searches/${id}/`, signal),
  offers: (id, params = {}, signal) => list(`service-searches/${id}/offers/`, params, signal),
  cancelSearch: (id) => create(`service-searches/${id}/cancel/`, {}),
  compare: (offerIds) => create('service-offers/compare/', { offer_ids: offerIds }),
  revalidate: (id) => create(`service-offers/${id}/revalidate/`, {}),
  fareRules: (id, signal) => get(`service-offers/${id}/fare-rules/`, signal),
  addToOrder: (orderId, body) => create(`orders/${orderId}/services/`, body),
  transition: (id, body) => create(`services/${id}/transition/`, body),
  passengers: (id, signal) => get(`services/${id}/passengers/`, signal),
  updatePassengers: (id, body) => apiRequest(apiPath(`services/${id}/passengers/`), { method: 'PUT', body }),
  manualBook: (id, body) => create(`services/${id}/manual-book/`, body),
  manualIssue: (id, body) => create(`services/${id}/manual-issue/`, body),
  revalidateService: (id, body = {}) => create(`services/${id}/revalidate/`, body),
  book: (id, body = {}) => create(`services/${id}/book/`, body),
  issue: (id, body = {}) => create(`services/${id}/issue/`, body),
  cancel: (id, body = {}) => create(`services/${id}/cancel/`, body),
  extras: (id, signal) => get(`services/${id}/extras/`, signal),
  addExtra: (id, body) => create(`services/${id}/extras/`, body),
  extraCatalog: (params = {}, signal) => list('service-extra-catalog/', { page_size: 100, ...params }, signal),
  createExtraCatalogItem: (body) => create('service-extra-catalog/', body),
  setResponsible: (id, responsible) => apiRequest(apiPath(`services/${id}/responsible/`), { method: 'PUT', body: { responsible } }),
};
