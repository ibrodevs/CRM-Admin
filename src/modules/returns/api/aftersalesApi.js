import { returnListApi } from './returnListApi.js';
import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';


export const aftersalesApi = {
  list: returnListApi.returns,
  create: (body) => create('after-sales/', body),
  detail: (id, signal) => get(`after-sales/${id}/`, signal),
  quote: (id, body) => create(`after-sales/${id}/quote/`, body),
  transition: (id, targetStatus, reason = '') => create(`after-sales/${id}/transition/`, { target_status: targetStatus, reason }),
  sendForApproval: (id) => create(`after-sales/${id}/send-for-approval/`, {}),
  clientApprove: (id, quoteVersion) => create(`after-sales/${id}/client-approve/`, { quote_version: quoteVersion }),
  submit: (id) => create(`after-sales/${id}/submit-to-supplier/`, {}),
  execute: (id, body = {}) => create(`after-sales/${id}/execute/`, body),
  cancel: (id, reason) => create(`after-sales/${id}/cancel/`, { reason }),
  history: (id, signal) => get(`after-sales/${id}/history/`, signal),
  documents: (id, signal) => get(`after-sales/${id}/documents/`, signal),
};
