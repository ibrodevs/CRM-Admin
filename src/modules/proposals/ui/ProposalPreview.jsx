import { useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { ProposalChoices } from './ProposalChoices.jsx';
import { proposalContext } from '../model/presentation.js';
import { chosenTotal, kpMoney } from '../model/interactive.js';
export function ProposalPreview({ payload, onClose }) {
  const [mode, setMode] = useState('desktop');
  const [ids, setIds] = useState([]), [pack, setPack] = useState(null);
  const context = proposalContext(payload);
  return <Drawer open title="Предпросмотр КП" sub="Так предложение увидит клиент. Действия в предпросмотре не отправляют выбор и не создают бронирование." width="min(1180px,98vw)" className="kp-preview-drawer" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Закрыть предпросмотр</Button>}>
    <div className="kp-preview-toolbar" aria-label="Размер предпросмотра">{[['desktop','Компьютер'],['mobile','Телефон']].map(([value,label]) => <Button key={value} variant={mode === value ? 'primary' : 'secondary'} aria-pressed={mode === value} onClick={() => setMode(value)}>{label}</Button>)}</div>
    <div className="kp-preview-surface"><div className={`kp-preview-sheet ${mode}`}><h1>{payload.title || 'Название КП не указано'}</h1><p>{context.recipient} · {context.route} · {context.dates}</p>{payload.intro && <p className="kp-description">{payload.intro}</p>}<ProposalChoices payload={payload} ids={ids} packageId={pack} onChange={(next, nextPack) => { setIds(next); setPack(nextPack); }} /><div className="kp-total"><span>Итого по выбору</span><strong>{kpMoney(chosenTotal(payload, ids), payload.currency)}</strong></div></div></div>
  </Drawer>;
}
