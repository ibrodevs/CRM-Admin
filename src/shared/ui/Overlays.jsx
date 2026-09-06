import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Icon } from '../icons/index';
import { Button } from './Button.jsx';

// ——— Слои модальных окон ————————————————————————————————————————————————
// Каждое открытое окно (Drawer / Modal) регистрируется в общем стеке. Escape
// закрывает только верхний слой, иначе одно нажатие схлопывало сразу все
// панели: оператор из вложенного предпросмотра вылетал в общий список,
// потеряв открытый редактор.
const OVERLAY_LAYERS = [];

let overlayEscapeBound = false;

// Диалог печати браузера возвращает фокус в страницу и в части браузеров
// доставляет туда же Escape, которым его закрыли. На время печати и коротко
// после неё закрытие по Escape и по клику вне окна блокируется — редактор
// обязан пережить печать.
let printGuardUntil = 0;

function isPrintGuardActive() {
  return Date.now() < printGuardUntil;
}

// Устанавливает окно защиты абсолютно, а не «не меньше текущего»: иначе
// длинное удержание на время диалога печати не снималось бы после его
// закрытия и окна нельзя было бы закрыть ещё минуту.
function holdOverlaysDuringPrint(ms = 1200) {
  printGuardUntil = Date.now() + ms;
}

// Печать конкретного окна без выхода из редактора: подсветили нужный слой,
// напечатали, сняли подсветку и удержали слои от закрытия.
function printOverlayScope(node, { onDone } = {}) {
  if (typeof window === 'undefined') return;
  const overlay = node?.closest?.('.drawer-overlay') || null;
  const cleanup = () => {
    document.body.classList.remove('receipt-printing');
    overlay?.classList.remove('receipt-print-target');
    holdOverlaysDuringPrint(1200);
    if (onDone) onDone();
  };
  holdOverlaysDuringPrint(60000);
  overlay?.classList.add('receipt-print-target');
  document.body.classList.add('receipt-printing');
  window.addEventListener('afterprint', cleanup, { once: true });
  try {
    window.print();
  } finally {
    window.setTimeout(cleanup, 1000);
  }
}

function bindOverlayEscape() {
  if (overlayEscapeBound || typeof window === 'undefined') return;
  overlayEscapeBound = true;
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    if (!OVERLAY_LAYERS.length) return;
    if (isPrintGuardActive()) { event.preventDefault(); event.stopPropagation(); return; }
    const top = OVERLAY_LAYERS[OVERLAY_LAYERS.length - 1];
    event.preventDefault();
    event.stopPropagation();
    top.close();
  });
}

// Регистрация окна в стеке. onClose читается через ref, поэтому пересоздание
// обработчика на каждом рендере не переставляет слой в конец стека.
function useOverlayLayer(open, onClose) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    bindOverlayEscape();
    const layer = { close: () => { if (closeRef.current) closeRef.current(); } };
    OVERLAY_LAYERS.push(layer);
    return () => {
      const index = OVERLAY_LAYERS.indexOf(layer);
      if (index >= 0) OVERLAY_LAYERS.splice(index, 1);
    };
  }, [open]);
}

// Клик по подложке закрывает окно, но не сразу после печати и не когда поверх
// открыт ещё один слой (клик по нему не должен ронять нижние панели).
function overlayBackdropClose(event, onClose) {
  if (event.target !== event.currentTarget) return;
  if (isPrintGuardActive()) return;
  if (onClose) onClose();
}

const MODAL_FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({ open, onClose, children, size, className = '', ariaLabel = 'Диалоговое окно' }) {
  const modalRef = useRef(null);
  useOverlayLayer(open, onClose);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const frame = window.requestAnimationFrame(() => {
      modalRef.current?.focus();
    });
    const h = (e) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const controls = Array.from(modalRef.current.querySelectorAll(MODAL_FOCUSABLE));
      if (!controls.length) {
        e.preventDefault();
        modalRef.current.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === modalRef.current)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', h);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', h);
      previousFocus?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  const sizeClass = size ? 'modal-' + size + ' ' : '';
  return (
    <div className="overlay" onMouseDown={(e) => overlayBackdropClose(e, onClose)}>
      <div ref={modalRef} className={'modal ' + sizeClass + className} role="dialog" aria-modal="true" aria-label={ariaLabel} tabIndex={-1}>
        <div className="modal-content scroll">{children}</div>
      </div>
    </div>
  );
}

function ModalHeader({ title, sub, onClose }) {
  return (
    <div className="modal-head">
      <div>
        <h2 className="modal-title">{title}</h2>
        {sub && <div className="modal-sub">{sub}</div>}
      </div>
      {onClose && <button type="button" className="modal-close" onClick={onClose} aria-label={'Закрыть окно «' + title + '»'}><Icon name="x" /></button>}
    </div>
  );
}

function Drawer({ open, onClose, title, sub, children, footer, width, className = '' }) {
  useOverlayLayer(open, onClose);
  if (!open) return null;
  // Рендерим порталом в body: иначе вложенный в другую панель (container-type/overflow)
  // Drawer с position:fixed привязывается к коробке родителя и открывается неправильно.
  const node = (
    <div className="drawer-overlay" onMouseDown={(e) => overlayBackdropClose(e, onClose)}>
      <div className={`drawer scroll${className ? ` ${className}` : ''}`} style={width ? { width } : null}>
        <div className="drawer-head">
          <div>
            <h2 className="modal-title" style={{ fontSize: 24 }}>{title}</h2>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </div>
    </div>
  );
  return (typeof document !== 'undefined') ? ReactDOM.createPortal(node, document.body) : node;
}

function ConfirmDialog({ open, title = 'Вы уверены?', message, confirmLabel = 'Удалить', confirmVariant = 'danger', onConfirm, onCancel }) {
  return (
    <Drawer open={open} onClose={onCancel} title={title} width="min(440px,92vw)" className="confirm-dialog-drawer"
      footer={<>
        <Button variant="secondary" onClick={onCancel} style={{ flex: 1 }}>Отменить</Button>
        <Button variant={confirmVariant} onClick={onConfirm} style={{ flex: 1 }}>{confirmLabel}</Button>
      </>}>
      <div style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.5 }}>{message}</div>
    </Drawer>
  );
}

export { OVERLAY_LAYERS, overlayEscapeBound, printGuardUntil, isPrintGuardActive, holdOverlaysDuringPrint, printOverlayScope, bindOverlayEscape, useOverlayLayer, overlayBackdropClose, MODAL_FOCUSABLE, Modal, ModalHeader, Drawer, ConfirmDialog };
