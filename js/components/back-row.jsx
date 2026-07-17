import { Button } from '../ui';

function BackRow({ label, onBack }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <Button variant="secondary" size="sm" icon="chevLeft" onClick={onBack}>{label}</Button>
    </div>
  );
}

export { BackRow };
