import { documentListApi } from './documentListApi.js';
import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, listAll, get, create, patch, remove } from '../../../shared/api/operations.js';


export const documentsApi = {
  templates: (signal) => get('document-templates/', signal),
  createTemplate: (body) => create('document-templates/', body),
  list: documentListApi.documents,
  all: (params = {}, signal) => listAll('documents/', params, signal),
  create: (body) => create('documents/', body),
  upload: (file, document) => {
    const body = new FormData();
    body.append('file', file);
    body.append('document', JSON.stringify(document));
    return apiRequest(apiPath('documents/'), { method: 'POST', body });
  },
  versions: (id, signal) => get(`documents/${id}/versions/`, signal),
  addVersion: (id, file, reason = 'Новая версия из CRM') => {
    const body = new FormData(); body.append('file', file); body.append('reason', reason);
    return apiRequest(apiPath(`documents/${id}/versions/`), { method: 'POST', body });
  },
  generate: (id, body) => create(`documents/${id}/generate/`, body),
  sign: (id, reference) => create(`documents/${id}/sign/`, { reference }),
  void: (id, reason) => create(`documents/${id}/void/`, { reason }),
  send: (id, channel = 'email') => create(`documents/${id}/send/`, { channel }),
  downloadUrl: (id) => apiPath(`documents/${id}/download/`),
  previewUrl: (id) => apiPath(`documents/${id}/download/?disposition=inline`),
  originalPreviewUrl: (id) => apiPath(`documents/${id}/download/?file_version=1&disposition=inline`),
  supplierPreviewUrl: (id) => apiPath(`documents/${id}/supplier-pdf/?disposition=inline`),
  supplierSourcePreviewUrl: (id) => apiPath(`documents/${id}/supplier-pdf/?source=1&disposition=inline`),
  importReceipt: (file, options = {}) => { const body = new FormData(); body.append('file', file); return apiRequest(apiPath('receipt-imports/'), { method: 'POST', body, ...options }); },
  receiptResult: (id, signal) => get(`receipt-imports/${id}/result/`, signal),
  confirmReceipt: (id, body) => create(`receipt-imports/${id}/confirm/`, body),
  updateReceipt: (id, body) => create(`documents/${id}/receipt/`, body),
};
