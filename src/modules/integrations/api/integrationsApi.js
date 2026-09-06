import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const integrationsApi = {
  operations: (params = {}, signal) => list('integration-operations/', { page_size: 100, ...params }, signal),
  incidents: (params = {}, signal) => list('integration-incidents/', { page_size: 100, ...params }, signal),
  assign: (id, assignee) => create(`integration-incidents/${id}/assign/`, { assignee }),
  retry: (id) => create(`integration-incidents/${id}/retry/`, {}),
  snooze: (id, until) => create(`integration-incidents/${id}/snooze/`, { until }),
  switchSupplier: (id, supplier) => create(`integration-incidents/${id}/switch-supplier/`, { supplier }),
  resolve: (id, resolutionCode = 'resolved_manually', comment = '') => create(`integration-incidents/${id}/resolve/`, { resolution_code: resolutionCode, comment }),
  reopen: (id) => create(`integration-incidents/${id}/reopen/`, {}),
  escalate: (id, body = {}) => create(`integration-incidents/${id}/escalate/`, body),
  errorCodes: (signal) => get('integration-error-codes/', signal),
};
