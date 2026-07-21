import {
  addOrderParticipant,
  appendParticipantDocument,
  completeOrderTask,
  loadOrderCard,
  removeOrderParticipant,
  saveOrderEditor,
  updateOrderParticipant,
} from './order-card-controller';

let currentOrder = null;

function requireOrder() {
  const orderId = currentOrder?.id || currentOrder?.serverId;
  if (!orderId) throw new Error('Текущий заказ не выбран или не имеет backend ID');
  return { orderId, order: currentOrder };
}

function notifyChanged(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('travelhub:order-card-changed', { detail }));
}

export function setCurrentOrderContext(order) {
  currentOrder = order || null;
  if (typeof window !== 'undefined') window.__currentOrder = currentOrder;
}

export function getCurrentOrderContext() {
  return currentOrder;
}

export const orderCardRuntime = {
  async reload() {
    const { orderId } = requireOrder();
    const snapshot = await loadOrderCard(orderId);
    notifyChanged(snapshot);
    return snapshot;
  },

  async addParticipant(person) {
    const { orderId } = requireOrder();
    const participants = await addOrderParticipant(orderId, person);
    const detail = { participants };
    notifyChanged(detail);
    return participants;
  },

  async updateParticipant(participant, patch) {
    const { orderId } = requireOrder();
    const participants = await updateOrderParticipant(orderId, participant, patch);
    const detail = { participants };
    notifyChanged(detail);
    return participants;
  },

  async removeParticipant(participant) {
    const { orderId } = requireOrder();
    const participants = await removeOrderParticipant(orderId, participant);
    const detail = { participants };
    notifyChanged(detail);
    return participants;
  },

  async appendDocument(participant, document) {
    const { orderId } = requireOrder();
    const participants = await appendParticipantDocument(orderId, participant, document);
    const detail = { participants };
    notifyChanged(detail);
    return participants;
  },

  async saveEditor(values) {
    const { orderId, order } = requireOrder();
    const snapshot = await saveOrderEditor(orderId, order.version, values);
    currentOrder = { ...order, ...snapshot.order };
    notifyChanged(snapshot);
    return snapshot;
  },

  async completeTask(task) {
    const { orderId } = requireOrder();
    const updated = await completeOrderTask(orderId, task);
    notifyChanged({ completedTask: updated });
    return updated;
  },
};

if (typeof window !== 'undefined') {
  window.__orderCardRuntime = orderCardRuntime;
}
