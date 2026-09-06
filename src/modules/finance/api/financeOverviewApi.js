import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const financeOverviewApi = {
  financeOverview: (signal) => get('finance/overview/', signal),
};
