import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const clientsApi = {
  persons: (params = {}, signal) => list('persons/', { page_size: 100, ...params }, signal),
  person: (id, signal) => get(`persons/${id}/`, signal),
  createPerson: (body) => create('persons/', body),
  // Распознавание документа личности: backend возвращает поля для карточки,
  // ничего не сохраняя — OCR остаётся альтернативой ручному вводу анкеты.
  recognizePersonDocument: (file) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest(apiPath('person-documents/recognize/'), { method: 'POST', body });
  },
  updatePerson: (id, body) => patch(`persons/${id}/`, body),
  personDocuments: (id, signal) => get(`persons/${id}/documents/`, signal),
  addPersonDocument: (id, body) => create(`persons/${id}/documents/`, body),
  personLoyaltyCards: (id, signal) => get(`persons/${id}/loyalty-cards/`, signal),
  addPersonLoyaltyCard: (id, body) => create(`persons/${id}/loyalty-cards/`, body),
  clients: (params = {}, signal) => list('clients/', { page_size: 100, ...params }, signal),
  createClient: (body) => create('clients/', body),
};
