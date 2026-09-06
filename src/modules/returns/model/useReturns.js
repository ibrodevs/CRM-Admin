import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useReturns() {
  const workspace = useWorkspace();
  return {
    returns: workspace.returns,
    reload: workspace.reload,
    update: workspace.update,
  };
}
