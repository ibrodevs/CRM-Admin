const ORDER_STATUS = {
  new: 'Новое', in_progress: 'В работе', awaiting_confirmation: 'Ожидает подтверж.',
  awaiting_payment: 'Ожидание оплаты', paid: 'Оплачено', completed: 'Оплачено',
  needs_review: 'Требует проверки', on_hold: 'На паузе', cancelled: 'Отменено', data_missing: 'Нет данных',
};
const REQUEST_TYPE = { individual: 'Индивидуальная', group: 'Групповая', corporate: 'Корпоративная' };
const SUPPLIER_STATUS = { active: 'Активный', paused: 'На паузе', archived: 'Заблокированный' };
const SERVICE_KIND = {
  avia: 'Авиа', rail: 'ЖД', hotel: 'Отель', transfer: 'Трансфер', bus: 'Автобус',
  tour: 'Тур', visa: 'Виза', insurance: 'Страховка', other: 'Другое',
};

export function toUiUser(user) {
  const roleCode = user?.roles?.[0] || 'operator';
  const role = { admin: 'Админ', operator: 'Оператор', accountant: 'Бухгалтер', manager: 'Руководитель' }[roleCode] || roleCode;
  return {
    ...user,
    name: user?.full_name || [user?.last_name, user?.first_name, user?.middle_name].filter(Boolean).join(' '),
    role,
    avatar: user?.avatar || 'assets/avatar-aisuluu.png',
    position: user?.position || role,
    dept: user?.department || '',
    workEmail: user?.email || '',
    workPhone: user?.work_phone || user?.phone || '',
    internalPhone: user?.internal_phone || '',
    hired: user?.hired_at || '',
    workStatus: { working: 'Работает', vacation: 'Отпуск', sick_leave: 'Больничный', day_off: 'Выходной' }[user?.work_status] || user?.work_status || '',
    presence: { online: 'Онлайн', away: 'Отошёл', busy: 'Занят', offline: 'Не в сети' }[user?.presence] || user?.presence || '',
    tz: user?.timezone || 'Asia/Bishkek',
    lang: { ru: 'Русский', ky: 'Кыргызча', en: 'English' }[user?.language] || user?.language || 'Русский',
    slaResponseMin: user?.sla_response_minutes || 15,
  };
}

export function toUiOrder(order) {
  const date = order.created_at ? new Date(order.created_at) : new Date();
  return {
    ...order,
    id: order.id,
    no: order.number,
    client: order.client_name || '—',
    requestType: REQUEST_TYPE[order.request_type] || order.request_type,
    status: ORDER_STATUS[order.status] || order.status_display || order.status,
    statusCode: order.status,
    service: order.service_kind ? (SERVICE_KIND[order.service_kind] || order.service_kind) : 'Новое',
    operator: order.operator_name || 'Не назначен',
    operatorRole: 'Оператор',
    sum: Number(order.total_amount || 0),
    currency: order.base_currency || 'USD',
    services: Number(order.services_count || 0),
    progress: order.stage === 'completed' ? 100 : 0,
    date: date.toLocaleDateString('ru-RU'),
    createdOn: date,
  };
}

export function toUiSupplier(supplier) {
  const kind = supplier.service_kinds?.[0] || '';
  return {
    ...supplier,
    no: supplier.id,
    name: supplier.name,
    org: supplier.legal_name || supplier.name,
    status: SUPPLIER_STATUS[supplier.status] || supplier.status,
    service: SERVICE_KIND[kind] || kind || 'Другое',
    currency: supplier.currencies?.[0] || 'USD',
    commission: 'По правилам наценки',
    type: supplier.is_global ? 'Глобальный' : 'Локальный',
    orgType: supplier.organization_type || 'Другое',
  };
}

export function toUiNotification(notification) {
  const priority = { critical: 'Критический', high: 'Высокий', medium: 'Средний', info: 'Информационный', low: 'Информационный' }[notification.priority] || notification.priority;
  const source = { system: 'Система', orders: 'Заказы', finance: 'Финансы', documents: 'Документы', integrations: 'Интеграции', communications: 'Чаты', services: 'Услуги' }[notification.source] || notification.source || 'Система';
  return {
    ...notification,
    priority, source,
    desc: notification.body,
    read: Boolean(notification.read_at),
    pinned: Boolean(notification.pinned_at),
    date: notification.created_at,
    link: notification.deep_link || null,
  };
}

export function toUiThread(thread) {
  return {
    ...thread,
    orderId: thread.order,
    order: thread.order_number || thread.order,
    name: thread.title,
    unread: thread.unread_count || 0,
    last: thread.last_message?.body || '',
    time: thread.last_message?.created_at || thread.created_at,
    channel: thread.external_channel || 'CRM',
    pinned: Boolean(thread.pinned),
    connectionStatus: thread.status === 'active' ? 'Подключено' : thread.status,
    createdAt: thread.created_at ? new Date(thread.created_at).toLocaleDateString('ru-RU') : '',
    messages: [], internal: [], participants: [], relatedServices: thread.service ? [thread.service] : [],
  };
}

export function toUiMessage(message, currentUserId) {
  return {
    id: message.id,
    from: message.author_user === currentUserId ? 'me' : message.author_user ? 'operator' : 'external',
    author: message.author_name || message.author_external || '',
    text: message.body || '',
    internal: Boolean(message.is_internal),
    time: message.created_at ? new Date(message.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '',
    read: ['read', 'delivered'].includes(message.delivery_state),
    attach: message.attachment ? {
      id: message.attachment,
      documentId: message.attachment_document,
      name: message.attachment_name || 'Вложение',
      size: message.attachment_size ? `${Math.max(1, Math.round(message.attachment_size / 1024))} КБ` : '',
    } : null,
  };
}

export function toUiClient(profile) {
  const person = profile.person_detail || {};
  const created = profile.created_at ? new Date(profile.created_at) : new Date();
  return {
    ...profile,
    id: person.id || profile.person,
    profileId: profile.id,
    name: person.full_name || [person.surname, person.given_name, person.middle_name].filter(Boolean).join(' '),
    type: profile.client_type === 'corporate' ? 'Корпоративный' : 'Физлицо',
    status: { active: 'Активный', vip: 'VIP', inactive: 'Неактивный', new: 'Новый' }[profile.status] || profile.status,
    phone: person.phone || '—', email: person.email || '—', city: person.city || '—',
    doc: '—', dob: person.birth_date || '—', citizenship: person.citizenship || '', company: '—',
    since: created.toLocaleDateString('ru-RU'), orders: 0, spent: 0, debt: 0,
    source: person,
  };
}

export function toUiCompany(company) {
  return {
    ...company,
    id: company.id, name: company.short_name || company.legal_name, shortName: company.short_name,
    fullName: company.legal_name, type: company.type || 'Организация',
    status: { active: 'Действующий', inactive: 'Неактивный', archived: 'Архивный' }[company.status] || company.status,
    inn: company.tax_id || '—', okpo: company.okpo || '—', vat: company.vat_mode || '—',
    addr: company.legal_address || '—', bank: company.bank_name || '—',
    account: company.bank_account_masked || '—', dir: company.director || '—',
    phone: company.phone || '—', email: company.email || '—', contract: '—',
    orders: 0, turnover: 0, contacts: company.director ? 1 : 0,
  };
}
