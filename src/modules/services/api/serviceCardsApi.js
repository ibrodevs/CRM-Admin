import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const serviceCardsApi = {
  list: (params = {}, signal) => list('service-cards/', { page_size: 100, ...params }, signal),
  create: (body) => create('service-cards/', body),
  send: (id, body) => create(`service-cards/${id}/send/`, body),
  expire: (id) => create(`service-cards/${id}/expire/`, {}),
};
