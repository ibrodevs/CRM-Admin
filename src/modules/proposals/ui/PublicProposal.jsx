'use client';
import { proposalContext } from '../model/presentation.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../shared/ui/Button.jsx';
import { ProposalChoices } from './ProposalChoices.jsx';
import { chosenTotal, kpMoney, kpTime, optionsOf, selectionErrors, restoreProposalSelection } from '../model/interactive.js';
import { publicQuote } from '../api/interactiveApi.js';

export function PublicProposal({ token }) {
  const [quote, setQuote] = useState(null);
  const [ids, setIds] = useState([]);
  const [packageId, setPackageId] = useState(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const active = useRef(true);
  const checkingRef = useRef(false);
  const current = useRef(null);
  const apply = useCallback(value => { current.current = value; if (active.current) setQuote(value); }, []);
  const refresh = useCallback(async value => {
    if (checkingRef.current) return;
    checkingRef.current = true; setChecking(true);
    try {
      let latest = value || current.current;
      const automatic = optionsOf(latest.payload).filter(row => row.auto_check);
      if (!automatic.length && !value) setNotice('Цену и наличие этих услуг подтверждает оператор. Для уточнения отправьте комментарий.');
      for (const option of automatic) {
        if (!active.current) break;
        latest = await publicQuote(token, 'refresh', { version: latest.version, revision: latest.revision, option_id: option.id });
        apply(latest);
      }
    } catch (e) { if (active.current) setError(e.message); }
    finally { checkingRef.current = false; if (active.current) setChecking(false); }
  }, [token, apply]);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    publicQuote(token, '', undefined, controller.signal).then(value => {
      if (!active.current) return;
      apply(value);
      const restored = restoreProposalSelection(value);
      setIds(restored.ids); setPackageId(restored.packageId);
      if (restored.changed) setNotice('Предложение обновлено. Проверьте сохранённый выбор и подтвердите актуальные условия.');
      refresh(value);
    }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => { active.current = false; controller.abort(); };
  }, [token, apply, refresh]);
  async function respond(action) {
    setBusy(true); setError(''); setNotice('');
    try {
      const value = await publicQuote(token, 'respond', { version: quote.version, revision: quote.revision, action, option_ids: ids, package_id: packageId, comment });
      apply(value); setComment('');
      setNotice(action === 'approval' ? 'Итоговые условия согласованы. Бронирование выполнит оператор.' : action === 'selection' ? 'Ваш выбор отправлен оператору. После проверки вы получите итоговые условия для согласования.' : 'Сообщение отправлено оператору.');
    } catch (e) {
      setError(e.message);
      try { apply(await publicQuote(token)); } catch { /* Keep the existing page and the user's selection. */ }
    } finally { setBusy(false); }
  }
  if (!quote) return <main className="kp-public"><div className="kp-public-brand">ПСЦ · Travel Hub</div><section className="kp-section"><h1>{error ? 'Не удалось открыть предложение' : 'Загружаем предложение…'}</h1>{error && <><p role="alert">{error}</p><Button onClick={() => window.location.reload()}>Повторить</Button></>}</section></main>;
  const payload = quote.payload;
  const context = proposalContext(payload);
  const errors = selectionErrors(payload, ids, packageId);
  const expired = payload.valid_until && new Date(payload.valid_until) < new Date();
  const canApprove = quote.stage === 'awaiting_approval' && JSON.stringify([...ids].sort()) === JSON.stringify([...(quote.selection.option_ids || [])].sort()) && packageId === (quote.selection.package_id || null);
  const disabled = busy || checking || expired;
  return <main className="kp-public">
    <header className="kp-public-top"><div className="kp-public-brand">ПСЦ · Travel Hub</div><span>{quote.number} · версия {quote.revision}</span></header>
    <header className="kp-public-heading"><div><span className="kp-kind">{quote.stage_label}</span><h1>{payload.title}</h1><div className="kp-public-context"><strong>{context.recipient}</strong><span>{context.route}</span><span>{context.dates}</span></div><p className="kp-description">{payload.intro}</p><p className="kp-muted">{payload.valid_until ? `Действует до ${kpTime(payload.valid_until)}` : 'Срок действия уточняется оператором'}</p></div><Button variant="secondary" disabled={checking || busy || expired} onClick={() => refresh()}>{checking ? 'Проверяем…' : 'Обновить цены'}</Button></header>
    <p className="kp-explanation">Сначала отправьте выбор оператору. После проверки цены и наличия согласуйте итоговые условия. Бронирование выполняет оператор.</p>
    {expired && <p className="kp-error" role="alert">Срок действия КП истёк. Запросите обновлённые варианты у оператора.</p>}
    {error && <p className="kp-error" role="alert">{error}</p>}{notice && <p className="kp-explanation" role="status">{notice}</p>}
    <div className="kp-public-grid"><ProposalChoices payload={payload} ids={ids} packageId={packageId} disabled={disabled || quote.stage === 'approved'} onChange={(next, pack) => { setIds(next); setPackageId(pack); setNotice(''); }} />
      <aside id="kp-client-selection" className="kp-client-summary"><h2>Ваш выбор</h2>{ids.length ? optionsOf(payload).filter(row => ids.includes(row.id)).map(row => <div className="kp-summary-row" key={row.id}><span>{row.title}</span>{!payload.packages.find(pack => pack.id === packageId)?.total_only && <strong>{kpMoney(row.price, payload.currency)}</strong>}</div>) : <p className="kp-muted">Выберите услуги или готовый комплект</p>}
        <div className="kp-total"><span>Итого</span><strong>{kpMoney(chosenTotal(payload, ids), payload.currency)}</strong></div>
        {errors.map(message => <p className="kp-error" key={message}>{message}</p>)}
        {quote.stage === 'approved' ? <p className="kp-explanation">Итог согласован. Оператор приступит к бронированию.</p> : <>
          <Button disabled={disabled || !ids.length || errors.length > 0} onClick={() => respond('selection')}>Отправить выбор оператору</Button>
          {canApprove && <Button disabled={disabled || errors.length > 0} onClick={() => respond('approval')}>Согласовать итоговые условия</Button>}
        </>}
        <label className="label" htmlFor="kp-client-comment">Комментарий или пожелания к замене</label><textarea className="input" id="kp-client-comment" rows={4} maxLength={4000} value={comment} onChange={e => setComment(e.target.value)} placeholder="Что нужно уточнить или заменить?" />
        <div className="kp-inline-actions"><Button variant="secondary" size="sm" disabled={disabled || !comment.trim()} onClick={() => respond('comment')}>Отправить комментарий</Button><Button variant="secondary" size="sm" disabled={disabled || !comment.trim()} onClick={() => respond('alternative')}>Запросить замену</Button></div>
        <p className="kp-muted">Проверка через API доступна для подключённых услуг. Остальные цены и наличие уточняет оператор. Обновление цены не означает вашего согласия.</p>
      </aside>
    </div>
    <div className="kp-mobile-total"><div><span>Выбрано услуг: {ids.length}</span><strong>{kpMoney(chosenTotal(payload, ids), payload.currency)}</strong></div><Button size="sm" onClick={() => document.getElementById('kp-client-selection')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Ваш выбор</Button></div>
  </main>;
}
