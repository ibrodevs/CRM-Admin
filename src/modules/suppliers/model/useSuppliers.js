import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useSuppliers() {
  const workspace = useWorkspace();
  return {
    suppliers: workspace.suppliers,
    createSupplier: workspace.createSupplier,
    updateSupplier: workspace.updateSupplier,
    reload: workspace.reload,
    update: workspace.update,
  };
}
