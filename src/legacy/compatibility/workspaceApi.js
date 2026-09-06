import { dashboardApi } from '../../modules/dashboard/api.js';
import { calendarFeedApi } from '../../modules/calendar/api.js';
import { proposalListApi } from '../../modules/proposals/api.js';
import { documentListApi } from '../../modules/documents/api.js';
import { returnListApi } from '../../modules/returns/api.js';
import { financeOverviewApi } from '../../modules/finance/api.js';
import { transactionListApi } from '../../modules/finance/api.js';
import { userListApi } from '../../modules/users/api.js';
import { workspaceInfoApi } from '../../modules/workspace/api.js';

export const workspaceApi = {
  dashboard: dashboardApi.dashboard,
  calendar: calendarFeedApi.calendar,
  proposals: proposalListApi.proposals,
  documents: documentListApi.documents,
  returns: returnListApi.returns,
  financeOverview: financeOverviewApi.financeOverview,
  transactions: transactionListApi.transactions,
  users: userListApi.users,
  meta: workspaceInfoApi.meta,
  globalSearch: workspaceInfoApi.globalSearch,
};
