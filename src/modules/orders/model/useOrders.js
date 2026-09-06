import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useOrders() {
  const workspace = useWorkspace();
  return {
    orders: workspace.orders,
    createOrder: workspace.createOrder,
    updateOrder: workspace.updateOrder,
    reload: workspace.reload,
    update: workspace.update,
  };
}
