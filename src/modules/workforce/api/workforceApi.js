import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const workforceApi = {
  queue: (params = {}, signal) => get(`sla/queue/${queryString(params)}`, signal),
  currentShift: (signal) => get('shifts/current/', signal),
  shifts: (params = {}, signal) => list('shifts/', { page_size: 100, ...params }, signal),
  startShift: (body = {}) => create('shifts/start/', body),
  previewClose: (id) => create(`shifts/${id}/preview-close/`, {}),
  closeShift: (id, body = {}) => create(`shifts/${id}/close/`, body),
  reportUrl: (id) => apiPath(`shifts/${id}/report/`),
  motivationRules: (signal) => get('motivation/rules/', signal),
  saveMotivationRules: (body) => apiRequest(apiPath('motivation/rules/'), { method: 'PUT', body }),
  motivationAccruals: (params = {}, signal) => list('motivation/accruals/', params, signal),
};
