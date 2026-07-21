import {
  CHAT_THREADS,
  CLIENTS_DB,
  COMPANIES_DB,
  NOTIFICATIONS,
  ORDER_PARTICIPANTS,
  ORDER_SERVICES,
  ORDER_TASKS,
  ORDERS,
  PROPOSALS,
  RETURNS,
  SUPPLIERS,
  USERS,
} from '../data';

function replaceArray(target, source) {
  if (!Array.isArray(target) || !Array.isArray(source)) return;
  target.splice(0, target.length, ...source);
}

/**
 * Transitional compatibility layer for the legacy UI.
 *
 * A number of older components still import mutable arrays from `js/data`.
 * Instead of changing their markup, keep those arrays synchronized with the
 * authenticated backend workspace. This prevents demo records from leaking
 * into production flows while the components are migrated incrementally.
 */
export function syncLegacyDataFromWorkspace(workspace) {
  if (!workspace) return;

  replaceArray(ORDERS, workspace.orders || []);
  replaceArray(ORDER_PARTICIPANTS, workspace.orderParticipants || []);
  replaceArray(ORDER_SERVICES, workspace.orderServices || []);
  replaceArray(ORDER_TASKS, workspace.orderTasks || []);
  replaceArray(CLIENTS_DB, workspace.clients || []);
  replaceArray(COMPANIES_DB, workspace.companies || []);
  replaceArray(SUPPLIERS, workspace.suppliers || []);
  replaceArray(NOTIFICATIONS, workspace.notifications || []);
  replaceArray(CHAT_THREADS, workspace.chats || []);
  replaceArray(PROPOSALS, workspace.proposals || []);
  replaceArray(RETURNS, workspace.returns || []);
  replaceArray(USERS, workspace.users || []);
}
