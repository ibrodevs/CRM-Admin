import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const returnListApi = {
  returns: (params = {}, signal) => list('after-sales/', { page_size: 100, ...params }, signal),
};
