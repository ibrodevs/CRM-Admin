import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const travelPolicyApi = {
  list: (companyId, signal) => get(`companies/${companyId}/travel-policies/`, signal),
  create: (companyId, body) => create(`companies/${companyId}/travel-policies/`, body),
  detail: (id, signal) => get(`travel-policies/${id}/`, signal),
  update: (id, body) => patch(`travel-policies/${id}/`, body),
  check: (id, offer) => create(`travel-policies/${id}/check/`, { offer }),
  import: (companyId, file) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest(apiPath(`companies/${companyId}/travel-policies/import/`), { method: 'POST', body });
  },
};
