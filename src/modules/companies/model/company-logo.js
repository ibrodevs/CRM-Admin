import { documentsApi } from '../../documents/api.js';
import { resultsOf } from '../../../shared/api/client.js';

// Логотип организации хранится обычным документом с пометкой в metadata:
// отдельного поля под него в API нет, а загрузка уже шла именно так.
export const COMPANY_LOGO_PURPOSE = 'company_logo';

export function isCompanyLogo(document) {
  return (document?.metadata?.purpose || '') === COMPANY_LOGO_PURPOSE;
}

/** URL картинки логотипа для показа в <img>. */
export function companyLogoUrl(document) {
  return document?.id ? documentsApi.previewUrl(document.id) : null;
}

/**
 * Карта companyId → URL логотипа. Один запрос на страницу вместо запроса
 * на каждую компанию; при нескольких загрузках берётся самая свежая.
 */
export async function loadCompanyLogos(signal) {
  const rows = resultsOf(await documentsApi.list({ kind: 'other', page_size: 200 }, signal));
  const logos = {};
  rows.filter(isCompanyLogo).forEach((document) => {
    const company = document.company;
    if (!company) return;
    const current = logos[company];
    if (!current || String(document.created_at || '') > String(current.created_at || '')) logos[company] = document;
  });
  return Object.fromEntries(Object.entries(logos).map(([company, document]) => [company, companyLogoUrl(document)]));
}
