'use client';

import { useEffect } from 'react';

import { resultsOf } from '../api/client';
import { toUiClient, toUiCompany, toUiNotification, toUiOrder, toUiSupplier, toUiThread } from '../api/adapters';
import { toLegacyProposal, toLegacyReturn, toLegacyUser } from '../api/legacy-adapters';
import { communicationsApi, crmApi, notificationsApi, ordersApi, suppliersApi, workspaceApi } from '../api/resources';
import { syncLegacyDataFromWorkspace } from './backend-data-sync';

async function refreshLegacyData(signal) {
  const calls = await Promise.allSettled([
    ordersApi.list({}, signal),
    suppliersApi.list({}, signal),
    crmApi.clients({}, signal),
    crmApi.companies({}, signal),
    notificationsApi.list({}, signal),
    communicationsApi.threads({}, signal),
    workspaceApi.proposals({}, signal),
    workspaceApi.returns({}, signal),
    workspaceApi.users({}, signal),
  ]);

  if (signal?.aborted) return;
  const value = (index, fallback = []) => calls[index].status === 'fulfilled' ? resultsOf(calls[index].value) : fallback;

  const orders = value(0).map(toUiOrder);
  const workspace = {
    orders,
    suppliers: value(1).map(toUiSupplier),
    clients: value(2).map(toUiClient),
    companies: value(3).map(toUiCompany),
    notifications: value(4).map(toUiNotification),
    chats: value(5).map(toUiThread),
    proposals: value(6).map((item) => toLegacyProposal(item, orders)),
    returns: value(7).map((item) => toLegacyReturn(item, orders)),
    users: value(8).map(toLegacyUser),
  };
  syncLegacyDataFromWorkspace(workspace);
}

export default function LegacyBackendBridge() {
  useEffect(() => {
    let controller = new AbortController();
    let timer;

    const run = async () => {
      try {
        await refreshLegacyData(controller.signal);
      } catch (_) {
        // Authentication may not exist yet. The next scheduled refresh retries.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    run();
    timer = window.setInterval(run, 30000);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return null;
}
