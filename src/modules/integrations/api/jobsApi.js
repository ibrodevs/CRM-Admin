import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const jobsApi = {
  detail: (id, signal) => get(`jobs/${id}/`, signal),
};
