import { transactionListApi } from '../api.js';
import { financeOverviewApi } from '../api.js';
import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';


export const financeApi = {
  overview: financeOverviewApi.financeOverview,
  companySummary: (companyId, signal) => get(`companies/${companyId}/finance-summary/`, signal),
  accounts: (signal) => get('finance/accounts/', signal),
  transactions: transactionListApi.transactions,
  obligations: (params = {}, signal) => list('finance/obligations/', { page_size: 100, ...params }, signal),
  createObligation: (body) => create('finance/obligations/', body),
  payments: (params = {}, signal) => list('finance/payments/', { page_size: 100, ...params }, signal),
  createPayment: (body) => create('finance/payments/', body),
  createDocument: (body) => create('finance/documents/', body),
  confirmPayment: (id, body) => create(`finance/payments/${id}/confirm/`, body),
  paymentOrderUrl: (id) => apiPath(`finance/payments/${id}/payment-order/`),
  allocatePayment: (id, allocations) => create(`finance/payments/${id}/allocate/`, { allocations }),
  refunds: (params = {}, signal) => list('finance/refunds/', { page_size: 100, ...params }, signal),
  createRefund: (body) => create('finance/refunds/', body),
  executeRefund: (id) => create(`finance/refunds/${id}/execute/`, {}),
  cashflow: (params = {}, signal) => list('finance/cashflow/', params, signal),
  economics: (params = {}, signal) => list('finance/economics/', params, signal),
};
