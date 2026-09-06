import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useClients() {
  const workspace = useWorkspace();
  return {
    persons: workspace.persons,
    clients: workspace.clients,
    createPersonClient: workspace.createPersonClient,
    updatePerson: workspace.updatePerson,
    reload: workspace.reload,
    update: workspace.update,
  };
}
