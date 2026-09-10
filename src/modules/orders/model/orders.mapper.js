import { SERVICE_KIND } from '../../../shared/constants/service-kind.js';
import { asDate } from '../../../shared/lib/adapter-dates.js';
import { resolveCurrency } from '../../../shared/lib/money.js';

const ORDER_STATUS = {
  new: 'Новое', in_progress: 'В работе', awaiting_confirmation: 'Ожидает подтверж.',
  awaiting_payment: 'Ожидание оплаты', paid: 'Оплачено', completed: 'Завершено',
  needs_review: 'Требует проверки', on_hold: 'На паузе', cancelled: 'Отменено', data_missing: 'Нет данных',
};

const REQUEST_TYPE = { individual: 'Индивидуальная', group: 'Групповая', corporate: 'Корпоративная' };

function toUiOrder(order) {
  const date = asDate(order.created_at);
  return {
    ...order,
    id: order.id,
    no: order.number,
    client: order.client_name || '—',
    requestType: REQUEST_TYPE[order.request_type] || order.request_type,
    status: ORDER_STATUS[order.status] || order.status_display || order.status,
    statusCode: order.status,
    service: order.service_kind ? (SERVICE_KIND[order.service_kind] || order.service_kind) : 'Новое',
    operatorId: order.operator || null,
    operator: order.operator_name || 'Не назначен',
    operatorRole: 'Оператор',
    sum: Number(order.total_amount || 0),
    currency: resolveCurrency(order.base_currency),
    totals: order.totals_by_currency || [{ amount: order.total_amount || 0, currency: resolveCurrency(order.base_currency) }],
    services: Number(order.services_count || 0),
    progress: order.stage === 'completed' ? 100 : 0,
    date: date ? date.toLocaleDateString('ru-RU') : '',
    createdOn: date,
  };
}

export { ORDER_STATUS, REQUEST_TYPE, toUiOrder };
