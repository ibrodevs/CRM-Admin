import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';
import { workspaceApi } from '../../workspace/api.js';

export const proposalsApi = {
  list: workspaceApi.proposals,
  create: (body) => create('proposals/', body),
  detail: (id, signal) => get(`proposals/${id}/`, signal),
  replaceDraft: (id, body) => apiRequest(apiPath(`proposals/${id}/draft/`), { method: 'PUT', body }),
  versions: (id, signal) => get(`proposals/${id}/versions/`, signal),
  prepare: (id, version) => create(`proposals/${id}/prepare/`, { version }),
  send: (id, version) => create(`proposals/${id}/send/`, { version }),
  approve: (id, version, variant, createServices = true) => create(`proposals/${id}/approve/`, { version, variant, create_services: createServices }),
  reject: (id, version, reason) => create(`proposals/${id}/reject/`, { version, reason }),
  archive: (id, version) => create(`proposals/${id}/archive/`, { version }),
  pdfUrl: (id, version) => apiPath(`proposals/${id}/pdf/`) + queryString(version ? { proposal_version: version } : {}),
  templates: (signal) => get('proposal-templates/', signal),
  createTemplate: (body) => create('proposal-templates/', body),
  deleteTemplate: (id) => remove(`proposal-templates/${id}/`),
};
