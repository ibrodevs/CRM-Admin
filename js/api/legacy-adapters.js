const proposalStatus = { draft: 'Черновик', prepared: 'Подготовлено', sent: 'Отправлено клиенту', approved: 'Согласовано', rejected: 'Отклонено', archived: 'Архивировано' };
const returnStatus = { created: 'Создано', review: 'На проверке', awaiting_client_approval: 'Ожидает согласования клиента', submitted_to_supplier: 'Передано поставщику', processing: 'В обработке', completed: 'Завершено', cancelled: 'Отменено', rejected: 'Отклонено' };
const returnType = { refund: 'Возврат билета', exchange: 'Обмен билета', cancellation: 'Аннуляция бронирования', certificate: 'Оформление справки' };
const documentKind = { itinerary_receipt: 'Маршрутная квитанция', ticket: 'Билет', voucher: 'Ваучер', insurance_policy: 'Страховой полис', invoice: 'Счёт', act: 'Акт', contract: 'Договор', passport: 'Паспорт', other: 'Прочее' };
const documentStatus = { draft: 'Черновик', uploaded: 'Сформирован', generated: 'Сформирован', accounting: 'В бухгалтерии', signing: 'На подписи', signed: 'Подписан', void: 'Аннулирован' };
const serviceKind = { avia: 'Авиа', rail: 'ЖД', hotel: 'Гостиница', transfer: 'Трансфер', bus: 'Автобус', tour: 'Тур', insurance: 'Страховка', visa: 'Виза', other: 'Прочее' };
const serviceStatus = { searching: 'Поиск', proposed: 'Предложено', approval: 'На согласовании', booked: 'Забронировано', confirmed: 'Подтверждено', issued: 'Выписано', refund_in_progress: 'Возврат', refunded: 'Возвращено', cancelled: 'Отменено', failed: 'Ошибка' };

function orderFor(orders, id) { return orders.find((order) => order.id === id); }
function date(value) { return value ? new Date(value).toLocaleDateString('ru-RU') : '—'; }
function idOf(item) { return item && (item.serverId || item.id || item); }
function nameOfParticipant(participant) {
  if (!participant) return '';
  if (typeof participant === 'string') return participant;
  return participant.name || participant.person_name || participant.guest_snapshot?.name || participant.guest_snapshot?.full_name || '';
}

export function toLegacyProposal(item, orders = []) {
  const order = orderFor(orders, item.order);
  return {
    ...item,
    serverId: item.id,
    id: item.number,
    order: order?.no || item.order,
    client: order?.client || '—',
    status: proposalStatus[item.status] || item.status,
    validUntil: date(item.valid_until),
    created: date(item.created_at),
    approvedVariant: item.approved_variant,
    variants: (item.variants || []).map((variant) => ({
      ...variant,
      items: (variant.items || []).map((entry) => ({
        ...entry,
        kind: entry.service_kind || 'Услуга',
        sub: entry.description || '',
        cost: Number(entry.price_amount || 0) * Number(entry.quantity || 1),
        fee: 0,
      })),
    })),
    history: [],
  };
}

export function toLegacyReturn(item, orders = [], services = []) {
  const order = orderFor(orders, item.order);
  const service = services.find((row) => String(idOf(row)) === String(item.service));
  const quote = (item.quotes || []).find((row) => String(row.id) === String(item.current_quote)) || (item.quotes || []).slice(-1)[0];
  const snapshot = item.financial_snapshot || {};
  const finSource = quote || snapshot;
  const participantIds = (item.participants || []).map(String);
  const participantNames = participantIds.map((id) => {
    const found = (order?.participants || []).find((participant) => String(idOf(participant)) === id);
    return nameOfParticipant(found);
  }).filter(Boolean);
  return {
    ...item,
    serverId: item.id,
    orderId: item.order,
    no: item.number,
    order: order?.no || item.order,
    client: order?.client || '—',
    type: returnType[item.type] || item.type,
    serviceId: item.service || null,
    service: service ? `${service.kind} · ${service.title}` : (item.service || '—'),
    supplier: service?.supplier || item.supplier || '—',
    initiator: item.initiator === 'client' ? 'Клиент' : 'Оператор',
    resp: item.responsible_name || order?.operator || '—',
    status: returnStatus[item.status] || item.status,
    created: date(item.created_at),
    deadline: date(item.deadline),
    participants: participantNames,
    documents: [],
    history: [],
    currentQuoteVersion: quote?.quote_version || item.client_approved_quote_version || null,
    fin: {
      original: Number(finSource.original_paid || 0),
      supplierPenalty: Number(finSource.supplier_penalty || 0),
      serviceFee: Number(finSource.agency_service_fee || 0),
      extraHold: Number(finSource.other_withholdings || 0),
      refund: Number(finSource.refund_total || snapshot.result || 0),
    },
    finOp: snapshot.refund_id || snapshot.obligation_id || null,
  };
}

export function toLegacyDocument(item, orders = []) {
  const order = orderFor(orders, item.order);
  return {
    ...item,
    serverId: item.id,
    no: item.document_number || `D-${String(item.id).slice(0, 6).toUpperCase()}`,
    name: item.title,
    type: documentKind[item.kind] || item.kind,
    order: order?.no || item.order || '—',
    participant: item.person || '—',
    service: item.service || '—',
    finOp: '—',
    status: documentStatus[item.status] || item.status,
    version: item.current_version || item.version || 0,
    date: item.document_date || date(item.created_at),
    size: '—', versions: [], history: [],
  };
}

export function toLegacyUser(item) {
  const roleNames = { admin: 'Админ', operator: 'Оператор', accountant: 'Бухгалтер', manager: 'Менеджер' };
  const statuses = { active: 'Активный', invited: 'Приглашён', suspended: 'Заблокированный', archived: 'Заблокированный' };
  return { ...item, serverId: item.id, name: item.full_name || item.email, role: roleNames[item.roles?.[0]] || item.roles?.[0] || 'Оператор', status: statuses[item.status] || item.status, last: item.last_login ? new Date(item.last_login).toLocaleString('ru-RU') : '—' };
}

export function toLegacyOrderService(item) {
  return {
    ...item,
    serverId: item.id,
    orderId: item.order,
    id: item.id,
    kind: serviceKind[item.kind] || item.kind,
    status: serviceStatus[item.status] || item.status,
    title: item.title,
    date: item.starts_at ? new Date(item.starts_at).toLocaleString('ru-RU') : '—',
    sum: Number(item.client_total || 0),
    currency: item.currency || 'USD',
    passengers: (item.passengers || []).map((row) => row.name).filter(Boolean),
    participantIds: (item.passengers || []).map((row) => row.participant).filter(Boolean),
    calc: { tariff: Number(item.supplier_cost || 0), taxes: Number(item.taxes || 0), fee: Number(item.agency_fee || 0), markup: Number(item.markup || 0), commission: Number(item.commission || 0), discount: Number(item.discount || 0) },
  };
}

export function toLegacyParticipant(item) {
  const snapshot = item.guest_snapshot || {};
  const documents = snapshot.documents || item.documents || [];
  const primaryDoc = documents[0] || {};
  const docNo = item.booking_document || primaryDoc.docNo || primaryDoc.no || primaryDoc.number || snapshot.document || '';
  return {
    ...item,
    serverId: item.id,
    id: item.id,
    name: item.person_name || snapshot.name || snapshot.full_name || 'Участник',
    role: snapshot.role || (item.role === 'traveler' || item.role === 'passenger' ? 'Взрослый' : item.role),
    phone: snapshot.phone || item.phone || '',
    email: snapshot.email || item.email || '',
    dob: snapshot.dob || snapshot.birth_date || item.dob || '',
    citizenship: snapshot.citizenship || item.citizenship || '',
    documents,
    doc: docNo || '—',
    docStatus: docNo ? 'ok' : 'missing',
    notes: item.notes || snapshot.comment || '',
    isContact: Boolean(item.is_contact),
    lead: Boolean(item.is_contact),
  };
}
