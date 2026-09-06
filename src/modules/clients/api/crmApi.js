import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, get, create, patch, remove } from '../../../shared/api/operations.js';

export const crmApi = {
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
  companies: (params = {}, signal) => list('companies/', { page_size: 100, ...params }, signal),
  company: (id, signal) => get(`companies/${id}/`, signal),
  createCompany: (body) => create('companies/', body),
  updateCompany: (id, body) => patch(`companies/${id}/`, body),
  companyEmployees: (id, signal) => get(`companies/${id}/employees/`, signal),
  createCompanyEmployee: (id, body) => create(`companies/${id}/employees/`, body),
  updateCompanyEmployee: (companyId, employeeId, body) => patch(`companies/${companyId}/employees/${employeeId}/`, body),
  removeCompanyEmployee: (companyId, employeeId) => remove(`companies/${companyId}/employees/${employeeId}/`),
  companyDepartments: (id, signal) => get(`companies/${id}/departments/`, signal),
  createCompanyDepartment: (id, body) => create(`companies/${id}/departments/`, body),
  updateCompanyDepartment: (companyId, departmentId, body) => patch(`companies/${companyId}/departments/${departmentId}/`, body),
  removeCompanyDepartment: (companyId, departmentId) => remove(`companies/${companyId}/departments/${departmentId}/`),
  importCompanyEmployees: (companyId, file) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest(apiPath(`companies/${companyId}/employees/import/`), { method: 'POST', body });
  },
  companyFinancialConditions: (id, signal) => get(`companies/${id}/financial-conditions/`, signal),
  saveCompanyFinancialConditions: (id, body) => apiRequest(apiPath(`companies/${id}/financial-conditions/`), { method: 'PUT', body }),
  // Сервисный сбор считает backend по договору контрагента: фронт передаёт
  // только контекст (контрагент, вид услуги, база поставщика).
  resolveServiceFee: (body, signal) => create('service-fee/resolve/', body, { idempotent: false, signal }),
};
