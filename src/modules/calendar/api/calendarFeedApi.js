import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const calendarFeedApi = {
  calendar: (params = {}, signal) => list('calendar/feed/', params, signal),
};
