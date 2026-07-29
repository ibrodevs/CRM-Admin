const proposalStatus = { draft: 'Черновик', prepared: 'Подготовлено', sent: 'Отправлено клиенту', approved: 'Согласовано', rejected: 'Отклонено', archived: 'Архивировано' };
const returnStatus = { created: 'Создано', review: 'На проверке', awaiting_client_approval: 'Ожидает согласования клиента', submitted_to_supplier: 'Передано поставщику', processing: 'В обработке', completed: 'Завершено', cancelled: 'Отменено', rejected: 'Отклонено' };
const returnType = { refund: 'Возврат билета', exchange: 'Обмен билета', cancellation: 'Аннуляция бронирования', certificate: 'Оформление справки' };
const documentKind = { itinerary_receipt: 'Маршрутная квитанция', ticket: 'Билет', voucher: 'Ваучер', insurance_policy: 'Страховой полис', invoice: 'Счёт', act: 'Акт', contract: 'Договор', passport: 'Паспорт', other: 'Прочее' };
const documentStatus = { draft: 'Черновик', uploaded: 'Сформирован', generated: 'Сформирован', accounting: 'В бухгалтерии', signing: 'На подписи', signed: 'Подписан', void: 'Аннулирован' };
const serviceKind = { avia: 'Авиа', rail: 'ЖД', hotel: 'Гостиница', transfer: 'Трансфер', bus: 'Автобус', tour: 'Тур', insurance: 'Страховка', visa: 'Виза', other: 'Прочее' };
const serviceStatus = { searching: 'Поиск', proposed: 'Предложено', approval: 'На согласовании', booked: 'Забронировано', confirmed: 'Подтверждено', issued: 'Выписано', refund_in_progress: 'Возврат', refunded: 'Возвращено', cancelled: 'Отменено', failed: 'Ошибка' };

function orderFor(orders, id) { return orders.find((order) => order.id === id); }
function asDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function date(value) {
  const parsed = asDate(value);
  return parsed ? parsed.toLocaleDateString('ru-RU') : '—';
}
function dateTime(value) {
  const parsed = asDate(value);
  return parsed ? parsed.toLocaleString('ru-RU') : '—';
}
function idOf(item) { return item && (item.serverId || item.id || item); }
function nameOfParticipant(participant) {
  if (!participant) return '';
  if (typeof participant === 'string') return participant;
  return participant.name || participant.person_name || participant.guest_snapshot?.name || participant.guest_snapshot?.full_name || '';
}

function receiptDraftFromMetadata(item) {
  const metadata = item?.metadata || {};
  const receiptImport = metadata.receipt_import || {};
  const supplierOriginal = metadata.supplier_original || {};
  const stored = supplierOriginal.verified_data
    || receiptImport.verified_data
    || receiptImport.corrected_fields
    || null;
  if (!stored || typeof stored !== 'object') return null;

  const passenger = stored.passenger || stored.passenger_name || '';
  const legs = stored.legs || stored.segments || [];
  const parserStatus = String(receiptImport.parser_status || '').toLowerCase();
  const confirmed = receiptImport.stage === 'confirmed';
  return {
    ...stored,
    carrier: stored.carrier || stored.issuer || '',
    passenger,
    passengers: stored.passengers || (passenger ? [{
      name: passenger,
      dob: stored.dob || stored.date_of_birth || '',
      document: stored.docNo || stored.document_number || '',
      ticketNo: stored.ticketNo || stored.ticket_number || '',
    }] : []),
    legs,
    ref: stored.ref || stored.reference || '',
    supplierOrderNo: stored.supplierOrderNo || stored.supplier_order_number || '',
    hotelBookingNo: stored.hotelBookingNo || stored.hotel_booking_number || '',
    ticketNo: stored.ticketNo || stored.ticket_number || '',
    docNo: stored.docNo || stored.document_number || '',
    dob: stored.dob || stored.date_of_birth || '',
    issueDate: stored.issueDate || stored.issue_date || '',
    cls: stored.cls || stored.booking_class || '',
    fareBasis: stored.fareBasis || stored.fare_basis || '',
    handBaggage: stored.handBaggage || stored.hand_baggage || '',
    tripType: stored.tripType || stored.trip_type || (receiptImport.service_kind === 'hotel' ? 'stay' : 'oneway'),
    taxBreakdown: stored.taxBreakdown || stored.tax_breakdown || [],
    feeBreakdown: stored.feeBreakdown || stored.fee_breakdown || [],
    output: stored.output || supplierOriginal.output_settings,
    auditLog: stored.auditLog || supplierOriginal.audit_log || [],
    originalTotal: stored.originalTotal ?? receiptImport.original_total ?? stored.total ?? item.amount ?? 0,
    recognitionPending: stored.recognitionPending ?? (!confirmed && parserStatus !== 'parsed'),
    manualCompletion: stored.manualCompletion ?? (confirmed && parserStatus !== 'parsed'),
  };
}

export function toLegacyProposal(item, orders = []) {
  const order = orderFor(orders, item.order);
  return {
    ...item,
    serverId: item.id,
    id: item.number,
    order: order?.no || item.order || null,
    client: order?.client || item.recipient || 'Без получателя',
    status: proposalStatus[item.status] || item.status,
    docType: item.type === 'train' ? 'train' : 'generic',
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
  const metadata = item.metadata || {};
  const receiptImport = metadata.receipt_import || {};
  const supplierOriginal = metadata.supplier_original || {};
  const parsed = receiptDraftFromMetadata(item);
  const serviceKindValue = receiptImport.service_kind || parsed?.service_kind || '';
  const serviceTypeValue = receiptImport.service_type || parsed?.service_type || serviceKind[serviceKindValue] || '';
  return {
    ...item,
    serverId: item.id,
    orderId: item.order || null,
    personId: item.person || null,
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
    parsed,
    service_kind: serviceKindValue,
    service_type: serviceTypeValue,
    supplier_original: {
      ...supplierOriginal,
      verified_data: parsed || supplierOriginal.verified_data,
    },
    size: '—', versions: [], history: [],
  };
}

export function toLegacyUser(item) {
  const roleNames = { admin: 'Админ', operator: 'Оператор', accountant: 'Бухгалтер', manager: 'Менеджер' };
  const statuses = { active: 'Активный', invited: 'Приглашён', suspended: 'Заблокированный', archived: 'Заблокированный' };
  return { ...item, serverId: item.id, name: item.full_name || item.email, role: roleNames[item.roles?.[0]] || item.roles?.[0] || 'Оператор', status: statuses[item.status] || item.status, last: dateTime(item.last_login) };
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
    date: dateTime(item.starts_at),
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
