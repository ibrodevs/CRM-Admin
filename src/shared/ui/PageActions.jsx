import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ActionsContext = createContext(null);

export function PageActionProvider({ children }) {
  const [target, setTarget] = useState(null);
  const register = useCallback((node) => {
    setTarget(node);
    return () => setTarget((current) => current === node ? null : current);
  }, []);
  return <ActionsContext.Provider value={{ target, register }}>{children}</ActionsContext.Provider>;
}

export function PageActionTarget() {
  const context = useContext(ActionsContext);
  const ref = useRef(null);
  const register = context?.register;
  useEffect(() => register && ref.current ? register(ref.current) : undefined, [register]);
  return context ? <div ref={ref} className="page-action-target" /> : null;
}

// The component owning a dialog also owns its action. Only its display location
// changes; callbacks, permissions and pending state stay in their original scope.
export function PageActions({ children }) {
  const context = useContext(ActionsContext);
  const actions = <div className="page-header-actions">{children}</div>;
  if (!context) return actions;
  return context.target ? createPortal(actions, context.target) : null;
}
