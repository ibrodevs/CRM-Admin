

function toUiCompany(company) {
  return {
    ...company,
    id: company.id, name: company.short_name || company.legal_name, shortName: company.short_name,
    fullName: company.legal_name, type: company.type || 'Организация',
    status: { active: 'Действующий', paused: 'На паузе', inactive: 'Неактивный', archived: 'Архив' }[company.status] || company.status,
    inn: company.tax_id || '—', okpo: company.okpo || '—', vat: company.vat_mode || '—',
    addr: company.legal_address || '—', bank: company.bank_name || '—',
    account: company.bank_account_masked || '—', dir: company.director || '—',
    phone: company.phone || '—', email: company.email || '—', contract: company.metrics?.contracts?.join(', ') || '—', requiresESign: Boolean(company.requires_e_sign),
    orders: company.metrics?.orders ?? 0, turnover: company.metrics?.spent || {}, contacts: company.metrics?.employees ?? 0,
  };
}

export { toUiCompany };
