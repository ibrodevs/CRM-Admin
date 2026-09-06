import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const communicationsApi = {
  threads: (params = {}, signal) => list('chat/threads/', { page_size: 100, ...params }, signal),
  messages: (id, params = {}, signal) => list(`chat/threads/${id}/messages/`, params, signal),
  send: (id, body) => create(`chat/threads/${id}/send/`, body),
  read: (id, body = {}) => create(`chat/threads/${id}/read/`, body),
  pin: (id, pinned) => create(`chat/threads/${id}/pin/`, { pinned }),
  historyUrl: (id) => apiPath(`chat/threads/${id}/history/`),
  unreadCount: (signal) => get('chat/unread-count/', signal),
  createThread: (body) => create('chat/threads/', body),
  participants: (id, signal) => get(`chat/threads/${id}/participants/`, signal),
  updateParticipants: (id, body) => apiRequest(apiPath(`chat/threads/${id}/participants/`), { method: 'PUT', body }),
};
