import { getRuntimePreferences } from '../../../shared/preferences/preferences.js';
import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, listAll, get, create, patch, remove } from '../../../shared/api/operations.js';

export const ordersApi = {
  all: (params = {}, signal) => listAll('orders/', params, signal),
  list: (params = {}, signal) => list('orders/', { page_size: 100, ...params }, signal),
  detail: (id, signal) => get(`orders/${id}/`, signal),
  overview: (id, signal) => get(`orders/${id}/overview/`, signal),
  create: (body) => create('orders/', { base_currency: getRuntimePreferences().base_currency || 'RUB', ...body }),
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
  updateRoute: (id, body) => patch(`orders/${id}/route/`, body),
  services: (id, signal) => get(`orders/${id}/services/`, signal),
  tasks: (id, params = {}, signal) => listAll(`orders/${id}/tasks/`, params, signal),
  createTask: (id, body) => create(`orders/${id}/tasks/`, body),
  updateTask: (id, taskId, body) => patch(`orders/${id}/tasks/${taskId}/`, body),
  removeTask: (id, taskId) => remove(`orders/${id}/tasks/${taskId}/`),
  history: (id, params = {}, signal) => listAll(`orders/${id}/history/`, params, signal),
};
