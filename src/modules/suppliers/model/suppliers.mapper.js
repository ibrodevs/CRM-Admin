import { SERVICE_KIND } from '../../../shared/constants/service-kind.js';
import { resolveCurrency } from '../../../shared/lib/money.js';

const SUPPLIER_STATUS = { active: 'Активный', paused: 'На паузе', archived: 'Заблокированный' };

function toUiSupplier(supplier) {
  const kind = supplier.service_kinds?.[0] || '';
  return {
    ...supplier,
    no: supplier.id,
    name: supplier.name,
    org: supplier.legal_name || supplier.name,
    status: SUPPLIER_STATUS[supplier.status] || supplier.status,
    service: SERVICE_KIND[kind] || kind || 'Другое',
    currency: resolveCurrency(supplier.currencies?.[0]),
    commission: 'По правилам наценки',
    type: supplier.is_global ? 'Глобальный' : 'Локальный',
    orgType: supplier.organization_type || 'Другое',
  };
}

export { SUPPLIER_STATUS, toUiSupplier };
