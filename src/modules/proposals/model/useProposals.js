import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useProposals() {
  const workspace = useWorkspace();
  return {
    proposals: workspace.proposals,
    reload: workspace.reload,
    update: workspace.update,
  };
}
