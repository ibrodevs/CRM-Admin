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

export const proposalsApi = {
  list: workspaceApi.proposals,
  create: (body) => create('proposals/', body),
  detail: (id, signal) => get(`proposals/${id}/`, signal),
  replaceDraft: (id, body) => apiRequest(apiPath(`proposals/${id}/draft/`), { method: 'PUT', body }),
  versions: (id, signal) => get(`proposals/${id}/versions/`, signal),
  prepare: (id, version) => create(`proposals/${id}/prepare/`, { version }),
  send: (id, version) => create(`proposals/${id}/send/`, { version }),
  approve: (id, version, variant, createServices = true) => create(`proposals/${id}/approve/`, { version, variant, create_services: createServices }),
  reject: (id, version, reason) => create(`proposals/${id}/reject/`, { version, reason }),
  archive: (id, version) => create(`proposals/${id}/archive/`, { version }),
  pdfUrl: (id, version) => apiPath(`proposals/${id}/pdf/`) + queryString(version ? { proposal_version: version } : {}),
  templates: (signal) => get('proposal-templates/', signal),
  createTemplate: (body) => create('proposal-templates/', body),
  deleteTemplate: (id) => remove(`proposal-templates/${id}/`),
};

export const serviceCardsApi = {
  list: (params = {}, signal) => list('service-cards/', { page_size: 100, ...params }, signal),
  create: (body) => create('service-cards/', body),
  send: (id, body) => create(`service-cards/${id}/send/`, body),
  expire: (id) => create(`service-cards/${id}/expire/`, {}),
};

export const documentsApi = {
  list: workspaceApi.documents,
  create: (body) => create('documents/', body),
  upload: (file, document) => {
    const body = new FormData();
    body.append('file', file);
    body.append('document', JSON.stringify(document));
    return apiRequest(apiPath('documents/'), { method: 'POST', body });
  },
  versions: (id, signal) => get(`documents/${id}/versions/`, signal),
  addVersion: (id, file, reason = 'Новая версия из CRM') => {
    const body = new FormData(); body.append('file', file); body.append('reason', reason);
    return apiRequest(apiPath(`documents/${id}/versions/`), { method: 'POST', body });
  },
  generate: (id, body) => create(`documents/${id}/generate/`, body),
  sign: (id, reference) => create(`documents/${id}/sign/`, { reference }),
  void: (id, reason) => create(`documents/${id}/void/`, { reason }),
  send: (id, channel = 'email') => create(`documents/${id}/send/`, { channel }),
  downloadUrl: (id) => apiPath(`documents/${id}/download/`),
  previewUrl: (id) => apiPath(`documents/${id}/download/?disposition=inline`),
  originalPreviewUrl: (id) => apiPath(`documents/${id}/download/?file_version=1&disposition=inline`),
  supplierPreviewUrl: (id) => apiPath(`documents/${id}/supplier-pdf/?disposition=inline`),
  supplierSourcePreviewUrl: (id) => apiPath(`documents/${id}/supplier-pdf/?source=1&disposition=inline`),
  importReceipt: (file, options = {}) => { const body = new FormData(); body.append('file', file); return apiRequest(apiPath('receipt-imports/'), { method: 'POST', body, ...options }); },
  receiptResult: (id, signal) => get(`receipt-imports/${id}/result/`, signal),
  confirmReceipt: (id, body) => create(`receipt-imports/${id}/confirm/`, body),
  updateReceipt: (id, body) => create(`documents/${id}/receipt/`, body),
};

export const aftersalesApi = {
  list: workspaceApi.returns,
  create: (body) => create('after-sales/', body),
  detail: (id, signal) => get(`after-sales/${id}/`, signal),
  quote: (id, body) => create(`after-sales/${id}/quote/`, body),
  transition: (id, targetStatus, reason = '') => create(`after-sales/${id}/transition/`, { target_status: targetStatus, reason }),
  sendForApproval: (id) => create(`after-sales/${id}/send-for-approval/`, {}),
  clientApprove: (id, quoteVersion) => create(`after-sales/${id}/client-approve/`, { quote_version: quoteVersion }),
  submit: (id) => create(`after-sales/${id}/submit-to-supplier/`, {}),
  execute: (id, body = {}) => create(`after-sales/${id}/execute/`, body),
  cancel: (id, reason) => create(`after-sales/${id}/cancel/`, { reason }),
  history: (id, signal) => get(`after-sales/${id}/history/`, signal),
  documents: (id, signal) => get(`after-sales/${id}/documents/`, signal),
};

export const bookingApi = {
  create: (body) => create('booking-workflows/', body),
  preflight: (id) => create(`booking-workflows/${id}/preflight/`, {}),
  start: (id, confirm = false) => create(`booking-workflows/${id}/start/`, { confirm }),
  status: (id, signal) => get(`booking-workflows/${id}/status/`, signal),
  issue: (id, body = {}) => create(`booking-workflows/${id}/issue/`, body),
  inquiry: (id, item) => create(`booking-workflows/${id}/status-inquiry/`, { item }),
  cancel: (id, reason) => create(`booking-workflows/${id}/cancel/`, { reason }),
};

export const groupsApi = {
  list: (params = {}, signal) => list('group-orders/', { page_size: 100, ...params }, signal),
  create: (body) => create('group-orders/', body),
  detail: (id, signal) => get(`group-orders/${id}/`, signal),
  transition: (id, targetStatus) => create(`group-orders/${id}/transition/`, { target_status: targetStatus }),
  blocks: (id, body) => create(`group-orders/${id}/blocks/`, body),
  matrix: (id, signal) => get(`group-orders/${id}/matrix/`, signal),
  massAction: (id, body) => create(`group-orders/${id}/mass-actions/`, body),
  requests: (id, body) => create(`group-orders/${id}/requests/`, body),
  responses: (id, signal) => get(`group-orders/${id}/supplier-responses/`, signal),
};

export const financeApi = {
  overview: workspaceApi.financeOverview,
  companySummary: (companyId, signal) => get(`companies/${companyId}/finance-summary/`, signal),
  accounts: (signal) => get('finance/accounts/', signal),
  transactions: workspaceApi.transactions,
  obligations: (params = {}, signal) => list('finance/obligations/', { page_size: 100, ...params }, signal),
  createObligation: (body) => create('finance/obligations/', body),
  payments: (params = {}, signal) => list('finance/payments/', { page_size: 100, ...params }, signal),
  createPayment: (body) => create('finance/payments/', body),
  createDocument: (body) => create('finance/documents/', body),
  confirmPayment: (id, body) => create(`finance/payments/${id}/confirm/`, body),
  paymentOrderUrl: (id) => apiPath(`finance/payments/${id}/payment-order/`),
  allocatePayment: (id, allocations) => create(`finance/payments/${id}/allocate/`, { allocations }),
  refunds: (params = {}, signal) => list('finance/refunds/', { page_size: 100, ...params }, signal),
  createRefund: (body) => create('finance/refunds/', body),
  executeRefund: (id) => create(`finance/refunds/${id}/execute/`, {}),
  cashflow: (params = {}, signal) => list('finance/cashflow/', params, signal),
  economics: (params = {}, signal) => list('finance/economics/', params, signal),
};

export const calendarApi = {
  feed: workspaceApi.calendar,
  events: (params = {}, signal) => list('calendar/events/', { page_size: 100, ...params }, signal),
  createEvent: (body) => create('calendar/events/', body),
  complete: (id, body = {}) => create(`calendar/events/${id}/complete/`, body),
  reschedule: (id, body) => create(`calendar/events/${id}/reschedule/`, body),
  trips: (params = {}, signal) => list('trips/', { page_size: 100, ...params }, signal),
  conflicts: (id, signal) => get(`trips/${id}/conflicts/`, signal),
};

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
