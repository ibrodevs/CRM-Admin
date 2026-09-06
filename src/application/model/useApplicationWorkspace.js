import { useWorkspace } from '../../shared/workspace/context.jsx';
import { useOrders } from '../../modules/orders/model.js';
import { useClients } from '../../modules/clients/model.js';
import { useCompanies } from '../../modules/companies/model.js';
import { useSuppliers } from '../../modules/suppliers/model.js';
import { useNotifications } from '../../modules/notifications/model.js';
import { useChats } from '../../modules/chats/model.js';
import { useFinance } from '../../modules/finance/model.js';
import { useDocuments } from '../../modules/documents/model.js';
import { useProposals } from '../../modules/proposals/model.js';
import { useReturns } from '../../modules/returns/model.js';
import { useServices } from '../../modules/services/model.js';
import { useUsers } from '../../modules/users/model.js';
import { useCalendar } from '../../modules/calendar/model.js';
import { useDashboard } from '../../modules/dashboard/model.js';
import { useIntegrations } from '../../modules/integrations/model.js';
import { useWorkforce } from '../../modules/workforce/model.js';

// Composition stays in the application layer; pages keep their existing props.
export function useApplicationWorkspace() {
  const { resources, loading, error, meta, reload, update } = useWorkspace();
  return {
    resources, loading, error, meta, reload, update,
    ...useOrders(),
    ...useClients(),
    ...useCompanies(),
    ...useSuppliers(),
    ...useNotifications(),
    ...useChats(),
    ...useFinance(),
    ...useDocuments(),
    ...useProposals(),
    ...useReturns(),
    ...useServices(),
    ...useUsers(),
    ...useCalendar(),
    ...useDashboard(),
    ...useIntegrations(),
    ...useWorkforce(),
  };
}
