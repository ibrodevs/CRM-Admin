import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { resultsOf } from '../api/client';
import { toUiClient, toUiCompany, toUiNotification, toUiOrder, toUiSupplier, toUiThread } from '../api/adapters';
import { communicationsApi, crmApi, notificationsApi, ordersApi, suppliersApi, workspaceApi } from '../api/resources';
import { useAuth } from './auth-context';

const WorkspaceContext = createContext(null);

const EMPTY = {
  orders: [], suppliers: [], persons: [], clients: [], companies: [], notifications: [], chats: [],
  proposals: [], documents: [], returns: [], transactions: [], users: [], calendar: null, dashboard: null, finance: null, meta: null,
};

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
      const order = next.orders.find((item) => item.id === thread.orderId);
      return { ...thread, order: order?.no || thread.orderId, client: order?.client || thread.name, responsibleOperator: order?.operator || '' };
    });
    next.proposals = resultsOf(next.proposals);
    next.documents = resultsOf(next.documents);
    next.returns = resultsOf(next.returns);
    next.transactions = resultsOf(next.transactions);
    next.users = resultsOf(next.users);
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

  const update = useCallback((key, updater) => {
    setData((current) => ({ ...current, [key]: typeof updater === 'function' ? updater(current[key]) : updater }));
  }, []);

  const value = useMemo(() => ({ ...data, loading, error, reload, update }), [data, loading, error, reload, update]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return value;
}
