import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useWorkforce() {
  const workspace = useWorkspace();
  return {
    slaQueue: workspace.slaQueue,
    currentShift: workspace.currentShift,
    motivationAccruals: workspace.motivationAccruals,
    reload: workspace.reload,
    update: workspace.update,
  };
}
