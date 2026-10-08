export function matchesOrderSearch(order, search) {
  const query = String(search || '').trim().toLowerCase();
  return !query || [order.no, order.id, order.client].some((value) =>
    String(value || '').toLowerCase().includes(query));
}
