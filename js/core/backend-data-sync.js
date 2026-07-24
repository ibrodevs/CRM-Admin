import {
  CHAT_THREADS,
  CLIENTS,
  CLIENTS_DB,
  COMPANIES_DB,
  CURRENT_USER,
  DOCUMENTS,
  FINANCE,
  FIN_OPS,
  GROUP_PAX,
  NOTIFICATIONS,
  OPERATORS,
  ORDER_PARTICIPANTS,
  ORDER_SERVICES,
  ORDER_TASKS,
  ORDERS,
  PROPOSALS,
  RETURNS,
  SUPPLIERS,
  USERS,
} from '../data';

function replaceArray(target, source) {
  if (!Array.isArray(target) || !Array.isArray(source)) return;
  target.splice(0, target.length, ...source);
}

function uniqueList(values) {
  return [...new Set((values || []).filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function orderParticipantsFrom(orders) {
  return (orders || []).flatMap((order) => (order.participants || []).map((participant) => ({
    ...participant,
    orderId: order.id,
    orderNo: order.no,
  })));
}

function orderTasksFrom(orders) {
  return (orders || []).flatMap((order) => (order.tasks || order.todos || []).map((task) => ({
    ...task,
    orderId: order.id,
    orderNo: order.no,
  })));
}

function financeRowsFrom(transactions) {
  return (transactions || []).map((row) => ({
    ...row,
    no: row.order_number || row.order || row.id,
    org: row.counterparty_name || row.company_name || row.supplier_name || row.client_name || '—',
    service: row.service_kind || row.service || '—',
    sum: row.amount || row.total || 0,
    paid: row.paid_amount || row.amount || 0,
    currency: row.currency || 'USD',
    resp: row.responsible_name || '—',
    status: row.status_display || row.status || '—',
  }));
}

function documentRowsFrom(documents) {
  return (documents || []).map((row) => ({
    ...row,
    no: row.no || row.document_number || row.id,
    client: row.client || row.client_name || '—',
    org: row.org || row.company_name || '—',
    stage: row.stage || row.status || '—',
    type: row.type || row.kind || '—',
    sum: row.sum || row.amount || '—',
    status: row.status || '—',
  }));
}

export function syncLegacyCurrentUser(user) {
  const next = user || {};
  Object.assign(CURRENT_USER, {
    id: next.id || '',
    name: next.name || next.full_name || next.email || 'Пользователь',
    role: next.role || 'CRM',
    email: next.email || next.workEmail || '',
    phone: next.phone || next.workPhone || '',
    avatar: next.avatar || '',
    position: next.position || next.role || '',
    dept: next.dept || next.department || '',
    manager: next.manager || '—',
    workEmail: next.workEmail || next.email || '',
    workPhone: next.workPhone || next.phone || '',
    internalPhone: next.internalPhone || '',
    telegram: next.telegram || '',
    hired: next.hired || '',
    workStatus: next.workStatus || '',
    presence: next.presence || '',
    tz: next.tz || '',
    lang: next.lang || '',
    lastLogin: next.lastLogin || '',
    slaResponseMin: next.slaResponseMin || 15,
  });
  if (typeof window !== 'undefined') window.CURRENT_USER = CURRENT_USER;
  return CURRENT_USER;
}

/**
 * Transitional compatibility layer for the legacy UI.
 *
 * A number of older components still import mutable arrays from `js/data`.
 * Instead of changing their markup, keep those arrays synchronized with the
 * authenticated backend workspace. This prevents demo records from leaking
 * into production flows while the components are migrated incrementally.
 */
export function syncLegacyDataFromWorkspace(workspace) {
  if (!workspace) return;

  const orderParticipants = workspace.orderParticipants || orderParticipantsFrom(workspace.orders);
  const orderTasks = workspace.orderTasks || orderTasksFrom(workspace.orders);
  const clientNames = uniqueList([
    ...(workspace.clients || []).map((client) => client.name),
    ...(workspace.companies || []).map((company) => company.name),
    ...(workspace.orders || []).map((order) => order.client),
  ]);
  const operatorNames = uniqueList([
    ...(workspace.users || []).map((user) => user.name || user.full_name || user.email),
    ...(workspace.orders || []).map((order) => order.operator),
  ]);

  replaceArray(CLIENTS, clientNames);
  replaceArray(OPERATORS, operatorNames);
  replaceArray(ORDERS, workspace.orders || []);
  replaceArray(ORDER_PARTICIPANTS, orderParticipants);
  replaceArray(GROUP_PAX, orderParticipants);
  replaceArray(ORDER_SERVICES, workspace.orderServices || []);
  replaceArray(ORDER_TASKS, orderTasks);
  replaceArray(CLIENTS_DB, workspace.clients || []);
  replaceArray(COMPANIES_DB, workspace.companies || []);
  replaceArray(SUPPLIERS, workspace.suppliers || []);
  replaceArray(NOTIFICATIONS, workspace.notifications || []);
  replaceArray(CHAT_THREADS, workspace.chats || []);
  replaceArray(PROPOSALS, workspace.proposals || []);
  replaceArray(RETURNS, workspace.returns || []);
  replaceArray(USERS, workspace.users || []);
  replaceArray(DOCUMENTS, documentRowsFrom(workspace.documents));
  replaceArray(FINANCE, financeRowsFrom(workspace.transactions));
  replaceArray(FIN_OPS, financeRowsFrom(workspace.transactions));
}
