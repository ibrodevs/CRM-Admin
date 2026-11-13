import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { LoginScreen } from './LoginScreen.jsx';

// Keep every editor mounted, but make its DOM and portals inaccessible until
// authentication succeeds. A different account gets a new workspace key.
export function SessionRecovery({ auth }) {
  const root = useRef(null);
  useEffect(() => {
    const previous = new Map();
    const protect = () => {
      for (const node of document.body.children) {
        if (node === root.current || previous.has(node)) continue;
        previous.set(node, node.inert);
        node.inert = true;
      }
    };
    protect();
    const observer = new MutationObserver(protect);
    observer.observe(document.body, { childList: true });
    root.current?.querySelector('input')?.focus();
    return () => { observer.disconnect(); previous.forEach((inert, node) => { node.inert = inert; }); };
  }, []);
  return ReactDOM.createPortal(<div ref={root} className="session-lock" role="dialog" aria-modal="true" aria-label="Повторный вход">
    <p className="session-lock-notice">Данные остались в открытых формах. Войдите в тот же аккаунт, чтобы продолжить. Не закрывайте и не обновляйте вкладку.</p>
    <LoginScreen expired={auth.expired} onLogin={auth.login} onVerifyTwoFactor={auth.verifyTwoFactor} onPasswordReset={auth.requestPasswordReset} />
  </div>, document.body);
}
