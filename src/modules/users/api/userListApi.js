import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const userListApi = {
  users: (params = {}, signal) => list('users/', { page_size: 100, ...params }, signal),
};
