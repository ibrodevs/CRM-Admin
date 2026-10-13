import { SERVICE_KIND } from '../../../shared/constants/service-kind.js';
import { ORGANIZATION_TYPE_LABEL, labelFor } from '../../../shared/constants/backend-labels.js';
import { resolveCurrency } from '../../../shared/lib/money.js';

const SUPPLIER_STATUS = { active: 'Активный', paused: 'На паузе', archived: 'Заблокированный' };

const CONNECTION_TYPE_LABELS = {
  api: 'API',
  local: 'Локальный',
  consolidator: 'Консолидатор',
  gds: 'GDS',
};

function supplierConnectionType(supplier) {
  const explicit = supplier.connection_type || supplier.integration_type || supplier.supplier_type;
  if (explicit) {
    const normalized = String(explicit).trim().toLowerCase();
    return CONNECTION_TYPE_LABELS[normalized] || explicit;
  }

  if (supplier.provider_adapter || supplier.api_adapter || supplier.adapter) return 'API';

  // Hotelbook (HB Pro Expert) is an API hotel provider. Until the backend exposes
  // connection_type in the supplier list, keep its UI classification correct.
  const name = String(supplier.name || '').trim().toLowerCase();
  if (name.includes('hotelbook') || name.includes('hb pro') || name.includes('hb-pro')) return 'API';

  return 'Локальный';
}

function toUiSupplier(supplier) {
  const kind = supplier.service_kinds?.[0] || '';
  const connectionType = supplierConnectionType(supplier);
  const automation = supplier.automation_capabilities || {};

  // SuppliersPage still detects API suppliers through automation.adapter/api_url.
  // Keep that legacy detection in sync with the normalized connection type so
  // existing API providers (including Hotelbook) are not shown as "Локальный".
  const automationCapabilities = connectionType === 'API' && !automation.adapter && !automation.api_url
    ? { ...automation, adapter: supplier.provider_adapter || supplier.api_adapter || supplier.adapter || '__api__' }
    : automation;

  return {
    ...supplier,
    automation_capabilities: automationCapabilities,
    no: supplier.id,
    name: supplier.name,
    org: supplier.legal_name || supplier.name,
    status: SUPPLIER_STATUS[supplier.status] || supplier.status,
    service: SERVICE_KIND[kind] || kind || 'Другое',
    currency: resolveCurrency(supplier.currencies?.[0]),
    commission: 'По правилам наценки',
    type: connectionType,
    scope: supplier.is_global ? 'Глобальный' : 'Локальный',
    orgType: labelFor(ORGANIZATION_TYPE_LABEL, supplier.organization_type, 'Другое'),
  };
}

export { SUPPLIER_STATUS, supplierConnectionType, toUiSupplier };
