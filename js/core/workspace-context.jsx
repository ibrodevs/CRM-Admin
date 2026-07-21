import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resultsOf } from '../api/client';
import { toUiClient, toUiCompany, toUiNotification, toUiOrder, toUiSupplier, toUiThread } from '../api/adapters';
import { toLegacyDocument, toLegacyProposal, toLegacyReturn, toLegacyUser } from '../api/legacy-adapters';
import { communicationsApi, crmApi, notificationsApi, ordersApi, suppliersApi, workspaceApi } from '../api/resources';
import { useAuth } from './auth-context';

const WorkspaceContext = createContext(null);

const EMPTY = {
  orders: [], suppliers: [], persons: [], clients: [], companies: [], notifications: [], chats: [],
  proposals: [], documents: [], returns: [], transactions: [], users: [], calendar: null, dashboard: null, finance: null, meta: null,
};

const REQUEST_TYPE = {
  'Индивидуальная': 'individual', 'Групповая': 'group', 'Корпоративная': 'corporate',
  individual: 'individual', group: 'group', corporate: 'corporate',
};

function sameId(a, b) { return String(a || '') === String(b || ''); }

export function WorkspaceProvider({ children }) {
  const { status } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async (signal) => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);
    const calls = {
      orders: ordersApi.list({}, signal), suppliers: suppliersApi.list({}, signal),
      persons: crmApi.persons({}, signal), clients: crmApi.clients({}, signal), companies: crmApi.companies({}, signal),
      notifications: notificationsApi.list({}, signal), chats: communicationsApi.threads({}, signal),
      proposals: workspaceApi.proposals({}, signal), documents: workspaceApi.documents({}, signal),
      returns: workspaceApi.returns({}, signal), transactions: workspaceApi.transactions({}, signal),
      users: workspaceApi.users({}, signal), calendar: workspaceApi.calendar({}, signal), dashboard: workspaceApi.dashboard({ role_scope: 'tenant' }, signal),
      finance: workspaceApi.financeOverview(signal), meta: workspaceApi.meta(signal),
    };
    const entries = Object.entries(calls);
    const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
    if (signal?.aborted) return;
    const next = { ...EMPTY };
    const failures = [];
    settled.forEach((result, index) => {
      const key = entries[index][0];
      if (result.status === 'fulfilled') next[key] = result.value;
      else if (result.reason?.status !== 403) failures.push(result.reason);
    });
    next.orders = resultsOf(next.orders).map(toUiOrder);
    next.suppliers = resultsOf(next.suppliers).map(toUiSupplier);
    next.persons = resultsOf(next.persons);
    next.clients = resultsOf(next.clients).map(toUiClient);
    next.companies = resultsOf(next.companies).map(toUiCompany);
    next.notifications = resultsOf(next.notifications).map(toUiNotification);
    next.chats = resultsOf(next.chats).map(toUiThread);
    next.chats = next.chats.map((thread) => {
      const order = next.orders.find((item) => sameId(item.id, thread.orderId));
      return { ...thread, order: order?.no || thread.orderId, client: order?.client || thread.name, responsibleOperator: order?.operator || '' };
    });
    next.proposals = resultsOf(next.proposals).map((item) => toLegacyProposal(item, next.orders));
    next.documents = resultsOf(next.documents).map((item) => toLegacyDocument(item, next.orders));
    next.returns = resultsOf(next.returns).map((item) => toLegacyReturn(item, next.orders));
    next.transactions = resultsOf(next.transactions);
    next.users = resultsOf(next.users).map(toLegacyUser);
    setData(next);
    setError(failures[0] || null);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setData(EMPTY);
      return undefined;
    }
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
  }, [status, reload]);

  // UI-only updates remain available for temporary presentation state. Business
  // mutations must use the backend-first methods below.
  const update = useCallback((key, updater) => {
    setData((current) => ({ ...current, [key]: typeof updater === 'function' ? updater(current[key]) : updater }));
  }, []);

  const createOrder = useCallback(async (draft = {}) => {
    const person = data.clients.find((item) => sameId(item.id, draft.client_person) || item.name === draft.client);
    const company = data.companies.find((item) => sameId(item.id, draft.client_company) || item.name === draft.client);
    const body = {
      request_type: REQUEST_TYPE[draft.request_type || draft.requestType] || 'individual',
      client_person: draft.client_person || person?.id || null,
      client_company: draft.client_company || company?.id || null,
      priority: draft.priority || 'normal',
      source: draft.source || 'web',
      preferred_channel: draft.preferred_channel || draft.channel || '',
      base_currency: draft.base_currency || draft.currency || 'USD',
      planned_start: draft.planned_start || draft.dateFrom || null,
      planned_end: draft.planned_end || draft.dateTo || null,
      purpose: draft.purpose || draft.service || '',
      comment: draft.comment || '',
      participants: Array.isArray(draft.participants) ? draft.participants : [],
    };
    if (!body.client_person && !body.client_company) {
      const err = new Error('Для создания заказа выберите существующего клиента или компанию');
      err.code = 'CLIENT_REQUIRED';
      throw err;
    }
    const created = await ordersApi.create(body);
    const ui = toUiOrder(created);
    setData((current) => ({ ...current, orders: [ui, ...current.orders.filter((item) => item.id !== ui.id)] }));
    return ui;
  }, [data.clients, data.companies]);

  const updateOrder = useCallback(async (id, patch) => {
    const saved = await ordersApi.update(id, patch);
    const ui = toUiOrder(saved);
    setData((current) => ({ ...current, orders: current.orders.map((item) => item.id === ui.id ? ui : item) }));
    return ui;
  }, []);

  const createPersonClient = useCallback(async (draft = {}) => {
    const source = draft.source || draft;
    const person = await crmApi.createPerson({
      surname: source.surname || source.last_name || String(draft.name || '').split(' ')[0] || 'Клиент',
      given_name: source.given_name || source.first_name || String(draft.name || '').split(' ').slice(1).join(' ') || 'Без имени',
      middle_name: source.middle_name || '',
      phone: source.phone || draft.phone || '',
      email: source.email || draft.email || '',
      birth_date: source.birth_date || draft.dob || null,
      citizenship: source.citizenship || draft.citizenship || '',
      city: source.city || draft.city || '',
    });
    const profile = await crmApi.createClient({
      person: person.id,
      client_type: draft.client_type || (draft.type === 'Корпоративный' ? 'corporate' : 'individual'),
      status: draft.status_code || 'active',
    });
    const ui = toUiClient({ ...profile, person_detail: person });
    setData((current) => ({ ...current, persons: [person, ...current.persons], clients: [ui, ...current.clients] }));
    return ui;
  }, []);

  const updatePerson = useCallback(async (personId, patch) => {
    const person = await crmApi.updatePerson(personId, patch);
    setData((current) => ({
      ...current,
      persons: current.persons.map((item) => item.id === person.id ? person : item),
      clients: current.clients.map((item) => item.id === person.id ? toUiClient({ ...item, person_detail: person }) : item),
    }));
    return person;
  }, []);

  const createCompany = useCallback(async (draft = {}) => {
    const created = await crmApi.createCompany({
      legal_name: draft.legal_name || draft.fullName || draft.name,
      short_name: draft.short_name || draft.shortName || draft.name,
      status: draft.status_code || 'active',
      tax_id: draft.tax_id || draft.inn || '',
      okpo: draft.okpo || '',
      legal_address: draft.legal_address || draft.addr || '',
      phone: draft.phone || '',
      email: draft.email || '',
      director: draft.director || draft.dir || '',
    });
    const ui = toUiCompany(created);
    setData((current) => ({ ...current, companies: [ui, ...current.companies] }));
    return ui;
  }, []);

  const updateCompany = useCallback(async (id, patch) => {
    const saved = await crmApi.updateCompany(id, patch);
    const ui = toUiCompany(saved);
    setData((current) => ({ ...current, companies: current.companies.map((item) => item.id === ui.id ? ui : item) }));
    return ui;
  }, []);

  const createSupplier = useCallback(async (draft = {}) => {
    const saved = await suppliersApi.create({
      name: draft.name,
      legal_name: draft.legal_name || draft.org || draft.name,
      status: draft.status_code || 'active',
      organization_type: draft.organization_type || draft.orgType || 'other',
      service_kinds: draft.service_kinds || [],
      currencies: draft.currencies || [draft.currency || 'USD'],
      is_global: Boolean(draft.is_global || draft.type === 'Глобальный'),
    });
    const ui = toUiSupplier(saved);
    setData((current) => ({ ...current, suppliers: [ui, ...current.suppliers] }));
    return ui;
  }, []);

  const updateSupplier = useCallback(async (id, patch) => {
    const saved = await suppliersApi.update(id, patch);
    const ui = toUiSupplier(saved);
    setData((current) => ({ ...current, suppliers: current.suppliers.map((item) => item.id === ui.id ? ui : item) }));
    return ui;
  }, []);

  const value = useMemo(() => ({
    ...data, loading, error, reload, update,
    createOrder, updateOrder, createPersonClient, updatePerson,
    createCompany, updateCompany, createSupplier, updateSupplier,
  }), [
    data, loading, error, reload, update, createOrder, updateOrder,
    createPersonClient, updatePerson, createCompany, updateCompany,
    createSupplier, updateSupplier,
  ]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
