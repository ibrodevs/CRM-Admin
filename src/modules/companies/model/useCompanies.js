import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useCompanies() {
  const workspace = useWorkspace();
  return {
    companies: workspace.companies,
    createCompany: workspace.createCompany,
    updateCompany: workspace.updateCompany,
    reload: workspace.reload,
    update: workspace.update,
  };
}
