import { resultsOf } from './client';
import { toLegacyOrderService, toLegacyParticipant } from './legacy-adapters';
import { orderCardApi, participantPayloadFromUi, routePayloadFromUi } from './order-card';

function taskToUi(task) {
  return {
    ...task,
    text: task.title,
    due: task.due_at ? new Date(task.due_at).toLocaleString('ru-RU') : 'без срока',
    urgent: ['critical', 'high'].includes(task.priority),
  };
}

function historyToUi(entry, statusLabels = {}) {
  return {
    t: entry.changed_at ? new Date(entry.changed_at).toLocaleString('ru-RU') : '',
    text: entry.reason || `Статус: ${statusLabels[entry.to_status] || entry.to_status}`,
    who: entry.changed_by ? 'Пользователь' : 'Система',
  };
}

export async function loadOrderCard(orderId, { signal, statusLabels = {} } = {}) {
  const [overview, tasksPayload, historyPayload] = await Promise.all([
    orderCardApi.overview(orderId, signal),
    orderCardApi.tasks(orderId, { status: 'open' }, signal),
    orderCardApi.history(orderId, {}, signal),
  ]);
  const liveOrder = overview.order || {};
  return {
    order: liveOrder,
    status: liveOrder.status,
    version: liveOrder.version,
    services: (overview.services || []).map(toLegacyOrderService),
    participants: (liveOrder.participants || []).map(toLegacyParticipant),
    tasks: resultsOf(tasksPayload).map(taskToUi),
    history: resultsOf(historyPayload).map((entry) => historyToUi(entry, statusLabels)),
    allowedTransitions: overview.allowed_actions?.transitions || [],
    financeSummary: overview.finance_summary || null,
    route: liveOrder.route || null,
  };
}

export async function addOrderParticipant(orderId, person) {
  await orderCardApi.addParticipant(orderId, participantPayloadFromUi(person));
  const participants = await orderCardApi.participants(orderId);
  return resultsOf(participants).map(toLegacyParticipant);
}

export async function updateOrderParticipant(orderId, participant, patch) {
  const participantId = participant.serverId || participant.id;
  if (!participantId) throw new Error('Для пассажира не найден backend ID');
  const next = { ...participant, ...patch };
  await orderCardApi.updateParticipant(orderId, participantId, participantPayloadFromUi(next));
  const participants = await orderCardApi.participants(orderId);
  return resultsOf(participants).map(toLegacyParticipant);
}

export async function removeOrderParticipant(orderId, participant) {
  const participantId = participant.serverId || participant.id;
  if (!participantId) throw new Error('Для пассажира не найден backend ID');
  await orderCardApi.removeParticipant(orderId, participantId);
  const participants = await orderCardApi.participants(orderId);
  return resultsOf(participants).map(toLegacyParticipant);
}

export async function appendParticipantDocument(orderId, participant, document) {
  const participantId = participant.serverId || participant.id;
  if (!participantId) throw new Error('Для пассажира не найден backend ID');
  const documents = [...(participant.documents || []), document];
  const next = { ...participant, documents, docStatus: 'ok' };
  await orderCardApi.updateParticipant(orderId, participantId, participantPayloadFromUi(next));
  const participants = await orderCardApi.participants(orderId);
  return resultsOf(participants).map(toLegacyParticipant);
}

export async function saveOrderEditor(orderId, orderVersion, values) {
  const { trip, points, depDate, retDate, routeVersion, purpose, comment, plannedStart, plannedEnd } = values;
  const operations = [];
  if (points?.filter(Boolean).length >= 2) {
    operations.push(orderCardApi.updateRoute(orderId, routePayloadFromUi({
      trip,
      points,
      depDate,
      retDate,
      version: routeVersion,
    })));
  }
  operations.push(orderCardApi.updateOrder(orderId, {
    version: orderVersion,
    purpose: purpose || '',
    comment: comment || '',
    planned_start: plannedStart || null,
    planned_end: plannedEnd || null,
  }));
  await Promise.all(operations);
  return loadOrderCard(orderId);
}

export async function completeOrderTask(orderId, task) {
  const updated = await orderCardApi.updateTask(orderId, task.id, { status: 'completed' });
  return taskToUi(updated);
}
