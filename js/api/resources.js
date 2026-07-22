import { apiPath, apiRequest, queryString } from './client';

const list = (path, params, signal) => apiRequest(apiPath(path) + queryString(params), { signal });
const get = (path, signal) => apiRequest(apiPath(path), { signal });
const create = (path, body, options) => apiRequest(apiPath(path), { method: 'POST', body, ...options });
const patch = (path, body) => apiRequest(apiPath(path), { method: 'PATCH', body });
const remove = (path) => apiRequest(apiPath(path), { method: 'DELETE' });

export const crmApi = {
  persons: (params = {}, signal) => list('persons/', { page_size: 100, ...params }, signal),
  person: (id, signal) => get(`persons/${id}/`, signal),
  createPerson: (body) => create('persons/', body),
  updatePerson: (id, body) => patch(`persons/${id}/`, body),
  personDocuments: (id, signal) => get(`persons/${id}/documents/`, signal),
  addPersonDocument: (id, body) => create(`persons/${id}/documents/`, body),
  clients: (params = {}, signal) => list('clients/', { page_size: 100, ...params }, signal),
  createClient: (body) => create('clients/', body),
  companies: (params = {}, signal) => list('companies/', { page_size: 100, ...params }, signal),
  company: (id, signal) => get(`companies/${id}/`, signal),
  createCompany: (body) => create('companies/', body),
  updateCompany: (id, body) => patch(`companies/${id}/`, body),
  companyEmployees: (id, signal) => get(`companies/${id}/employees/`, signal),
  createCompanyEmployee: (id, body) => create(`companies/${id}/employees/`, body),
  updateCompanyEmployee: (companyId, employeeId, body) => patch(`companies/${companyId}/employees/${employeeId}/`, body),
  removeCompanyEmployee: (companyId, employeeId) => remove(`companies/${companyId}/employees/${employeeId}/`),
  companyDepartments: (id, signal) => get(`companies/${id}/departments/`, signal),
  createCompanyDepartment: (id, body) => create(`companies/${id}/departments/`, body),
  updateCompanyDepartment: (companyId, departmentId, body) => patch(`companies/${companyId}/departments/${departmentId}/`, body),
  removeCompanyDepartment: (companyId, departmentId) => remove(`companies/${companyId}/departments/${departmentId}/`),
};

export const accountApi = {
  me: (signal) => get('me/', signal),
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

export const usersApi = {
  list: (params = {}, signal) => list('users/', { page_size: 100, ...params }, signal),
  create: (body) => create('users/', body),
  update: (id, body) => patch(`users/${id}/`, body),
  invite: (id) => create(`users/${id}/invite/`, {}),
  suspend: (id, reason = '') => create(`users/${id}/suspend/`, { reason }),
  roles: (signal) => get('roles/', signal),
  updateRole: (id, permissions) => apiRequest(apiPath(`roles/${id}/`), { method: 'PUT', body: { permissions } }),
  userRoles: (id, signal) => get(`users/${id}/roles/`, signal),
  setRoles: (id, roles) => apiRequest(apiPath(`users/${id}/roles/`), { method: 'PUT', body: { roles } }),
  serviceAccess: (id, signal) => get(`users/${id}/service-access/`, signal),
  setServiceAccess: (id, body) => apiRequest(apiPath(`users/${id}/service-access/`), { method: 'PUT', body }),
  sla: (id, signal) => get(`users/${id}/sla/`, signal),
  setSla: (id, minutes) => apiRequest(apiPath(`users/${id}/sla/`), { method: 'PUT', body: { sla_response_minutes: minutes } }),
};

export const ordersApi = {
  list: (params = {}, signal) => list('orders/', { page_size: 100, ...params }, signal),
  detail: (id, signal) => get(`orders/${id}/`, signal),
  overview: (id, signal) => get(`orders/${id}/overview/`, signal),
  create: (body) => create('orders/', body),
  update: (id, body) => patch(`orders/${id}/`, body),
  transition: (id, body) => create(`orders/${id}/transition/`, body),
  cancel: (id, body) => create(`orders/${id}/cancel/`, body),
  reassign: (id, body) => create(`orders/${id}/reassign/`, body),
  duplicate: (id) => create(`orders/${id}/duplicate/`, {}),
  addParticipant: (id, body) => create(`orders/${id}/participants/`, body),
  participants: (id, signal) => get(`orders/${id}/participants/`, signal),
  updateParticipant: (id, participantId, body) => patch(`orders/${id}/participants/${participantId}/`, body),
  removeParticipant: (id, participantId) => remove(`orders/${id}/participants/${participantId}/`),
  route: (id, signal) => get(`orders/${id}/route/`, signal),
  updateRoute: (id, body) => apiRequest(apiPath(`orders/${id}/route/`), { method: 'PUT', body }),
  services: (id, signal) => get(`orders/${id}/services/`, signal),
  tasks: (id, params = {}, signal) => list(`orders/${id}/tasks/`, { page_size: 100, ...params }, signal),
  createTask: (id, body) => create(`orders/${id}/tasks/`, body),
  updateTask: (id, taskId, body) => patch(`orders/${id}/tasks/${taskId}/`, body),
  removeTask: (id, taskId) => remove(`orders/${id}/tasks/${taskId}/`),
  history: (id, params = {}, signal) => list(`orders/${id}/history/`, { page_size: 100, ...params }, signal),
};

export const suppliersApi = {
  list: (params = {}, signal) => list('suppliers/', { page_size: 100, ...params }, signal),
  create: (body) => create('suppliers/', body),
  update: (id, body) => patch(`suppliers/${id}/`, body),
  credentials: (id, signal) => get(`suppliers/${id}/credentials/`, signal),
  saveCredential: (id, body) => create(`suppliers/${id}/credentials/`, body),
  checkConnection: (id) => create(`suppliers/${id}/check-connection/`, {}),
  markupRules: (id, signal) => get(`suppliers/${id}/markup-rules/`, signal),
  createMarkupRule: (id, body) => create(`suppliers/${id}/markup-rules/`, body),
};

export const communicationsApi = {
  threads: (params = {}, signal) => list('chat/threads/', { page_size: 100, ...params }, signal),
  messages: (id, params = {}, signal) => list(`chat/threads/${id}/messages/`, params, signal),
  send: (id, body) => create(`chat/threads/${id}/send/`, body),
  read: (id, body = {}) => create(`chat/threads/${id}/read/`, body),
  pin: (id, pinned) => create(`chat/threads/${id}/pin/`, { pinned }),
  historyUrl: (id) => apiPath(`chat/threads/${id}/history/`),
  unreadCount: (signal) => get('chat/unread-count/', signal),
  createThread: (body) => create('chat/threads/', body),
  participants: (id, signal) => get(`chat/threads/${id}/participants/`, signal),
  updateParticipants: (id, body) => apiRequest(apiPath(`chat/threads/${id}/participants/`), { method: 'PUT', body }),
};

export const notificationsApi = {
  list: (params = {}, signal) => list('notifications/', { page_size: 100, ...params }, signal),
  read: (id, read = true) => create(`notifications/${id}/read/`, { read }),
  pin: (id) => create(`notifications/${id}/pin/`, {}),
  dismiss: (id) => create(`notifications/${id}/dismiss/`, {}),
  readAll: () => create('notifications/read-all/', {}),
  dismissRead: () => create('notifications/dismiss-read/', {}),
  rules: (signal) => get('notification-rules/', signal),
  setRules: (body) => apiRequest(apiPath('notification-rules/'), { method: 'PUT', body }),
};

export const integrationsApi = {
  operations: (params = {}, signal) => list('integration-operations/', { page_size: 100, ...params }, signal),
  incidents: (params = {}, signal) => list('integration-incidents/', { page_size: 100, ...params }, signal),
  assign: (id, user) => create(`integration-incidents/${id}/assign/`, { user }),
  retry: (id) => create(`integration-incidents/${id}/retry/`, {}),
  snooze: (id, until) => create(`integration-incidents/${id}/snooze/`, { until }),
  switchSupplier: (id, supplier) => create(`integration-incidents/${id}/switch-supplier/`, { supplier }),
  resolve: (id) => create(`integration-incidents/${id}/resolve/`, {}),
  reopen: (id) => create(`integration-incidents/${id}/reopen/`, {}),
  escalate: (id, body = {}) => create(`integration-incidents/${id}/escalate/`, body),
  errorCodes: (signal) => get('integration-error-codes/', signal),
};

export const workforceApi = {
  queue: (signal) => get('sla/queue/', signal),
  currentShift: (signal) => get('shifts/current/', signal),
  startShift: (body = {}) => create('shifts/start/', body),
  previewClose: (id) => create(`shifts/${id}/preview-close/`, {}),
  closeShift: (id, body = {}) => create(`shifts/${id}/close/`, body),
  reportUrl: (id) => apiPath(`shifts/${id}/report/`),
  motivationRules: (signal) => get('motivation/rules/', signal),
  saveMotivationRules: (body) => apiRequest(apiPath('motivation/rules/'), { method: 'PUT', body }),
  motivationAccruals: (params = {}, signal) => list('motivation/accruals/', params, signal),
};

export const workspaceApi = {
  dashboard: (params = {}, signal) => list('dashboard/', params, signal),
  calendar: (params = {}, signal) => list('calendar/feed/', params, signal),
  proposals: (params = {}, signal) => list('proposals/', { page_size: 100, ...params }, signal),
  documents: (params = {}, signal) => list('documents/', { page_size: 100, ...params }, signal),
  returns: (params = {}, signal) => list('after-sales/', { page_size: 100, ...params }, signal),
  financeOverview: (signal) => get('finance/overview/', signal),
  transactions: (params = {}, signal) => list('finance/transactions/', { page_size: 100, ...params }, signal),
  users: (params = {}, signal) => list('users/', { page_size: 100, ...params }, signal),
  meta: (signal) => get('meta/', signal),
  globalSearch: (q, signal) => list('search/', { q }, signal),
};

export const workspaceSettingsApi = {
  get: (namespace, signal) => get(`workspace-settings/${namespace}/`, signal),
  save: (namespace, value) => patch(`workspace-settings/${namespace}/`, { value }),
};

export const workspaceActionsApi = {
  list: (params = {}, signal) => get(`workspace-actions/${queryString(params)}`, signal),
  execute: (action, { resourceType = '', resourceId = '', payload = {} } = {}) => create('workspace-actions/', {
    action, resource_type: resourceType, resource_id: resourceId, payload,
  }),
};

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
  importReceipt: (file) => { const body = new FormData(); body.append('file', file); return apiRequest(apiPath('receipt-imports/'), { method: 'POST', body }); },
  receiptResult: (id, signal) => get(`receipt-imports/${id}/result/`, signal),
  confirmReceipt: (id, body) => create(`receipt-imports/${id}/confirm/`, body),
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
};
