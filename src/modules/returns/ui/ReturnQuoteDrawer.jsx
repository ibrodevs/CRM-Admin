import React, { useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { aftersalesApi } from '../api/aftersalesApi.js';
import { validateManualQuote } from '../model/request-context.js';

export function ReturnQuoteDrawer({ operation, onClose, onSaved }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [amounts, setAmounts] = useState({ paid: operation.hasFinancialQuote ? String(operation.fin.original) : '', penalty: operation.hasFinancialQuote ? String(operation.fin.supplierPenalty) : '', fee: operation.hasFinancialQuote ? String(operation.fin.serviceFee) : '', hold: operation.hasFinancialQuote ? String(operation.fin.extraHold) : '0', difference: operation.hasFinancialQuote && operation.exchange ? String(operation.exchange.diff) : '' });
  const [note, setNote] = useState('');
  const exchange = operation.type === 'Обмен билета';
  const save = async () => {
    if ((!validateManualQuote(amounts, exchange) || amounts.hold === '' || !Number.isFinite(Number(amounts.hold)) || Number(amounts.hold) < 0)) { toast('Заполните подтверждённые суммы, включая нулевые штрафы и сборы.', 'err'); return; }
    setBusy(true);
    try {
      await aftersalesApi.quote(operation.serverId, { currency: operation.currency, source: 'manual', original_paid: amounts.paid, supplier_penalty: amounts.penalty, agency_service_fee: amounts.fee, other_withholdings: amounts.hold, ...(exchange ? { exchange_difference: amounts.difference } : {}), details: { reason: note } });
      await onSaved(); onClose(); toast('Расчёт сохранён. Его можно передать на согласование.', 'ok');
    } catch (error) { toast(error.message || 'Не удалось сохранить расчёт', 'err'); }
    finally { setBusy(false); }
  };
  return <Drawer open title="Расчёт по операции" sub={`${operation.no} · ${operation.service}`} className="order-operation-form" onClose={onClose}
    footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={save} disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить расчёт'}</Button></>}>
    <p className="order-operation-help">Укажите суммы, подтверждённые поставщиком. Сохранение расчёта не выполняет возврат или обмен.</p>
    <div className="form-grid">{[['paid','Первоначально оплачено'],['penalty','Штраф поставщика'],['fee','Сервисный сбор'],['hold','Другие удержания'],...(exchange ? [['difference','Разница тарифа: доплата / возврат']] : [])].map(([key,label])=><Field label={`${label}, ${operation.currency}`} key={key}><Input type="number" step="0.01" min={key==='difference'?undefined:'0'} value={amounts[key]} onChange={(event)=>setAmounts((current)=>({...current,[key]:event.target.value}))}/></Field>)}</div>
    <Field label="Основание расчёта"><textarea className="input" rows={3} value={note} onChange={(event)=>setNote(event.target.value)} placeholder="Условия поставщика, номер ответа или комментарий к расчёту" /></Field>
  </Drawer>;
}
