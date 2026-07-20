import { useState } from 'react';
import { Icon } from './icons';
import { Button, Drawer, Field, FilterChip, Input, Modal, ModalHeader, Pill, Select, Tabs, useToast } from './ui';
import { SERVICE_KIND } from './data';
import { Topbar } from './layout';
import { PanelSub } from './components/shared-panels';
import { UFDateField } from './forms_unified';
import { OrderCreateModal } from './page_orders';
import { FinRow, StatTile, WarnBanner, f$ } from './page_finance';









const GR_CLASSIC_STATUS = ['Подготовка запроса', 'Запрос отправлен', 'Ожидается ответ', 'Получено предложение', 'Блок подтверждён', 'Ожидается депозит', 'Ожидается список', 'Имена переданы', 'Ожидается оплата', 'Готово к выписке', 'Выписано частично', 'Выписано полностью', 'Блок сокращён', 'Блок аннулирован', 'Требуется вмешательство'];
const GR_SPLIT_STATUS = ['Подготовка распределения', 'Распределение подтверждено', 'Бронирование выполняется', 'Забронировано частично', 'Забронировано полностью', 'Требуется решение', 'Ожидается оплата', 'Выписано частично', 'Выписано полностью', 'Частично отменено', 'Завершено'];
function grStatusTone(s) {
  if (['Выписано полностью', 'Забронировано полностью', 'Блок подтверждён', 'Завершено'].includes(s)) return 'green';
  if (['Требуется вмешательство', 'Требуется решение', 'Блок аннулирован'].includes(s)) return 'red';
  if (['Выписано частично', 'Забронировано частично', 'Блок сокращён', 'Частично отменено'].includes(s)) return 'amber';
  return 'blue';
}
const GR_PAX_STATUS = { added: 'Добавлен', assigned: 'Назначен в блок', checked: 'Данные проверены', sent: 'Переданы поставщику', confirmed: 'Имя подтверждено', issued: 'Оформлен' };
const GR_PAX_TONE = { added: 'gray', assigned: 'blue', checked: 'blue', sent: 'teal', confirmed: 'amber', issued: 'green' };
const GR_BOOK_STATE = { ok: { l: 'Создано успешно', tone: 'green', icon: 'checkCircle' }, run: { l: 'Выполняется', tone: 'blue', icon: 'loader' }, wait: { l: 'Ожидает', tone: 'gray', icon: 'clock' }, err: { l: 'Ошибка', tone: 'red', icon: 'alertCircle' }, need: { l: 'Требует решения', tone: 'amber', icon: 'alertTriangle' } };
const GR_SCENARIO = { classic: { l: 'Классический блок', tone: 'blue', icon: 'grid' }, split: { l: 'Дроблёное', tone: 'teal', icon: 'copy' }, mixed: { l: 'Комбинированный', tone: 'amber', icon: 'swap' } };


const GR_SURNAMES = ['Асанов', 'Асанова', 'Асанов', 'Бекова', 'Бек', 'Бекова', 'Иманов', 'Иманова', 'Райымбеков', 'Нургазиева', 'Токтогулов', 'Сыдыков', 'Абдыкадыр', 'Мамытова', 'Жээнбеков', 'Осмонова', 'Курманбек', 'Алиева', 'Дуйшеев', 'Нурланова', 'Байзаков', 'Кыдырова', 'Эргешов', 'Садыкова', 'Молдалиев', 'Турат', 'Исаков', 'Бейшеева', 'Качкын', 'Уметова'];
const GR_NAMES = ['Тимур', 'Айгерим', 'Данияр', 'Назгуль', 'Бакыт', 'Алина', 'Руслан', 'Жылдыз', 'Эрлан', 'Бегимай', 'Азамат', 'Улан', 'Санжар', 'Айпери', 'Нурлан', 'Гульнара', 'Кубат', 'Анна', 'Марат', 'Нургуль', 'Улукбек', 'Аида', 'Тилек', 'Чолпон', 'Данил', 'Мээрим', 'Бекзат', 'Асель', 'Максат', 'Динара'];
const GR_PAX = Array.from({ length: 30 }, (_, i) => {
  const family = i < 4 ? 'Семья Асановых' : (i >= 4 && i < 7) ? 'Семья Бековых' : null;
  const sub = family || (i < 12 ? 'Руководство делегации' : i < 22 ? 'Подгруппа A' : 'Подгруппа B');
  const stKeys = ['issued', 'issued', 'confirmed', 'sent', 'checked', 'assigned', 'added'];
  return {
    id: 'p' + (i + 1), name: GR_SURNAMES[i] + ' ' + GR_NAMES[i], sub, family,
    child: [2, 5, 6].includes(i), vip: [0, 1].includes(i), mobility: i === 13, lead: i === 8,
    cantSplit: !!family, sex: /а$|ь$/.test(GR_NAMES[i]) ? 'Ж' : 'М',
    status: i < 24 ? stKeys[Math.min(6, Math.floor(i / 4))] : 'assigned',
  };
});
function paxTags(p) {
  const t = [];
  if (p.vip) t.push({ l: 'VIP', tone: 'amber' });
  if (p.lead) t.push({ l: 'Руководитель', tone: 'blue' });
  if (p.family) t.push({ l: p.family, tone: 'teal' });
  if (p.child) t.push({ l: 'Ребёнок', tone: 'gray' });
  if (p.mobility) t.push({ l: 'Маломобильный', tone: 'red' });
  return t;
}



function computeSplit(pax, maxPer) {
  const groups = [];
  const families = {};
  const singles = [];
  pax.forEach((p) => { if (p.cantSplit && p.family) { (families[p.family] = families[p.family] || []).push(p); } else singles.push(p); });
  const units = [...Object.values(families), ...singles.map((p) => [p])];
  let cur = [];
  units.forEach((u) => { if (cur.length + u.length > maxPer) { groups.push(cur); cur = []; } cur = cur.concat(u); });
  if (cur.length) groups.push(cur);
  return groups.map((g, i) => ({ id: 'tb-' + (i + 1), pax: g }));
}


const GROUP_ORDERS = [
  {
    no: 51162, client: 'ОсОО "Гранд лимитед"', legal: 'ОсОО «Гранд лимитед»', contact: 'Джээнбеков Азамат · +996 555 12-34-56',
    route: 'FRU → IST → FRU', dateFrom: '02.08.2026', dateTo: '09.08.2026', operators: ['Даниель (авиа)', 'Азамат (гостиницы)', 'Куба (финансы)'],
    pax: GR_PAX, status: 'Требуется решение',
    services: [
      {
        id: 'gs-avia', kind: 'Авиа', scenario: 'mixed', supplier: 'Turkish Airlines', channel: 'API + групп. отдел', system: 'Sirena / Mixvel',
        status: 'Требуется решение', requested: 30, confirmed: 24, issued: 18, pricePer: 312, deposit: 3000, paid: 6000, currency: 'USD',
        namesDue: '25.07.2026', payDue: '28.07.2026', ticketDue: '30.07.2026', reduceRule: 'сокращение до −10% без штрафа', cancelRule: 'аннуляция со штрафом 15%',
        block: { no: 'GRP-TA-8841', pnr: 'TK/AB12CD', confirmedSeats: 20, blockValid: 'до 25.07.2026' },
        maxPer: 9,
      },
      {
        id: 'gs-hotel', kind: 'Гостиница', scenario: 'classic', supplier: 'Hilton Istanbul', channel: 'Личный кабинет', system: 'Ratehawk',
        status: 'Блок подтверждён', requested: 15, confirmed: 15, issued: 12, pricePer: 143, deposit: 900, paid: 2145, currency: 'USD',
        namesDue: '26.07.2026', payDue: '30.07.2026', ticketDue: '01.08.2026', reduceRule: 'сокращение до −20% за 7 дней', cancelRule: 'бесплатная отмена до 26.07',
        block: { no: 'HIL-QUOTA-15', pnr: 'CONF-55231', confirmedSeats: 15, blockValid: 'до 26.07.2026' }, maxPer: 5,
      },
      {
        id: 'gs-transfer', kind: 'Трансфер', scenario: 'classic', supplier: 'Istanbul VIP Transfer (локальный)', channel: 'Email', system: 'Вручную',
        status: 'Готово к выписке', requested: 30, confirmed: 30, issued: 30, pricePer: 18, deposit: 0, paid: 540, currency: 'USD',
        namesDue: '—', payDue: '01.08.2026', ticketDue: '—', reduceRule: '—', cancelRule: 'бесплатно за 48 ч',
        block: { no: 'TRF-2231', pnr: '—', confirmedSeats: 30, blockValid: '—' }, maxPer: 30,
      },
    ],
  },
  {
    no: 51170, client: 'ОсОО "Asia Travel"', legal: 'ОсОО «Asia Travel»', contact: 'Куба · +996 700 88-77-66',
    route: 'FRU → Москва', dateFrom: '15.08.2026', dateTo: '22.08.2026', operators: ['Куба (авиа)'],
    pax: GR_PAX.slice(0, 12), status: 'Ожидается ответ',
    services: [{ id: 'gs2-rail', kind: 'ЖД', scenario: 'split', supplier: 'РЖД (API)', channel: 'API', system: 'РЖД', status: 'Подготовка распределения', requested: 12, confirmed: 0, issued: 0, pricePer: 96, deposit: 0, paid: 0, currency: 'USD', namesDue: '10.08.2026', payDue: '12.08.2026', ticketDue: '13.08.2026', reduceRule: '—', cancelRule: 'по тарифу', block: { no: '—', pnr: '—', confirmedSeats: 0, blockValid: '—' }, maxPer: 4 }],
  },
];
function grAgg(o) {
  const total = o.pax.length;


  const full = o.services.filter((s) => s.requested >= total);
  const confirmed = full.length ? Math.min(...full.map((s) => s.confirmed)) : Math.max(...o.services.map((s) => s.confirmed), 0);
  const issued = full.length ? Math.min(...full.map((s) => s.issued)) : Math.max(...o.services.map((s) => s.issued), 0);
  const noSeat = total - confirmed;
  const bookings = o.services.reduce((n, s) => n + (s.scenario === 'classic' ? 1 : Math.ceil(s.requested / s.maxPer)), 0);
  const cost = o.services.reduce((sum, s) => sum + s.pricePer * s.confirmed, 0);
  const problems = o.services.filter((s) => s.status === 'Требуется решение' || s.status === 'Требуется вмешательство').length + (noSeat > 0 ? 1 : 0);
  return { total, confirmed, issued, noSeat, bookings, cost, problems };
}




function GroupRequestPanel({ onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ kind: 'Авиа', route: '', dateFrom: '', dateTo: '', pax: 30, classCode: 'Эконом', bags: '20 кг', rooms: '', board: 'Завтрак', budget: '', supplier: 'Turkish Airlines', alts: '', notes: '' });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const isHotel = f.kind === 'Гостиница';
  const send = (via) => { toast('Групповой запрос отправлен · ' + via + ' · зафиксирован в групповой услуге', 'ok'); onClose(); };
  return (
    <Drawer open onClose={onClose} title="Создать групповой запрос"
      sub="Единая форма запроса · параметры группы для поставщика" width="min(720px,96vw)"
      footer={<>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" icon="mail" onClick={() => send('email')}>Email</Button>
        <Button variant="secondary" icon="api" onClick={() => send('API')}>API</Button>
        <Button variant="secondary" icon="download" onClick={() => send('файл')}>Выгрузить</Button>
        <Button icon="clipboard" onClick={() => send('задача оператору')}>Задача</Button>
      </>}>
      <PanelSub style={{ marginTop: 0 }}>Услуга</PanelSub>
      <div className="form-grid">
        <Field label="Вид услуги"><Select value={f.kind} onChange={(e) => set('kind', e.target.value)} options={['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Автобус']} /></Field>
        <Field label="Желаемый поставщик"><Input value={f.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="Turkish Airlines" /></Field>
      </div>

      <PanelSub>Маршрут и даты</PanelSub>
      <div className="form-grid">
        <Field label="Маршрут"><Input value={f.route} onChange={(e) => set('route', e.target.value)} placeholder="FRU → IST → FRU" leadIcon="plane" /></Field>
        <Field label="Количество участников"><Input type="number" value={f.pax} onChange={(e) => set('pax', e.target.value)} leadIcon="users" /></Field>
        <UFDateField label="Дата начала" value={f.dateFrom || null} onChange={(v) => set('dateFrom', v)} placeholder="дд.мм.гггг" />
        <UFDateField label="Дата окончания" value={f.dateTo || null} onChange={(v) => set('dateTo', v)} placeholder="дд.мм.гггг" />
      </div>

      <PanelSub>Параметры {isHotel ? 'размещения' : 'перевозки'}</PanelSub>
      <div className="form-grid">
        {!isHotel && <Field label="Класс обслуживания"><Select value={f.classCode} onChange={(e) => set('classCode', e.target.value)} options={['Эконом', 'Комфорт', 'Бизнес']} /></Field>}
        {!isHotel && <Field label="Багаж"><Input value={f.bags} onChange={(e) => set('bags', e.target.value)} placeholder="20 кг" /></Field>}
        {isHotel && <Field label="Тип размещения / кол-во номеров"><Input value={f.rooms} onChange={(e) => set('rooms', e.target.value)} placeholder="DBL · 15 номеров" /></Field>}
        {isHotel && <Field label="Питание"><Select value={f.board} onChange={(e) => set('board', e.target.value)} options={['Без питания', 'Завтрак', 'Полупансион', 'Всё включено']} /></Field>}
      </div>

      <PanelSub>Условия и бюджет</PanelSub>
      <div className="form-grid">
        <Field label="Бюджет (на группу)"><Input value={f.budget} onChange={(e) => set('budget', e.target.value)} placeholder="напр. 9 000 $" /></Field>
        <Field label="Допустимые альтернативы"><Input value={f.alts} onChange={(e) => set('alts', e.target.value)} placeholder="Air Astana, Pegasus" /></Field>
      </div>

      <PanelSub>Возрастные категории и доп. требования <span style={{ textTransform: 'none', fontWeight: 400, color: 'var(--faint)' }}>(необязательно)</span></PanelSub>
      <textarea className="input" rows={3} value={f.notes} onChange={(e) => set('notes', e.target.value)}
        placeholder="2 ребёнка, 1 маломобильный, места рядом для семей" style={{ resize: 'vertical', width: '100%' }} />
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>Все исходящие письма и вложения сохраняются внутри групповой услуги. Ответ поставщика автоматически привяжется к заказу.</div>
    </Drawer>
  );
}




const GR_CLASSIC_STEPS = ['Запрос', 'Отправка', 'Предложение', 'Блок', 'Список имён', 'Выписка'];
function classicStage(status) {
  const map = { 'Подготовка запроса': 0, 'Запрос отправлен': 1, 'Ожидается ответ': 1, 'Получено предложение': 2, 'Блок подтверждён': 3, 'Ожидается депозит': 3, 'Ожидается список': 4, 'Имена переданы': 4, 'Ожидается оплата': 4, 'Готово к выписке': 5, 'Выписано частично': 5, 'Выписано полностью': 5, 'Блок сокращён': 3, 'Требуется вмешательство': 3 };
  return map[status] != null ? map[status] : 0;
}
function ClassicStepper({ status }) {
  const cur = classicStage(status);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, marginBottom: 14 }}>
      {GR_CLASSIC_STEPS.map((st, i) => {
        const done = i < cur, active = i === cur;
        const col = done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--field-line)';
        return (
          <div key={st} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && <div style={{ position: 'absolute', left: '-50%', top: 11, width: '100%', height: 2, background: i <= cur ? 'var(--green)' : 'var(--field-line)' }} />}
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: done ? 'var(--green)' : active ? 'var(--blue)' : '#fff', border: '2px solid ' + col, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, position: 'relative' }}>
              {done ? <Icon name="check" style={{ width: 13, height: 13, color: '#fff' }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: active ? '#fff' : 'var(--muted-2)' }}>{i + 1}</span>}
            </div>
            <span style={{ fontSize: 11, marginTop: 5, color: active ? 'var(--ink)' : 'var(--muted)', fontWeight: active ? 700 : 500, textAlign: 'center' }}>{st}</span>
          </div>
        );
      })}
    </div>
  );
}
function ClassicBlockCard({ s }) {
  const rest = s.block.confirmedSeats - s.issued;
  return (
    <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
      <ClassicStepper status={s.status} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Pill tone="blue"><Icon name="grid" style={{ width: 12, height: 12, verticalAlign: -2 }} /> Классический блок</Pill>
        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.block.no}</span>
        <div style={{ flex: 1 }} /><Pill tone="gray">{s.block.blockValid}</Pill>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <FinRow label="Поставщик · канал" value={s.supplier} />
        <FinRow label="Внешняя система" value={s.system} />
        <FinRow label="PNR / номер подтверждения" value={s.block.pnr} />
        <FinRow label="Запрошено / подтверждено" value={s.requested + ' / ' + s.block.confirmedSeats} />
        <FinRow label="Оформлено / свободный остаток" value={s.issued + ' / ' + rest} />
        <FinRow label="Стоимость на участника" value={f$(s.pricePer)} />
        <FinRow label="Депозит / оплачено" value={f$(s.deposit) + ' / ' + f$(s.paid)} />
        <FinRow label="Срок внесения имён" value={s.namesDue} />
        <FinRow label="Срок оплаты" value={s.payDue} />
        <FinRow label="Срок выписки" value={s.ticketDue} />
        <FinRow label="Условия сокращения" value={s.reduceRule} />
        <FinRow label="Условия аннуляции" value={s.cancelRule} />
      </div>
    </div>
  );
}
function SplitFlow({ s, pax }) {
  const toast = useToast();
  const [phase, setPhase] = useState('idle');
  const [split, setSplit] = useState(() => computeSplit(pax, s.maxPer));
  const [states, setStates] = useState({});
  const startSplit = () => { setSplit(computeSplit(pax, s.maxPer)); setPhase('preview'); };
  const move = (fromId, delta) => {

    setSplit((gs) => {
      const idx = gs.findIndex((g) => g.id === fromId); const to = idx + delta;
      if (to < 0 || to >= gs.length || gs[idx].pax.length <= 1) return gs;
      const copy = gs.map((g) => ({ ...g, pax: [...g.pax] }));
      copy[to].pax.push(copy[idx].pax.pop());
      return copy;
    });
  };
  const runBooking = () => {
    setPhase('running');
    const seq = split.map((g, i) => (i < split.length - 2 ? 'ok' : i === split.length - 2 ? 'need' : 'err'));
    setStates(split.reduce((m, g) => (m[g.id] = 'wait', m), {}));
    split.forEach((g, i) => {
      setTimeout(() => setStates((m) => ({ ...m, [g.id]: 'run' })), 400 * i + 200);
      setTimeout(() => setStates((m) => ({ ...m, [g.id]: seq[i] })), 400 * i + 900);
    });
    setTimeout(() => setPhase('result'), 400 * split.length + 1100);
  };
  const okCount = split.filter((g, i) => (i < split.length - 2)).reduce((n, g) => n + g.pax.length, 0);
  const confirmed = phase === 'result' ? okCount : 0;
  const need = pax.length - okCount;

  if (phase === 'idle') return (
    <div className="card card-pad" style={{ background: 'var(--surface-2)', textAlign: 'center' }}>
      <Icon name="copy" style={{ width: 30, height: 30, color: 'var(--teal)' }} strokeWidth={1.4} />
      <div style={{ fontWeight: 700, color: 'var(--ink)', margin: '8px 0 4px' }}>Единый блок недоступен — дроблёное бронирование</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>Поставщик ограничивает {s.maxPer} мест в одном бронировании. Система рассчитает разбиение {pax.length} участников и оформит несколько технических броней.</div>
      <Button icon="grid" onClick={startSplit}>Рассчитать распределение</Button>
    </div>
  );
  return (
    <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <Pill tone="teal"><Icon name="copy" style={{ width: 12, height: 12, verticalAlign: -2 }} /> Дроблёное · {split.length} брони</Pill>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>макс. {s.maxPer} на бронь · семьи и подгруппы держатся вместе</span>
        <div style={{ flex: 1 }} />
        {phase === 'preview' && <Button size="sm" icon="zap" onClick={runBooking}>Запустить бронирование</Button>}
        {phase === 'result' && need > 0 && <Pill tone="amber">Требуется решение по {need}</Pill>}
      </div>
      {phase === 'result' && (
        <WarnBanner tone={need > 0 ? 'amber' : 'red'} icon="alertTriangle"
          title={'Подтверждено ' + confirmed + ' из ' + pax.length + ' участников' + (need > 0 ? '. Требуется решение по ' + need + ' участникам' : '')}
          text="Ошибка одной технической брони не отменяет остальные. Уже подтверждённые брони не отменяются автоматически." />
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {split.map((g, i) => {
          const st = GR_BOOK_STATE[states[g.id] || 'wait'];
          return (
            <div key={g.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>Бронь #{i + 1}</span>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g.pax.length} чел. · {f$(g.pax.length * s.pricePer)}</span>
                {g.pax.some((p) => p.family) && <Pill tone="teal">семья вместе</Pill>}
                <div style={{ flex: 1 }} />
                {phase === 'preview' && <><button type="button" onClick={() => move(g.id, -1)} title="Переместить вверх" style={grIconBtn}><Icon name="chevUp" style={{ width: 14, height: 14 }} /></button><button type="button" onClick={() => move(g.id, 1)} title="Переместить вниз" style={grIconBtn}><Icon name="chevDown" style={{ width: 14, height: 14 }} /></button></>}
                {phase !== 'preview' && <Pill tone={st.tone}><Icon name={st.icon} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {st.l}</Pill>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted-2)', marginTop: 6 }}>{g.pax.map((p) => p.name).join(', ')}</div>
              {phase === 'result' && (states[g.id] === 'need' || states[g.id] === 'err') && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  <Button size="sm" variant="secondary" icon="loader" onClick={() => toast('Повторное бронирование только необработанных', 'info')}>Повторить</Button>
                  <Button size="sm" variant="secondary" icon="swap" onClick={() => toast('Выбор другого тарифа/рейса', 'info')}>Другой тариф/рейс</Button>
                  <Button size="sm" variant="secondary" icon="users" onClick={() => toast('Раздельное размещение согласовано', 'ok')}>Раздельно</Button>
                  <Button size="sm" variant="secondary" onClick={() => toast('Участники перераспределены', 'ok')}>Перераспределить</Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
const grIconBtn = { border: '1px solid var(--field-line)', background: '#fff', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' };


// Каналы запроса группового блока у поставщика (онлайн, почта и иные каналы связи)
const GR_CHANNELS = [
  { id: 'api', l: 'Онлайн / API', icon: 'api', sub: 'GDS · личный кабинет' },
  { id: 'email', l: 'Почта / Email', icon: 'mail', sub: 'групповой отдел' },
  { id: 'other', l: 'Иные каналы', icon: 'chat', sub: 'мессенджер · телефон' },
];

// Приводит обычную услугу заказа к параметрам, которые нужны сценарию группы
function grSvcModel(s, paxCount) {
  const per = Math.max(1, paxCount || s.pax || 1);
  const maxPer = s.kind === 'Гостиница' ? 5 : s.kind === 'Авиа' ? 9 : s.kind === 'ЖД' ? 4 : 30;
  return {
    ...s, maxPer,
    pricePer: Math.max(1, Math.round((Number(s.sum) || 0) / per)) || 100,
    requested: per, confirmed: 0, issued: 0,
    block: { no: 'GRP-' + (s.id || ''), pnr: '—', confirmedSeats: 0, blockValid: '—' },
  };
}


// Per-service сценарий оформления группы: единый блок у поставщика ИЛИ дроблёное бронирование.
// Выбор услуг делается точно так же, как в обычном заказе; здесь — только способ подачи запроса
// поставщику и переход к дроблению при невозможности предоставить блок.
function GroupServiceScenario({ s, pax = [], orderNo }) {
  const toast = useToast();
  const paxCount = pax.length || s.pax || 1;
  const [scenario, setScenario] = useState('block');   // 'block' | 'split'
  const [open, setOpen] = useState(false);
  const [req, setReq] = useState('idle');               // idle | sent | confirmed | denied
  const [channel, setChannel] = useState(null);
  const supplier = s.supplier || 'поставщик';
  const gsvc = grSvcModel(s, paxCount);

  const sendRequest = (ch) => {
    setChannel(ch); setReq('sent');
    toast('Запрос группового блока отправлен · ' + ch.l + ' · ' + supplier, 'ok');
    setTimeout(() => setReq('confirmed'), 1400);
  };
  const goSplit = () => { setScenario('split'); setOpen(true); toast('Услуга переведена на дроблёное бронирование', 'info'); };

  const summary = scenario === 'split'
    ? { l: 'Дроблёное бронирование', tone: 'teal', icon: 'copy' }
    : req === 'confirmed' ? { l: 'Групповой блок подтверждён', tone: 'green', icon: 'checkCircle' }
    : req === 'sent' ? { l: 'Блок запрошен · ожидаем ответ', tone: 'blue', icon: 'loader' }
    : req === 'denied' ? { l: 'Блок недоступен', tone: 'amber', icon: 'alertTriangle' }
    : { l: 'Групповой блок', tone: 'blue', icon: 'grid' };

  return (
    <div style={{ margin: '0 0 10px 50px', borderLeft: '2px solid var(--field-line)', paddingLeft: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '2px 0 6px' }}>
        <Pill tone="blue"><Icon name="users" style={{ width: 12, height: 12, verticalAlign: -2 }} /> Оформление в группе</Pill>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Способ:</span>
        {[['block', 'Групповой блок', 'grid'], ['split', 'Дроблёное', 'copy']].map(([key, label, ic]) => (
          <button key={key} type="button" onClick={() => { setScenario(key); setOpen(true); }}
            style={{ padding: '5px 11px', borderRadius: 8, border: '1px solid ' + (scenario === key ? 'var(--blue)' : 'var(--field-line)'), background: scenario === key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: scenario === key ? 'var(--blue-soft-text)' : 'var(--body)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name={ic} style={{ width: 13, height: 13 }} />{label}
          </button>
        ))}
        <Pill tone={summary.tone}><Icon name={summary.icon} style={{ width: 12, height: 12, verticalAlign: -2 }} /> {summary.l}</Pill>
        <div style={{ flex: 1 }} />
        <Button size="sm" variant="secondary" icon={open ? 'chevUp' : 'chevDown'} onClick={() => setOpen((v) => !v)}>{open ? 'Свернуть' : 'Настроить'}</Button>
      </div>

      {open && scenario === 'block' && (
        <div className="card card-pad" style={{ background: 'var(--surface-2)', marginTop: 4 }}>
          {req === 'idle' && (<>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 4 }}>Запрос группового блока у поставщика</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 12 }}>{supplier} · {paxCount} мест. Выберите канал связи для запроса блока.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 10 }}>
              {GR_CHANNELS.map((ch) => (
                <button key={ch.id} type="button" onClick={() => sendRequest(ch)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid var(--field-line)', borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left' }}>
                  <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 34, height: 34 }}><Icon name={ch.icon} /></span>
                  <span><div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 13.5 }}>{ch.l}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{ch.sub}</div></span>
                </button>
              ))}
            </div>
          </>)}
          {req === 'sent' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Icon name="loader" style={{ width: 20, height: 20, color: 'var(--blue)', animation: 'spin 1s linear infinite' }} />
              <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>Запрос отправлен · {channel && channel.l}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Ожидаем подтверждение блока от {supplier}. Ответ автоматически привяжется к услуге.</div></div>
              <Button size="sm" variant="secondary" icon="alertTriangle" onClick={() => setReq('denied')}>Блок недоступен</Button>
            </div>
          )}
          {req === 'confirmed' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Icon name="checkCircle" style={{ width: 22, height: 22, color: 'var(--green)' }} />
              <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>Групповой блок подтверждён на {paxCount} мест</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{supplier} · канал {channel && channel.l}. Дальше — внесение имён и выписка по блоку.</div></div>
              <Button size="sm" variant="secondary" icon="mail" onClick={() => toast('Запрос повторно отправлен поставщику', 'ok')}>Повторить запрос</Button>
            </div>
          )}
          {req === 'denied' && (
            <WarnBanner tone="amber" icon="alertTriangle" title="Поставщик не может предоставить единый блок"
              text={<span>По услуге «{s.title || s.kind}» блок недоступен. Оформите её дроблёным бронированием — система разобьёт {paxCount} участников на несколько технических броней.
                <span style={{ display: 'block', marginTop: 10 }}><Button size="sm" icon="copy" onClick={goSplit}>Перейти к дроблёному бронированию</Button></span></span>} />
          )}
        </div>
      )}

      {open && scenario === 'split' && <div style={{ marginTop: 4 }}><SplitFlow s={gsvc} pax={pax} /></div>}
    </div>
  );
}


function GrServiceCard({ o, s }) {
  const toast = useToast();
  const [open, setOpen] = useState(s.status === 'Требуется решение');
  const [scenario, setScenario] = useState(s.scenario);
  const sc = GR_SCENARIO[scenario];
  const k = SERVICE_KIND[s.kind] || {};
  const showClassic = scenario === 'classic' || scenario === 'mixed';
  const showSplit = scenario === 'split' || scenario === 'mixed';
  const splitPax = scenario === 'mixed' ? o.pax.slice(s.block.confirmedSeats) : o.pax.slice(0, s.requested);
  return (
    <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', cursor: 'pointer' }} onClick={() => setOpen((v) => !v)}>
        <span className="oc-svc-ic" style={{ background: k.color || 'var(--blue)', width: 38, height: 38 }}><Icon name={k.icon || 'briefcase'} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.kind}</span>
            <Pill tone={sc.tone}>{sc.l}</Pill>
            <Pill tone={grStatusTone(s.status)}>{s.status}</Pill>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{s.supplier} · подтверждено {s.confirmed}/{s.requested} · выписано {s.issued} · {f$(s.pricePer * s.confirmed)}</div>
        </div>
        <Icon name={open ? 'chevUp' : 'chevDown'} style={{ width: 18, height: 18, color: 'var(--muted-2)' }} />
      </div>
      {open && (
        <div style={{ padding: '0 18px 18px', display: 'grid', gap: 12 }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Сценарий оформления:</span>
            {Object.entries(GR_SCENARIO).map(([key, v]) => (
              <button key={key} type="button" onClick={() => { setScenario(key); toast('Сценарий услуги · ' + v.l, 'info'); }}
                className={'seg-btn' + (scenario === key ? ' active' : '')} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (scenario === key ? 'var(--blue)' : 'var(--field-line)'), background: scenario === key ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: scenario === key ? 'var(--blue-soft-text)' : 'var(--body)' }}>{v.l}</button>
            ))}
            {scenario === 'mixed' && <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>· блок {s.block.confirmedSeats} + дроблёно {o.pax.length - s.block.confirmedSeats}</span>}
          </div>
          {showClassic && <ClassicBlockCard s={s} />}
          {showSplit && <SplitFlow s={s} pax={splitPax} />}
        </div>
      )}
    </div>
  );
}

function GrServicesTab({ o }) {
  const toast = useToast();
  const [create, setCreate] = useState(false);
  return (
    <div className="fade-in">
      <GrMassActions o={o} />
      {o.services.map((s) => <GrServiceCard key={s.id} o={o} s={s} />)}
      <Button variant="secondary" icon="plus" onClick={() => setCreate(true)}>Добавить групповую услугу / запрос</Button>
      {create && <GroupRequestPanel onClose={() => setCreate(false)} />}
    </div>
  );
}


const GR_MASS_ACTIONS = [
  { id: 'req', l: 'Запросить блок', icon: 'send' }, { id: 'confirm', l: 'Подтвердить блок', icon: 'check' },
  { id: 'load', l: 'Загрузить список', icon: 'download' }, { id: 'sendlist', l: 'Отправить список', icon: 'mail' },
  { id: 'split', l: 'Запустить дроблёное', icon: 'copy' }, { id: 'retry', l: 'Повторить необработанных', icon: 'loader' },
  { id: 'issue', l: 'Выписать готовые', icon: 'ticket' }, { id: 'docs', l: 'Сформировать документы', icon: 'docs' },
  { id: 'senddocs', l: 'Отправить документы', icon: 'share' }, { id: 'exchange', l: 'Массовый обмен', icon: 'swap' },
  { id: 'refund', l: 'Массовый возврат', icon: 'refund' }, { id: 'reduce', l: 'Сократить группу', icon: 'users' },
  { id: 'cancel', l: 'Аннулировать блок', icon: 'x', danger: true },
];
function GrMassActions({ o }) {
  const toast = useToast();
  const [confirm, setConfirm] = useState(null);
  const agg = grAgg(o);
  const run = (a) => {
    toast('Массовое действие выполнено: ' + a.l, a.danger ? 'warn' : 'ok');
    setConfirm(null);
  };
  return (
    <div className="card card-pad" style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Icon name="sparkles" style={{ width: 16, height: 16, color: 'var(--blue)' }} />
        <h3 className="card-title" style={{ fontSize: 15 }}>Массовые действия по группе</h3>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {GR_MASS_ACTIONS.map((a) => (
          <Button key={a.id} size="sm" variant={a.danger ? 'secondary' : 'secondary'} icon={a.icon} onClick={() => setConfirm(a)}>{a.l}</Button>
        ))}
      </div>
      {confirm && (
        <Modal open onClose={() => setConfirm(null)} size="sm" ariaLabel={confirm.l}>
          <ModalHeader title={confirm.l + '?'} sub="Проверьте охват и последствия перед выполнением" onClose={() => setConfirm(null)} />
          <div style={{ paddingTop: 4 }}>
            <div className="card card-pad" style={{ background: 'var(--surface-2)', marginBottom: 14 }}>
              <FinRow label="Затронуто участников" value={agg.total} />
              <FinRow label="Будет обработано" value={agg.confirmed + ' подтверждённых'} tone="var(--green)" />
              <FinRow label="Не будет обработано" value={agg.noSeat + ' без места/номера'} tone={agg.noSeat ? 'var(--amber)' : undefined} />
              <FinRow label="Причина исключения" value={agg.noSeat ? 'нет подтверждения по 6 участникам' : '—'} />
              <FinRow label="Финансовые последствия" value={confirm.id === 'refund' ? 'возврат со штрафами по тарифам' : confirm.id === 'cancel' ? 'штраф аннуляции 15%' : 'без доп. списаний'} />
              <FinRow label="Необратимость" value={confirm.danger ? 'действие необратимо' : 'обратимо'} tone={confirm.danger ? 'var(--red)' : undefined} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" style={{ flex: 1 }} onClick={() => setConfirm(null)}>Отмена</Button>
              <Button style={{ flex: 1 }} variant={confirm.danger ? 'danger' : 'primary'} onClick={() => run(confirm)}>Выполнить</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}




const GR_MATRIX_COLS = {
  'Авиа': ['Пассажир', 'Подгруппа', 'PNR', 'Рейс', 'Класс', 'Тариф', 'Багаж', 'Место', 'Стоимость', 'Статус'],
  'ЖД': ['Пассажир', 'Подгруппа', 'Номер брони', 'Поезд', 'Вагон', 'Место', 'Класс', 'Стоимость', 'Статус'],
  'Гостиница': ['Гость', 'Подгруппа', 'Гостиница', 'Номер брони', 'Тип номера', 'Соседи', 'Питание', 'Стоимость', 'Статус'],
};
function grMatrixRow(kind, p, i, s) {
  const pnr = 'TK/AB' + (10 + (i % 4)) + 'CD';
  const status = GR_PAX_STATUS[p.status];
  const price = f$(s.pricePer);
  if (kind === 'Авиа') return [p.name, p.sub, pnr, 'TK 371', i % 5 === 0 ? 'Комфорт' : 'Эконом', i % 5 === 0 ? 'Flex' : 'Standard', '20 кг', (12 + i) + (['A', 'B', 'C', 'D', 'E', 'F'][i % 6]), price, status];
  if (kind === 'ЖД') return [p.name, p.sub, 'RZD-' + (2200 + i), '024Ц', String(1 + (i % 3)), String(5 + i), 'Купе', price, status];
  return [p.name, p.sub, 'Hilton Istanbul', 'HIL-' + (100 + i), i % 4 === 0 ? 'Suite' : 'DBL', i % 2 ? '—' : 'семья', 'Завтрак', price, status];
}
function GrMatrixTab({ o }) {
  const kinds = o.services.map((s) => s.kind).filter((k) => GR_MATRIX_COLS[k]);
  const [kind, setKind] = useState(kinds[0] || 'Авиа');
  const s = o.services.find((x) => x.kind === kind);
  const cols = GR_MATRIX_COLS[kind];
  const pax = o.pax.slice(0, s ? s.requested : o.pax.length);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <h3 className="card-title" style={{ fontSize: 16 }}>Матрица группы</h3>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>единый вид всей группы вместо отдельных броней</span>
        <div style={{ flex: 1 }} />
        <Tabs tabs={kinds.map((k) => ({ key: k, label: k }))} value={kind} onChange={setKind} />
      </div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr>{cols.map((c) => <th key={c} style={{ textAlign: c === 'Стоимость' ? 'right' : 'left' }}>{c}</th>)}</tr></thead>
          <tbody>
            {pax.map((p, i) => {
              const row = grMatrixRow(kind, p, i, s);
              return (
                <tr key={p.id}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ textAlign: cols[ci] === 'Стоимость' ? 'right' : 'left', fontWeight: ci === 0 ? 600 : 400 }}>
                      {ci === row.length - 1 ? <Pill tone={GR_PAX_TONE[p.status]}>{cell}</Pill> : cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}




const GR_DIFFS = [
  { param: 'Тариф', values: [{ b: 'Бронь #1–3', v: 'Standard' }, { b: 'Бронь #4', v: 'Flex (+18 $)' }], warn: true },
  { param: 'Класс обслуживания', values: [{ b: 'Бронь #1–3', v: 'Эконом' }, { b: 'Бронь #4', v: 'Комфорт' }], warn: true },
  { param: 'Правила возврата', values: [{ b: 'Standard', v: 'штраф 25%' }, { b: 'Flex', v: 'без штрафа' }], warn: true },
  { param: 'Багаж', values: [{ b: 'Все брони', v: '20 кг' }], warn: false },
  { param: 'Тайм-лимит выписки', values: [{ b: 'Бронь #1–3', v: '30.07 18:00' }, { b: 'Бронь #4', v: '28.07 12:00' }], warn: true },
  { param: 'Поставщик', values: [{ b: 'Все брони', v: 'Turkish Airlines' }], warn: false },
];
function GrDiffTab() {
  return (
    <div className="fade-in">
      <WarnBanner tone="amber" icon="alertTriangle" title="Обнаружены различия между техническими бронированиями"
        text="В дроблёном сценарии условия по разным броням могут отличаться. Проверьте до подтверждения или выписки." />
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Параметр</th><th>Значения по бронированиям</th><th style={{ width: 120 }}>Статус</th></tr></thead>
          <tbody>
            {GR_DIFFS.map((d, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{d.param}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {d.values.map((v, vi) => <span key={vi} style={{ fontSize: 12.5 }}><span style={{ color: 'var(--muted-2)' }}>{v.b}:</span> <b style={{ color: 'var(--ink)' }}>{v.v}</b></span>)}
                  </div>
                </td>
                <td>{d.warn ? <Pill tone="amber">Различие</Pill> : <Pill tone="green">Одинаково</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}




function GrFinanceTab({ o }) {
  const agg = grAgg(o);
  const paid = o.services.reduce((s, x) => s + x.paid, 0);
  const debt = agg.cost - paid;
  const fee = Math.round(agg.cost * 0.06);
  const profit = Math.round(agg.cost * 0.11);
  return (
    <div className="fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 12, marginBottom: 16 }}>
        <StatTile label="Общая стоимость группы" value={f$(agg.cost)} icon="finance" />
        <StatTile label="Оплачено клиентом" value={f$(paid)} tone="var(--green)" />
        <StatTile label="Задолженность" value={f$(debt)} tone={debt > 0 ? 'var(--amber)' : 'var(--green)'} />
        <StatTile label="Сервисный сбор" value={f$(fee)} />
        <StatTile label="Прибыль" value={f$(profit)} tone="var(--green)" icon="pie" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {o.services.map((s) => {
          const isSplit = s.scenario !== 'classic';
          return (
            <div key={s.id} className="card card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Pill tone={GR_SCENARIO[s.scenario].tone}>{GR_SCENARIO[s.scenario].l}</Pill>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{s.kind}</span>
              </div>
              {!isSplit ? (<>
                <FinRow label="Стоимость блока" value={f$(s.pricePer * s.block.confirmedSeats)} />
                <FinRow label="Депозит" value={f$(s.deposit)} />
                <FinRow label="Остаток к оплате" value={f$(s.pricePer * s.confirmed - s.paid)} tone="var(--amber)" />
                <FinRow label="Штрафы при сокращении" value={s.reduceRule} />
              </>) : (<>
                <FinRow label="Стоимость всех броней" value={f$(s.pricePer * s.confirmed)} />
                <FinRow label="Разница тарифов" value="+18 $ (Flex по 1 брони)" tone="var(--amber)" />
                <FinRow label="Штрафы / возвраты" value="по тарифу каждой брони" />
                <FinRow label="Сумма доплаты" value={f$(s.pricePer * (s.requested - s.confirmed))} tone="var(--red)" />
              </>)}
            </div>
          );
        })}
      </div>
    </div>
  );
}




function GrPaxTab({ o }) {
  const [sub, setSub] = useState('');
  const subs = [...new Set(o.pax.map((p) => p.sub))];
  const list = sub ? o.pax.filter((p) => p.sub === sub) : o.pax;
  const stCount = (k) => o.pax.filter((p) => p.status === k).length;
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <h3 className="card-title" style={{ fontSize: 16 }}>Единый список группы · {o.pax.length} чел.</h3>
        <div style={{ flex: 1 }} />
        {Object.keys(GR_PAX_STATUS).map((k) => <Pill key={k} tone={GR_PAX_TONE[k]}>{GR_PAX_STATUS[k]}: {stCount(k)}</Pill>)}
      </div>
      <div style={{ marginBottom: 12 }}><FilterChip label="Подгруппа" value={sub} onChange={setSub} options={subs} /></div>
      <div className="table-card">
        <table className="tbl">
          <thead><tr><th>Участник</th><th>Пол</th><th>Подгруппа / признаки</th><th>Статус обработки</th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{p.sex}</td>
                <td><div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}><span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{p.sub}</span>{paxTags(p).map((t, i) => <Pill key={i} tone={t.tone}>{t.l}</Pill>)}</div></td>
                <td><Pill tone={GR_PAX_TONE[p.status]}>{GR_PAX_STATUS[p.status]}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function GrHistoryTab({ o }) {
  const hist = [
    { t: '18.07 · 12:40', text: 'Дроблёное бронирование: подтверждено 24 из 30, требуется решение по 6', who: 'Система' },
    { t: '18.07 · 12:30', text: 'Запущено параллельное бронирование по 4 техническим броням', who: 'Даниель' },
    { t: '17.07 · 16:10', text: 'Блок Turkish Airlines подтверждён на 20 мест (PNR TK/AB12CD)', who: 'Turkish Airlines' },
    { t: '16.07 · 09:20', text: 'Гостиница Hilton: квота 15 номеров подтверждена', who: 'Ratehawk' },
    { t: '15.07 · 11:00', text: 'Групповой запрос отправлен поставщикам (email + API)', who: 'Даниель' },
    { t: '14.07 · 10:00', text: 'Создан основной групповой заказ · 30 участников', who: 'Даниель' },
  ];
  return (
    <div className="fade-in">
      <h3 className="card-title" style={{ fontSize: 16, marginBottom: 12 }}>История группового заказа</h3>
      <div className="card card-pad" style={{ display: 'grid', gap: 10 }}>
        {hist.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, paddingBottom: 10, borderBottom: i < hist.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span style={{ color: 'var(--muted-2)', fontSize: 12.5, width: 92, flexShrink: 0 }}>{h.t}</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 13.5, color: 'var(--ink)' }}>{h.text}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{h.who}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}




function GrDocsTab({ o }) {
  const toast = useToast();
  const [phase, setPhase] = useState('idle');
  const [rows, setRows] = useState(() => o.pax.map((p) => ({ p, doc: null, match: null })));
  const upload = () => {
    setPhase('matching');

    setTimeout(() => {
      setRows(o.pax.map((p, i) => {
        const unmatched = i >= o.pax.length - 3;
        return { p, doc: 'Билет · ' + p.name.split(' ')[0] + '.pdf', match: unmatched ? 'none' : 'auto' };
      }));
      setPhase('done');
      toast('Загружено ' + o.pax.length + ' документов · сопоставлено автоматически ' + (o.pax.length - 3), 'ok');
    }, 1100);
  };
  const manualMatch = (id) => setRows((rs) => rs.map((r) => r.p.id === id ? { ...r, match: 'manual' } : r));
  const matched = rows.filter((r) => r.match === 'auto' || r.match === 'manual').length;
  const tone = { auto: 'green', manual: 'teal', none: 'amber' };
  const label = { auto: 'Сопоставлено автоматически', manual: 'Сопоставлено вручную', none: 'Не сопоставлено' };
  return (
    <div className="fade-in">
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Icon name="docs" style={{ width: 18, height: 18, color: 'var(--blue)' }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>Документы группы</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Оператор не скачивает документы из почты вручную — CRM принимает пакет, распознаёт тип и сопоставляет с участником.</div>
          </div>
          <Button icon="download" disabled={phase === 'matching'} onClick={upload}>{phase === 'matching' ? 'Сопоставление…' : phase === 'done' ? 'Загрузить ещё пакет' : 'Массовая загрузка документов'}</Button>
        </div>
        {phase === 'done' && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <Button size="sm" variant="secondary" icon="template" onClick={() => toast('Сформированы фирменные бланки', 'ok')}>Фирменные бланки</Button>
            <Button size="sm" variant="secondary" icon="docs" onClick={() => toast('Собран общий комплект на группу', 'ok')}>Общий комплект на группу</Button>
            <Button size="sm" variant="secondary" icon="users" onClick={() => toast('Собраны комплекты по пассажирам', 'ok')}>Комплекты по пассажирам</Button>
            <Button size="sm" icon="send" onClick={() => toast('Документы массово отправлены клиенту', 'ok')}>Массовая отправка клиенту</Button>
          </div>
        )}
      </div>
      {phase === 'done' && matched < rows.length && (
        <WarnBanner tone="amber" icon="alertTriangle" title={'Сопоставлено ' + matched + ' из ' + rows.length + ' документов'} text="По части участников автоматическое сопоставление не удалось — сопоставьте вручную." />
      )}
      {phase !== 'idle' && (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>Участник</th><th>Документ</th><th>Сопоставление</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.p.id}>
                  <td style={{ fontWeight: 600 }}>{r.p.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{r.doc || (phase === 'matching' ? 'загрузка…' : '—')}</td>
                  <td>{r.match ? <Pill tone={tone[r.match]}>{label[r.match]}</Pill> : <Pill tone="gray">ожидает</Pill>}</td>
                  <td>{r.match === 'none' && <Button size="sm" variant="secondary" onClick={() => manualMatch(r.p.id)}>Сопоставить вручную</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {phase === 'idle' && <div className="card card-pad" style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Нажмите «Массовая загрузка документов» — CRM сохранит входящие документы в заказе, распознает тип и сопоставит с участниками.</div>}
    </div>
  );
}




const GR_DETAIL_TABS = [{ key: 'services', label: 'Услуги' }, { key: 'matrix', label: 'Матрица' }, { key: 'diff', label: 'Различия' }, { key: 'docs', label: 'Документы' }, { key: 'finance', label: 'Финансы' }, { key: 'pax', label: 'Участники' }, { key: 'history', label: 'История' }];
function GroupOrderDetail({ o, onBack }) {
  const [tab, setTab] = useState('services');
  const agg = grAgg(o);
  const kpis = [
    { l: 'Участников всего', v: agg.total }, { l: 'Подтверждено', v: agg.confirmed, tone: 'var(--green)' },
    { l: 'Выписано', v: agg.issued }, { l: 'Без места/номера', v: agg.noSeat, tone: agg.noSeat ? 'var(--amber)' : undefined },
    { l: 'Тех. бронирований', v: agg.bookings }, { l: 'Ближайший тайм-лимит', v: '25.07 · имена', tone: 'var(--amber)' },
    { l: 'Общая стоимость', v: f$(agg.cost) }, { l: 'Проблем', v: agg.problems, tone: agg.problems ? 'var(--red)' : 'var(--green)' },
  ];
  return (
    <div className="fade-in">
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}><Icon name="chevLeft" style={{ width: 16, height: 16 }} />Ко всем групповым заказам</button>
      <div className="card card-pad" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <span className="oc-svc-ic" style={{ background: '#5a5af0', width: 36, height: 36 }}><Icon name="users" /></span>
          <h2 className="section-title" style={{ fontSize: 20 }}>Групповой заказ № {o.no}</h2>
          <Pill tone={grStatusTone(o.status)}>{o.status}</Pill>
          <div style={{ flex: 1 }} />
          <Button variant="secondary" size="sm" icon="mail">Переписка</Button>
          <Button variant="secondary" size="sm" icon="docs">Документы</Button>
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{o.client} · {o.legal} · контакт: {o.contact}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{o.route} · {o.dateFrom} – {o.dateTo} · операторы: {o.operators.join(', ')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginTop: 14 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: k.tone || 'var(--ink)' }}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}><Tabs tabs={GR_DETAIL_TABS} value={tab} onChange={setTab} /></div>
      {tab === 'services' && <GrServicesTab o={o} />}
      {tab === 'matrix' && <GrMatrixTab o={o} />}
      {tab === 'diff' && <GrDiffTab o={o} />}
      {tab === 'docs' && <GrDocsTab o={o} />}
      {tab === 'finance' && <GrFinanceTab o={o} />}
      {tab === 'pax' && <GrPaxTab o={o} />}
      {tab === 'history' && <GrHistoryTab o={o} />}
    </div>
  );
}




// Групповой заказ открывается в ТОЙ ЖЕ карточке, что и обычный (OrderCard) — идентичный вид,
// отличаются только вкладки. Приводим групповую модель к форме заказа реестра.
function grToOrderShape(o) {
  const stMap = {
    'Требуется решение': 'Требует проверки', 'Требуется вмешательство': 'Требует проверки',
    'Ожидается ответ': 'В работе', 'Ожидается оплата': 'Ожидание оплаты',
    'Подготовка запроса': 'Новое', 'Подготовка распределения': 'Новое',
  };
  return {
    no: o.no, client: o.client, requestType: 'Групповая', isGroup: true,
    service: (o.services && o.services[0] && o.services[0].kind) || 'Авиа',
    status: stMap[o.status] || 'В работе',
    operator: (o.operators && o.operators[0]) || o.operator || 'Даниель', operatorRole: 'Оператор',
    sum: grAgg(o).cost || 0, currency: 'USD',
    services: (o.services && o.services.length) || 1, progress: 0,
    date: o.dateFrom || o.date || '14.06.26',
  };
}

function GroupsPage({ onOpenOrder }) {
  const toast = useToast();
  const [create, setCreate] = useState(false);
  const [orders, setOrders] = useState(GROUP_ORDERS);
  const openOrder = (o) => { if (onOpenOrder) onOpenOrder(grToOrderShape(o)); };
  const handleCreated = (o) => {
    const g = {
      no: o.no, client: o.client, legal: o.client, contact: '—',
      route: '—', dateFrom: o.date || '—', dateTo: '—',
      operators: [o.operator || 'Оператор'],
      pax: [], status: 'Подготовка запроса', services: [],
    };
    setOrders((list) => [g, ...list]);
    setCreate(false);
    toast('Групповой заказ № ' + o.no + ' создан', 'ok');
    openOrder(g);
  };
  return (
    <>
      <Topbar title="Групповые бронирования" sub="Те же заказы — карточка как у обычного, отличаются только вкладки" />
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Основной групповой заказ = одна поездка, один состав, одна финсводка. Различие — только в способе оформления у поставщика.</div>
          <div style={{ flex: 1 }} />
          <Button icon="plus" onClick={() => setCreate(true)}>Создать групповой заказ</Button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px,1fr))', gap: 14 }}>
          {orders.map((o) => {
            const agg = grAgg(o);
            return (
              <div key={o.no} className="card card-pad" style={{ cursor: 'pointer' }} onClick={() => openOrder(o)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span className="oc-svc-ic" style={{ background: '#5a5af0', width: 34, height: 34 }}><Icon name="users" /></span>
                  <div style={{ flex: 1 }}><div style={{ fontWeight: 700, color: 'var(--ink)' }}>№ {o.no} · {o.client}</div><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{o.route} · {o.dateFrom}–{o.dateTo}</div></div>
                  <Pill tone={grStatusTone(o.status)}>{o.status}</Pill>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {o.services.map((s) => <Pill key={s.id} tone={GR_SCENARIO[s.scenario].tone}>{s.kind} · {GR_SCENARIO[s.scenario].l}</Pill>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[['Участников', agg.total], ['Подтв.', agg.confirmed], ['Броней', agg.bookings], ['Проблем', agg.problems]].map(([l, v], i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', borderRadius: 10, background: 'var(--surface-2)' }}>
                      <div style={{ fontSize: 17, fontWeight: 800, color: l === 'Проблем' && v > 0 ? 'var(--red)' : 'var(--ink)' }}>{v}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, color: 'var(--muted)' }}>
                  <Icon name="finance" style={{ width: 13, height: 13 }} />Стоимость: <b style={{ color: 'var(--ink)' }}>{f$(agg.cost)}</b>
                  <div style={{ flex: 1 }} /><span style={{ color: 'var(--blue-soft-text)', fontWeight: 600 }}>Открыть →</span>
                </div>
              </div>
            );
          })}
        </div>
        <OrderCreateModal open={create} initialGroup onClose={() => setCreate(false)} onCreated={handleCreated} />
      </div>
    </>
  );
}

Object.assign(window, { GroupsPage, GROUP_ORDERS });



export { GR_CLASSIC_STATUS, GR_SPLIT_STATUS, grStatusTone, GR_PAX_STATUS, GR_PAX_TONE, GR_BOOK_STATE, GR_SCENARIO, GR_SURNAMES, GR_NAMES, GR_PAX, paxTags, computeSplit, GROUP_ORDERS, grAgg, GroupRequestPanel, GR_CLASSIC_STEPS, classicStage, ClassicStepper, ClassicBlockCard, SplitFlow, grIconBtn, GR_CHANNELS, grSvcModel, GroupServiceScenario, GrServiceCard, GrServicesTab, GR_MASS_ACTIONS, GrMassActions, GR_MATRIX_COLS, grMatrixRow, GrMatrixTab, GR_DIFFS, GrDiffTab, GrFinanceTab, GrPaxTab, GrHistoryTab, GrDocsTab, GR_DETAIL_TABS, GroupOrderDetail, GroupsPage };
