import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useChats() {
  const workspace = useWorkspace();
  return {
    chats: workspace.chats,
    reload: workspace.reload,
    update: workspace.update,
  };
}
