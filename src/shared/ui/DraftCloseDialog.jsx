import ReactDOM from 'react-dom';
import { Modal, ModalHeader } from './Overlays.jsx';
import { Button } from './Button.jsx';

// Dismissing the decision returns to the form; only explicit actions leave it.
export function DraftCloseDialog({ open, title = 'Закрыть поиск?', description, children, note,
  saveDisabled = false, onCancel, onSave, onDiscard }) {
  const dialog = <Modal open={open} onClose={onCancel} size="sm" className="draft-close-dialog" ariaLabel={title}>
    <ModalHeader title={title} onClose={onCancel} />
    <p className="draft-close-description">{description}</p>
    {children}
    {note && <p className="draft-close-note" role="status">{note}</p>}
    <div className="draft-close-dialog-actions">
      <Button variant="secondary" onClick={onCancel}>Продолжить</Button>
      <Button disabled={saveDisabled} onClick={onSave}>Сохранить и закрыть</Button>
      <button type="button" className="draft-close-discard" onClick={onDiscard}>Закрыть без сохранения</button>
    </div>
  </Modal>;
  return typeof document !== 'undefined' ? ReactDOM.createPortal(dialog, document.body) : dialog;
}
