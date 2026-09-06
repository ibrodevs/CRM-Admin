import { clientsApi } from '../../modules/clients/api.js';
import { companiesApi } from '../../modules/companies/api.js';
import { serviceFeeApi } from '../../modules/finance/api.js';

export const crmApi = {
  persons: clientsApi.persons,
  person: clientsApi.person,
  createPerson: clientsApi.createPerson,
  recognizePersonDocument: clientsApi.recognizePersonDocument,
  updatePerson: clientsApi.updatePerson,
  personDocuments: clientsApi.personDocuments,
  addPersonDocument: clientsApi.addPersonDocument,
  personLoyaltyCards: clientsApi.personLoyaltyCards,
  addPersonLoyaltyCard: clientsApi.addPersonLoyaltyCard,
  clients: clientsApi.clients,
  createClient: clientsApi.createClient,
  companies: companiesApi.companies,
  company: companiesApi.company,
  createCompany: companiesApi.createCompany,
  updateCompany: companiesApi.updateCompany,
  companyEmployees: companiesApi.companyEmployees,
  createCompanyEmployee: companiesApi.createCompanyEmployee,
  updateCompanyEmployee: companiesApi.updateCompanyEmployee,
  removeCompanyEmployee: companiesApi.removeCompanyEmployee,
  companyDepartments: companiesApi.companyDepartments,
  createCompanyDepartment: companiesApi.createCompanyDepartment,
  updateCompanyDepartment: companiesApi.updateCompanyDepartment,
  removeCompanyDepartment: companiesApi.removeCompanyDepartment,
  importCompanyEmployees: companiesApi.importCompanyEmployees,
  companyFinancialConditions: companiesApi.companyFinancialConditions,
  saveCompanyFinancialConditions: companiesApi.saveCompanyFinancialConditions,
  resolveServiceFee: serviceFeeApi.resolveServiceFee,
};
