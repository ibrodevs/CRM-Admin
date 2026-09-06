import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useFinance() {
  const workspace = useWorkspace();
  return {
    finance: workspace.finance,
    transactions: workspace.transactions,
    reload: workspace.reload,
    update: workspace.update,
  };
}
