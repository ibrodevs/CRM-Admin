import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const documentListApi = {
  documents: (params = {}, signal) => list('documents/', { page_size: 100, ...params }, signal),
};
