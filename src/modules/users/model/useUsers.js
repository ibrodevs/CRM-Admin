import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useUsers() {
  const workspace = useWorkspace();
  return {
    users: workspace.users,
    reload: workspace.reload,
    update: workspace.update,
  };
}
