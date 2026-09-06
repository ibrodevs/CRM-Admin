import { useState } from 'react';
import { toUiThread } from '../../legacy/adapters/ui-adapters';

export function useAppNavigation() {
  const [route, setRoute] = useState('dashboard');
  const [intent, setIntent] = useState(null);
  const [svcSearch, setSvcSearch] = useState(null);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatTarget, setChatTarget] = useState(null);
  const [focusedChat, setFocusedChat] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [ctxOrder, setCtxOrder] = useState(null);
  const navigate = (r) => {
    const b = r.split('/')[0];
    setRoute(r);
    setCtxOrder(null);
    if (b === 'orders') setIntent({ type: 'list' });
  };
  const openChat = (target) => {
    if (target) {
      setChatTarget(target);
      if (target.no || target.client) setCtxOrder(target);
      if (target.id) setFocusedChat(target.id ? toUiThread(target) : target);
    }
    setChatOpen(true);
  };
  const openChatThread = (thread) => {
    if (thread) setFocusedChat(thread.id ? toUiThread(thread) : thread);
    setRoute('chats');
    setCtxOrder(null);
  };

  const openOrder = (o, tab, svc) => {
    if (o === '__create__') { setRoute('orders'); setIntent({ type: 'create' }); setCtxOrder(null); return; }
    setRoute('orders'); setIntent({ type: 'open', order: o, tab, svc }); setCtxOrder(o);
  };
  const createOrder = () => { setRoute('orders'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createClient = () => { setRoute('clients'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createCompany = () => { setRoute('companies'); setIntent({ type: 'create' }); setCtxOrder(null); };
  const createKP = () => { setRoute('offers'); setIntent({ type: 'create' }); setCtxOrder(null); };

  const openServiceSearch = (key, form) => { setRoute(key); setSvcSearch({ key, form }); setCtxOrder(null); };

  return { route, setRoute, intent, setIntent, svcSearch, setSvcSearch, chatOpen, setChatOpen, chatTarget, setChatTarget, focusedChat, setFocusedChat, notifOpen, setNotifOpen, ctxOrder, setCtxOrder, navigate, openChat, openChatThread, openOrder, createOrder, createClient, createCompany, createKP, openServiceSearch };
}
