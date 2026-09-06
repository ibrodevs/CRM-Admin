import { useWorkspace } from '../../../shared/workspace/context.jsx';

// Transitional facade: state and mutation functions retain their original owners.
export function useCalendar() {
  const workspace = useWorkspace();
  return {
    calendar: workspace.calendar,
    reload: workspace.reload,
    update: workspace.update,
  };
}
