import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useNotifications() {
  const workspace = useWorkspace();
  return {
    notifications: workspace.notifications,
    reload: workspace.reload,
    update: workspace.update,
  };
}
