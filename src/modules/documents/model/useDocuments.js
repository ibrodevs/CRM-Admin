import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useDocuments() {
  const workspace = useWorkspace();
  return {
    documents: workspace.documents,
    reload: workspace.reload,
    update: workspace.update,
  };
}
