import { useId, useState } from 'react';
import { Button } from './Button.jsx';

// Reference totals stay available on demand instead of occupying a row of cards.
export function RegistryStats({ children }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return <div className="registry-stats">
    <Button type="button" variant="secondary" size="sm" aria-expanded={open} aria-controls={contentId} onClick={() => setOpen((current) => !current)}>Сводка по разделу</Button>
    <div id={contentId} className="registry-stats-content" hidden={!open}>{children}</div>
  </div>;
}
