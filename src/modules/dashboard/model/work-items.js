// Attention overlaps the category lists. Keep each task once in the full list.
export function allWorkItems(rowsByTab = {}) {
  const seen = new Set();
  return Object.values(rowsByTab).flatMap((items) => {
    const occurrences = new Map();
    return items.filter((item) => {
      const identity = JSON.stringify([item.cat, item.order, item.title, item.sub, item.right]);
      const occurrence = occurrences.get(identity) || 0;
      occurrences.set(identity, occurrence + 1);
      const key = JSON.stringify([identity, occurrence]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

export function filterWorkItems(items, query = '') {
  const needle = query.trim().toLocaleLowerCase('ru');
  if (!needle) return items;
  return items.filter((item) => [item.title, item.sub, item.order, item.right, item.badge]
    .some((value) => String(value ?? '').toLocaleLowerCase('ru').includes(needle)));
}
