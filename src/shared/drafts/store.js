export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
const PREFIX = 'psc:work-draft:v1:';
const pack = (value) => {
  if (value instanceof Date) return { $draftDate: value.toISOString() };
  if (value instanceof Set) return { $draftSet: [...value].map(pack) };
  if (Array.isArray(value)) return value.map(pack);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, pack(item)]));
  return value;
};
const unpack = (value) => {
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && typeof value.$draftDate === 'string') {
      const date = new Date(value.$draftDate);
      if (!Number.isFinite(date.getTime())) throw new Error('Invalid draft date');
      return date;
    }
    if (Object.keys(value).length === 1 && Array.isArray(value.$draftSet)) return new Set(value.$draftSet.map(unpack));
    if (Array.isArray(value)) return value.map(unpack);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unpack(item)]));
  }
  return value;
};

// No authentication tokens or API credentials enter this store. Callers opt in
// only editable fields and navigation. Busy flags and mutations are never saved.
export function createDraftStore(storage, owner, now = Date.now) {
  const prefix = PREFIX + encodeURIComponent(owner) + ':';
  const cache = new Map(), serialized = new Map(), dirty = new Map(), listeners = new Set();
  let status = { restored: false, failed: false, saved: false };
  const announce = (patch) => { status = { ...status, ...patch }; listeners.forEach((fn) => fn()); };
  const key = (scope) => prefix + encodeURIComponent(scope);
  const load = (scope) => {
    if (cache.has(scope)) return cache.get(scope);
    let fields = {};
    try {
      const raw = storage.getItem(key(scope));
      serialized.set(scope, raw);
      if (raw) {
        const record = JSON.parse(raw);
        if (record.version !== 1 || record.owner !== owner || !Number.isFinite(record.savedAt)
            || now() - record.savedAt > DRAFT_TTL || record.savedAt > now() + 60_000
            || !record.fields || typeof record.fields !== 'object' || Array.isArray(record.fields)) {
          storage.removeItem(key(scope));
        } else {
          fields = unpack(record.fields);
          // Loading happens while React renders. Notify from the provider effect,
          // never set another component's state during this read.
          if (Object.keys(fields).length) status = { ...status, restored: true };
        }
      }
    } catch {
      try { storage.removeItem(key(scope)); serialized.set(scope, null); } catch {}
      status = { ...status, failed: true };
    }
    cache.set(scope, fields);
    return fields;
  };
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    status: () => status,
    notify() { listeners.forEach((fn) => fn()); },
    has(scope, field) { return Object.hasOwn(load(scope), field); },
    read(scope, field, fallback) { const fields = load(scope); return Object.hasOwn(fields, field) ? fields[field] : fallback; },
    write(scope, field, value) {
      let fields = { ...load(scope), [field]: value };
      const pending = new Set(dirty.get(scope) || []); pending.add(field);
      try {
        const latest = storage.getItem(key(scope));
        if (latest !== serialized.get(scope)) {
          const record = latest ? JSON.parse(latest) : null;
          const current = record?.version === 1 && record.owner === owner && now() - record.savedAt <= DRAFT_TTL ? unpack(record.fields) : {};
          fields = { ...current, ...Object.fromEntries([...pending].map((name) => [name, fields[name]])) };
        }
        const raw = JSON.stringify({ version: 1, owner, savedAt: now(), fields: pack(fields) });
        storage.setItem(key(scope), raw);
        serialized.set(scope, raw); dirty.delete(scope); cache.set(scope, fields);
        announce({ saved: true, failed: false });
      } catch { cache.set(scope, fields); dirty.set(scope, pending); announce({ failed: true }); }
    },
    clear(scopePrefix = '') {
      try {
        // Include scopes not mounted in the current page.
        for (const name of Object.keys(storage)) {
          if (!name.startsWith(prefix)) continue;
          const scope = decodeURIComponent(name.slice(prefix.length));
          if (scope === scopePrefix || scope.startsWith(scopePrefix + '/') || !scopePrefix) storage.removeItem(name);
        }
        for (const scope of cache.keys()) if (!scopePrefix || scope === scopePrefix || scope.startsWith(scopePrefix + '/')) { cache.delete(scope); serialized.delete(scope); dirty.delete(scope); }
        announce({ restored: false, failed: false, saved: false });
      } catch { announce({ failed: true }); }
    },
    dismiss() { announce({ restored: false }); },
  };
}
