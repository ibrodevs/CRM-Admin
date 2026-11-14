export function matchesOrderSearch(order, search) {
  const query = String(search || '').trim().toLowerCase();
  return !query || [order.no, order.id, order.client].some((value) =>
    String(value || '').toLowerCase().includes(query));
}

export function orderAssignedTo(order, user) {
  if (user?.id && order.operatorId) return String(order.operatorId) === String(user.id);
  const name = String(user?.name || user?.full_name || '').trim().toLocaleLowerCase('ru');
  return Boolean(name && String(order.operator || '').trim().toLocaleLowerCase('ru') === name);
}
