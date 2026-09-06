import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useDashboard() {
  const workspace = useWorkspace();
  return {
    dashboard: workspace.dashboard,
    reload: workspace.reload,
    update: workspace.update,
  };
}
