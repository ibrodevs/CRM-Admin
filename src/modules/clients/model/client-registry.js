import { shortCodeSearchable } from '../../../shared/lib/short-id.js';

export function clientRegistry(clients, companies) {
  return [
    ...clients.map((client) => ({ ...client, entityType: 'individual' })),
    ...companies.map((company) => ({ ...company, entityType: 'legal', type: 'Юрлицо', company: company.fullName, city: company.city || '—', spent: company.turnover, debt: company.metrics?.debt || {}, status: ({ 'Действующий': 'Активный', 'На паузе': 'Неактивный', 'Архив': 'Неактивный' })[company.status] || company.status })),
  ];
}

export function filterClientRegistry(rows, { type = '', status = '', query = '' } = {}) {
  const term = query.trim().toLowerCase();
  return rows.filter((row) => (!type || row.entityType === type) && (!status || row.status === status) && (!term || `${shortCodeSearchable(row.id, row.entityType === 'legal' ? 'CO' : 'CL')} ${row.name} ${row.company} ${row.phone} ${row.inn || ''}`.toLowerCase().includes(term)));
}
