import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resourceStatusFromError, resultsOf } from '../api/client';
import { toUiClient, toUiCompany, toUiNotification, toUiOrder, toUiSupplier, toUiThread } from '../api/adapters';
import { toLegacyDocument, toLegacyOrderService, toLegacyProposal, toLegacyReturn, toLegacyUser } from '../api/legacy-adapters';
import { communicationsApi, crmApi, notificationsApi, ordersApi, servicesApi, suppliersApi, workspaceApi } from '../api/resources';
import { useAuth } from './auth-context';
import { syncLegacyDataFromWorkspace } from './backend-data-sync';

const WorkspaceContext = createContext(null);

const EMPTY = {
  orders: [], suppliers: [], persons: [], clients: [], companies: [], notifications: [], chats: [],
  proposals: [], documents: [], returns: [], orderServices: [], transactions: [], users: [], calendar: null, dashboard: null, finance: null, meta: null,
};

const RESOURCE_KEYS = Object.keys(EMPTY);

function emptyFor(key) {
  return Array.isArray(EMPTY[key]) ? [] : EMPTY[key];
}

function makeResource(data = [], status = 'idle', error = null, lastLoadedAt = null) {
  const empty = Array.isArray(data) ? data.length === 0 : data == null;
  return { data, status: status === 'success' && empty ? 'empty' : status, error, lastLoadedAt };
}

function initialResources() {
  return RESOURCE_KEYS.reduce((acc, key) => {
    acc[key] = makeResource(emptyFor(key));
    return acc;
  }, {});
}

function legacyWorkspaceFromData(value) {
  return {
    orders: value.orders,
    suppliers: value.suppliers,
    clients: value.clients,
    companies: value.companies,
    notifications: value.notifications,
    chats: value.chats,
    proposals: value.proposals,
    returns: value.returns,
    orderServices: value.orderServices,
    users: value.users,
  };
}

const REQUEST_TYPE = {
  'Индивидуальная': 'individual', 'Групповая': 'group', 'Корпоративная': 'corporate',
  individual: 'individual', group: 'group', corporate: 'corporate',
};

function sameId(a, b) { return String(a || '') === String(b || ''); }

export function WorkspaceProvider({ children }) {
  const { status } = useAuth();
  const [data, setData] = useState(EMPTY);
  const [resources, setResources] = useState(() => initialResources());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async (signal) => {
    if (status !== 'authenticated') return;
    setLoading(true);
    setError(null);
    setResources((current) => RESOURCE_KEYS.reduce((acc, key) => {
      acc[key] = makeResource(current[key]?.data ?? emptyFor(key), 'loading', null, current[key]?.lastLoadedAt || null);
      return acc;
    }, {}));
    const calls = {
      orders: ordersApi.list({}, signal), suppliers: suppliersApi.list({}, signal),
      persons: crmApi.persons({}, signal), clients: crmApi.clients({}, signal), companies: crmApi.companies({}, signal),
      notifications: notificationsApi.list({}, signal), chats: communicationsApi.threads({}, signal),
      proposals: workspaceApi.proposals({}, signal), documents: workspaceApi.documents({}, signal),
      returns: workspaceApi.returns({}, signal), orderServices: servicesApi.list({}, signal),
      transactions: workspaceApi.transactions({}, signal),
      users: workspaceApi.users({}, signal), calendar: workspaceApi.calendar({}, signal), dashboard: workspaceApi.dashboard({ role_scope: 'tenant' }, signal),
      finance: workspaceApi.financeOverview(signal), meta: workspaceApi.meta(signal),
    };
    const entries = Object.entries(calls);
    const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
    if (signal?.aborted) return;
    const raw = { ...EMPTY };
    const nextResources = {};
    const failures = [];
    settled.forEach((result, index) => {
      const key = entries[index][0];
      if (result.status === 'fulfilled') raw[key] = result.value;
      else {
        nextResources[key] = makeResource(emptyFor(key), resourceStatusFromError(result.reason), result.reason);
        failures.push(result.reason);
      }
    });
    const next = { ...EMPTY };
    next.orders = resultsOf(raw.orders).map(toUiOrder);
    next.suppliers = resultsOf(raw.suppliers).map(toUiSupplier);
    next.persons = resultsOf(raw.persons);
    next.clients = resultsOf(raw.clients).map(toUiClient);
    next.companies = resultsOf(raw.companies).map(toUiCompany);
    next.notifications = resultsOf(raw.notifications).map(toUiNotification);
    next.chats = resultsOf(raw.chats).map(toUiThread);
    next.chats = next.chats.map((thread) => {
      const order = next.orders.find((item) => sameId(item.id, thread.orderId));
      return { ...thread, order: order?.no || thread.orderId, client: order?.client || thread.name, responsibleOperator: order?.operator || '' };
    });
    next.proposals = resultsOf(raw.proposals).map((item) => toLegacyProposal(item, next.orders));
    next.documents = resultsOf(raw.documents).map((item) => toLegacyDocument(item, next.orders));
    next.orderServices = resultsOf(raw.orderServices).map(toLegacyOrderService);
    next.returns = resultsOf(raw.returns).map((item) => toLegacyReturn(item, next.orders, next.orderServices));
    next.transactions = resultsOf(raw.transactions);
    next.users = resultsOf(raw.users).map(toLegacyUser);
    next.calendar = raw.calendar;
    next.dashboard = raw.dashboard;
    next.finance = raw.finance;
    next.meta = raw.meta;
    const loadedAt = new Date().toISOString();
    RESOURCE_KEYS.forEach((key) => {
      if (!nextResources[key]) nextResources[key] = makeResource(next[key], 'success', null, loadedAt);
    });
    setData(next);
    setResources(nextResources);
    syncLegacyDataFromWorkspace(legacyWorkspaceFromData(next));
    setError(failures[0] || null);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setData(EMPTY);
      setResources(initialResources());
      return undefined;
    }
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
  }, [status, reload]);

  // UI-only updates remain available for temporary presentation state. Business
  // mutations must use the backend-first methods below.
  const update = useCallback((key, updater) => {
    setData((current) => {
      const nextValue = typeof updater === 'function' ? updater(current[key]) : updater;
      const next = { ...current, [key]: nextValue };
      setResources((currentResources) => ({
        ...currentResources,
        [key]: makeResource(nextValue, 'success', null, new Date().toISOString()),
      }));
      if (['orders', 'suppliers', 'clients', 'companies', 'notifications', 'chats', 'proposals', 'returns', 'orderServices', 'users'].includes(key)) {
        syncLegacyDataFromWorkspace(legacyWorkspaceFromData(next));
      }
      return next;
    });
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
    update('orders', (current) => [ui, ...current.filter((item) => item.id !== ui.id)]);
    return ui;
  }, [data.clients, data.companies, update]);

  const updateOrder = useCallback(async (id, patch) => {
    const saved = await ordersApi.update(id, patch);
    const ui = toUiOrder(saved);
    update('orders', (current) => current.map((item) => item.id === ui.id ? ui : item));
    return ui;
  }, [update]);

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
    setData((current) => {
      const next = { ...current, persons: [person, ...current.persons], clients: [ui, ...current.clients] };
      setResources((currentResources) => ({
        ...currentResources,
        persons: makeResource(next.persons, 'success', null, new Date().toISOString()),
        clients: makeResource(next.clients, 'success', null, new Date().toISOString()),
      }));
      syncLegacyDataFromWorkspace(legacyWorkspaceFromData(next));
      return next;
    });
    return ui;
  }, []);

  const updatePerson = useCallback(async (personId, patch) => {
    const person = await crmApi.updatePerson(personId, patch);
    setData((current) => {
      const next = {
        ...current,
        persons: current.persons.map((item) => item.id === person.id ? person : item),
        clients: current.clients.map((item) => item.id === person.id ? toUiClient({ ...item, person_detail: person }) : item),
      };
      setResources((currentResources) => ({
        ...currentResources,
        persons: makeResource(next.persons, 'success', null, new Date().toISOString()),
        clients: makeResource(next.clients, 'success', null, new Date().toISOString()),
      }));
      syncLegacyDataFromWorkspace(legacyWorkspaceFromData(next));
      return next;
    });
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
    update('companies', (current) => [ui, ...current]);
    return ui;
  }, [update]);

  const updateCompany = useCallback(async (id, patch) => {
    const saved = await crmApi.updateCompany(id, patch);
    const ui = toUiCompany(saved);
    update('companies', (current) => current.map((item) => item.id === ui.id ? ui : item));
    return ui;
  }, [update]);

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
    update('suppliers', (current) => [ui, ...current]);
    return ui;
  }, [update]);

  const updateSupplier = useCallback(async (id, patch) => {
    const saved = await suppliersApi.update(id, patch);
    const ui = toUiSupplier(saved);
    update('suppliers', (current) => current.map((item) => item.id === ui.id ? ui : item));
    return ui;
  }, [update]);

  const value = useMemo(() => ({
    ...data, resources, loading, error, reload, update,
    createOrder, updateOrder, createPersonClient, updatePerson,
    createCompany, updateCompany, createSupplier, updateSupplier,
  }), [
    data, resources, loading, error, reload, update, createOrder, updateOrder,
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
