import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useIntegrations() {
  const workspace = useWorkspace();
  return {
    integrationIncidents: workspace.integrationIncidents,
    integrationOperations: workspace.integrationOperations,
    reload: workspace.reload,
    update: workspace.update,
  };
}
