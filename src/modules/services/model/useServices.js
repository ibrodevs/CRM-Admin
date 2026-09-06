import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useServices() {
  const workspace = useWorkspace();
  return {
    orderServices: workspace.orderServices,
    reload: workspace.reload,
    update: workspace.update,
  };
}
