import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const proposalListApi = {
  proposals: (params = {}, signal) => list('proposals/', { page_size: 100, ...params }, signal),
};
