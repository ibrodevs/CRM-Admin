import { apiPath, apiRequest, queryString } from './client';

const get = (path, signal) => apiRequest(apiPath(path), { signal });
const post = (path, body = {}) => apiRequest(apiPath(path), { method: 'POST', body });
const patch = (path, body = {}) => apiRequest(apiPath(path), { method: 'PATCH', body });
const remove = (path) => apiRequest(apiPath(path), { method: 'DELETE' });

export const orderCardApi = {
  detail: (orderId, signal) => get(`orders/${orderId}/`, signal),
  overview: (orderId, signal) => get(`orders/${orderId}/overview/`, signal),
  updateOrder: (orderId, body) => patch(`orders/${orderId}/`, body),
  transition: (orderId, targetStatus, version, reason = '') => post(`orders/${orderId}/transition/`, {
    target_status: targetStatus,
    version,
    reason,
  }),
  cancel: (orderId, version, reason = '') => post(`orders/${orderId}/cancel/`, { version, reason }),
  reassign: (orderId, operator, version) => post(`orders/${orderId}/reassign/`, { operator, version }),
  duplicate: (orderId) => post(`orders/${orderId}/duplicate/`, {}),
  allowedActions: (orderId, signal) => get(`orders/${orderId}/allowed-actions/`, signal),

  participants: (orderId, signal) => get(`orders/${orderId}/participants/`, signal),
  addParticipant: (orderId, body) => post(`orders/${orderId}/participants/`, body),
  updateParticipant: (orderId, participantId, body) => patch(`orders/${orderId}/participants/${participantId}/`, body),
  removeParticipant: (orderId, participantId) => remove(`orders/${orderId}/participants/${participantId}/`),

  route: (orderId, signal) => get(`orders/${orderId}/route/`, signal),
  updateRoute: (orderId, body) => patch(`orders/${orderId}/route/`, body),

  services: (orderId, signal) => get(`orders/${orderId}/services/`, signal),
  addService: (orderId, body) => post(`orders/${orderId}/services/`, body),

  tasks: (orderId, params = {}, signal) => get(`orders/${orderId}/tasks/${queryString(params)}`, signal),
  createTask: (orderId, body) => post(`orders/${orderId}/tasks/`, body),
  updateTask: (orderId, taskId, body) => patch(`orders/${orderId}/tasks/${taskId}/`, body),
  removeTask: (orderId, taskId) => remove(`orders/${orderId}/tasks/${taskId}/`),

  history: (orderId, params = {}, signal) => get(`orders/${orderId}/history/${queryString(params)}`, signal),
  financeSummary: (orderId, signal) => get(`orders/${orderId}/finance-summary/`, signal),
};

export function participantPayloadFromUi(person = {}) {
  const existingPersonId = person.person || person.personId || person.source?.person;
  const snapshot = {
    name: person.name || [person.lastName, person.firstName, person.middleName].filter(Boolean).join(' '),
    phone: person.phone || '',
    email: person.email || '',
    birth_date: person.dob || person.birthDate || null,
    document: person.doc || '',
    documents: person.documents || [],
  };
  return {
    person: existingPersonId || null,
    guest_snapshot: existingPersonId ? null : snapshot,
    role: person.roleCode || 'passenger',
    group_name: person.groupName || '',
    subgroup_name: person.subgroupName || '',
    is_contact: Boolean(person.isContact || person.lead),
    booking_document: person.bookingDocument || null,
    notes: person.notes || '',
  };
}

export function routePayloadFromUi({ trip = 'ow', points = [], depDate, retDate, version } = {}) {
  const kind = { ow: 'one_way', rt: 'round_trip', mc: 'multi_city' }[trip] || 'one_way';
  const validPoints = points.filter(Boolean);
  return {
    kind,
    version,
    points: validPoints.map((code, index) => ({
      location_code: code,
      location_type: 'airport',
      location_name: '',
      local_datetime: index === 0 ? depDate || null : index === validPoints.length - 1 ? retDate || null : null,
      timezone: '',
    })),
  };
}
