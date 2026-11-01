import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayLayer } from './Overlays.jsx';
import { popoverPosition } from './popover-position.js';

const panels = new Set();

// A nested picker can live in a portal and still belong to its parent form.
export function containsFloatingTarget(root, target) {
  if (!root || !target) return false;
  let current = target;
  const visited = new Set();
  while (current && !visited.has(current)) {
    if (root.contains(current)) return true;
    visited.add(current);
    current = [...panels].find((entry) => entry.panel.contains(current))?.anchor;
  }
  return false;
}

export function FloatingPanel({ anchorRef, panelRef, onClose, children, width, maxHeight = 360, align = 'start', className = '', style, ...props }) {
  const ref = useRef(null);
  const [position, setPosition] = useState(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useOverlayLayer(true, () => { closeRef.current?.(); anchorRef.current?.focus?.(); });
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const panel = ref.current;
    if (!anchor || !panel) return undefined;
    const entry = { anchor, panel };
    panels.add(entry);
    const update = () => {
      if (!anchor.isConnected) { closeRef.current?.(); return; }
      const a = anchor.getBoundingClientRect();
      if (a.bottom < 0 || a.top > window.innerHeight) { closeRef.current?.(); return; }
      const p = panel.getBoundingClientRect();
      // Keep viewport coordinates correct when CRM interface scaling is enabled.
      const scale = panel.offsetWidth ? p.width / panel.offsetWidth : 1;
      const preferredWidth = width || a.width / scale;
      const measured = popoverPosition(a, { width: preferredWidth * scale, height: maxHeight * scale, contentHeight: panel.scrollHeight * scale }, { width: window.innerWidth, height: window.innerHeight }, { align });
      const next = { left: measured.left / scale, top: measured.top / scale, width: measured.width / scale, maxHeight: measured.maxHeight / scale };
      setPosition((previous) => previous && Object.keys(next).every((key) => Math.abs(previous[key] - next[key]) < 0.5) ? previous : next);
    };
    const outside = (event) => {
      if (!containsFloatingTarget(panel, event.target) && !containsFloatingTarget(anchor, event.target)) closeRef.current?.();
    };
    const observer = new ResizeObserver(update);
    observer.observe(anchor); observer.observe(panel);
    document.addEventListener('mousedown', outside, true);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    update();
    return () => {
      panels.delete(entry); observer.disconnect();
      document.removeEventListener('mousedown', outside, true);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchorRef, width, maxHeight, align]);
  if (typeof document === 'undefined') return null;
  return createPortal(<div {...props} ref={(node) => { ref.current = node; if (panelRef) panelRef.current = node; }} className={'floating-panel ' + className} style={{ ...style, position: 'fixed', right: 'auto', bottom: 'auto', margin: 0, ...position, visibility: position ? 'visible' : 'hidden', zIndex: 10000 }}>{children}</div>, document.body);
}
