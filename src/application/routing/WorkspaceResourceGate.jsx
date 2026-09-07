


import { Button } from '../../shared/ui/Button.jsx';
import { EmptyState } from '../../shared/ui/EmptyState.jsx';
import { messageForApiError } from '../../shared/api/client.js';

























export function WorkspaceResourceGate({ resource, onRetry, children }) {
  if (!resource) return children;
  if (resource.status === 'loading' || resource.status === 'idle') {
    return <div className="card card-pad"><div className="sk" style={{ height: 44, marginBottom: 12 }} /><div className="sk" style={{ height: 180 }} /></div>;
  }
  if (resource.status === 'forbidden') {
    return <EmptyState icon="lock" title="У вас нет доступа к этому разделу" />;
  }
  if (resource.status === 'error') {
    return (
      <EmptyState
        icon="alertCircle"
        title="Не удалось загрузить данные"
        sub={messageForApiError(resource.error)}
        action={<Button variant="secondary" icon="loader" onClick={() => onRetry && onRetry()}>Повторить</Button>}
      />
    );
  }
  return children;
}

