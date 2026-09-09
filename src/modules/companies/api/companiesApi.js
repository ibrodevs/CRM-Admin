import { apiPath, apiRequest, queryString } from '../../../shared/api/client.js';
import { list, listAll, get, create, patch, remove } from '../../../shared/api/operations.js';

export const companiesApi = {
  companies: (params = {}, signal) => listAll('companies/', params, signal),
  company: (id, signal) => get(`companies/${id}/`, signal),
  createCompany: (body) => create('companies/', body),
  updateCompany: (id, body) => patch(`companies/${id}/`, body),
  companyEmployees: (id, signal) => listAll(`companies/${id}/employees/`, {}, signal),
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
};
