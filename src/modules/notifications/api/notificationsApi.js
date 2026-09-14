import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const notificationsApi = {
  list: (params = {}, signal) => list('notifications/', { page_size: 100, ...params }, signal),
  read: (id, read = true) => create(`notifications/${id}/read/`, { read }),
  pin: (id) => create(`notifications/${id}/pin/`, {}),
  dismiss: (id) => create(`notifications/${id}/dismiss/`, {}),
  readAll: () => create('notifications/read-all/', {}),
  dismissRead: () => create('notifications/dismiss-read/', {}),
  rules: (signal) => get('notification-rules/', signal),
  // Какие внешние каналы реально настроены на сервере: интерфейс не должен
  // обещать доставку по каналу, у которого нет ни одного реквизита.
  channels: (signal) => get('notification-channels/', signal),
  deliveries: (params = {}, signal) => list('notification-deliveries/', params, signal),
  setRules: (body) => apiRequest(apiPath('notification-rules/'), { method: 'PUT', body }),
};
