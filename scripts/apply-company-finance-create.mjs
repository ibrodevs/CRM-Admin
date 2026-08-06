import { readFile, writeFile } from 'node:fs/promises';

const fileUrl = new URL('../js/page_company_finance.jsx', import.meta.url);
let source = await readFile(fileUrl, 'utf8');
let changed = false;

const replaceOnce = (from, to, label) => {
  if (source.includes(to)) return;
  if (!source.includes(from)) throw new Error(`Не найден фрагмент для изменения: ${label}`);
  source = source.replace(from, to);
  changed = true;
};

const createDrawer = `
function CompanyFinanceCreateDrawer({ open, co, onClose, onCreated }) {
  const toast = useToast();
  const [settlement, setSettlement] = useState('предоплата');
  const [template, setTemplate] = useState('standard');
  const [contractNo, setContractNo] = useState('');
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [initialBalance, setInitialBalance] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [termDays, setTermDays] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSettlement('предоплата');
    setTemplate('standard');
    setContractNo('');
    setContractDate(new Date().toISOString().slice(0, 10));
    setInitialBalance(0);
    setCreditLimit(0);
    setTermDays(30);
    setSaving(false);
  }, [open, co && co.id]);

  const save = async () => {
    const rawNo = contractNo.trim();
    if (!rawNo) { toast('Укажите номер договора', 'err'); return; }
    const balance = Math.max(0, Number(initialBalance) || 0);
    const limit = Math.max(0, Number(creditLimit) || 0);
    const days = Math.max(0, Number(termDays) || 0);
    if (settlement === 'отсрочка' && !limit) { toast('Укажите кредитный лимит', 'err'); return; }
    if (settlement === 'отсрочка' && !days) { toast('Укажите срок отсрочки', 'err'); return; }

    const date = contractDate ? contractDate.split('-').reverse().join('.') : cfNow().split(' ')[0];
    const no = rawNo.startsWith('№') ? rawNo : '№ ' + rawNo;
    const agreement = {
      id: cfUid('A'), no: 'ДС № 1', date, version: 1, status: 'Действующий', template,
      fees: feesFromTemplate(template), descs: descsFromDefaults(), feeDescs: feeDescsFromDefaults(),
      history: [{
        date: cfNow(), user: (window.CURRENT_USER && CURRENT_USER.name) || 'Оператор',
        title: 'ДС № 1 · создано', fields: ['Созданы финансовые условия', 'Шаблон «' + feeTemplate(template).name + '»'],
      }],
    };
    const contract = { id: cfUid('C'), no, date, status: 'Действующий', agreements: [agreement] };
    const next = {
      settlement,
      deposit: settlement === 'депозит' ? {
        balance, reserved: 0,
        history: balance ? [{ date, type: 'Начальный остаток', amount: balance, note: 'Задан при создании финансовых условий' }] : [],
      } : null,
      credit: settlement === 'отсрочка' ? { limit, termDays: days, debt: 0, overdue: 0 } : null,
      contracts: [contract],
    };

    try {
      setSaving(true);
      await onCreated(next);
      toast('Финансовые условия для «' + co.name + '» созданы', 'ok');
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось создать финансовые условия', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} width="min(720px,96vw)"
      title="Новые финансовые условия" sub={co && co.name}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
        <Button icon="check" onClick={save} disabled={saving}>{saving ? 'Сохранение…' : 'Создать условия'}</Button>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ padding: '12px 14px', borderLeft: '3px solid var(--blue)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <Icon name="finance" style={{ width: 18, height: 18, color: 'var(--blue)', marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>Настройте условия работы с компанией</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Будут созданы тип взаиморасчётов, договор и первое доп. соглашение со сборами по выбранному шаблону.</div>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 9 }}>1. Тип взаиморасчётов</div>
          <div className="seg-toggle" style={{ width: '100%', maxWidth: 520 }}>
            {SETTLEMENT_TYPES.map((type) => (
              <button type="button" key={type} className={'seg-btn' + (settlement === type ? ' active' : '')}
                onClick={() => setSettlement(type)}>{type[0].toUpperCase() + type.slice(1)}</button>
            ))}
          </div>
        </div>

        {settlement === 'депозит' && (
          <div className="card card-pad">
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Депозит</div>
            <label style={{ display: 'block' }}>
              <span className="label">Начальный баланс, $</span>
              <Input type="number" min="0" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0" />
            </label>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Зарезервировано при создании: 0 $. История начнётся с указанного остатка.</div>
          </div>
        )}

        {settlement === 'отсрочка' && (
          <div className="card card-pad">
            <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Отсрочка платежа</div>
            <div className="grid-2" style={{ gap: 12 }}>
              <label style={{ display: 'block' }}>
                <span className="label">Кредитный лимит, $</span>
                <Input type="number" min="0" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="Например, 50000" />
              </label>
              <label style={{ display: 'block' }}>
                <span className="label">Срок отсрочки, дней</span>
                <Input type="number" min="1" value={termDays} onChange={(e) => setTermDays(e.target.value)} />
              </label>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>Начальная задолженность и просрочка будут равны 0 $.</div>
          </div>
        )}

        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 9 }}>2. Договор</div>
          <div className="grid-2" style={{ gap: 12 }}>
            <label style={{ display: 'block' }}>
              <span className="label">Номер договора *</span>
              <Input value={contractNo} onChange={(e) => setContractNo(e.target.value)} placeholder="Например, 2026-001" />
            </label>
            <label style={{ display: 'block' }}>
              <span className="label">Дата договора</span>
              <Input type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
            </label>
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 9 }}>3. Сборы и надбавки</div>
          <label style={{ display: 'block', maxWidth: 360 }}>
            <span className="label">Шаблон первого доп. соглашения</span>
            <Select options={FEE_TEMPLATES.map((item) => ({ value: item.id, label: item.name }))}
              value={template} onChange={(e) => setTemplate(e.target.value)} />
          </label>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>После создания каждый сбор можно изменить отдельно через кнопку «Изменить условия».</div>
        </div>

        <div className="card card-pad" style={{ background: 'var(--surface-2)' }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Будет создано</div>
          <div className="kv">
            <div className="kv-row"><span className="k">Тип расчётов</span><span className="v">{settlement}</span></div>
            <div className="kv-row"><span className="k">Договор</span><span className="v">{contractNo.trim() || 'номер не указан'}</span></div>
            <div className="kv-row"><span className="k">Доп. соглашение</span><span className="v">ДС № 1 · {feeTemplate(template).name}</span></div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

`;

if (!source.includes('function CompanyFinanceCreateDrawer(')) {
  const marker = 'function CompanyFinanceBlock({ co }) {';
  if (!source.includes(marker)) throw new Error('Не найден CompanyFinanceBlock');
  source = source.replace(marker, createDrawer + marker);
  changed = true;
}

replaceOnce(
  "  const [fin, setFin] = useState(null);\n  const [closing, setClosing] = useState(null);",
  "  const [fin, setFin] = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [createOpen, setCreateOpen] = useState(false);\n  const [closing, setClosing] = useState(null);",
  'состояния финансовой вкладки',
);

replaceOnce(
`  useEffect(() => {
    const controller = new AbortController();
    workspaceSettingsApi.get(namespace, controller.signal).then((setting) => {
      if (setting.value && Object.keys(setting.value).length) setFin(setting.value);
    }).catch((error) => { if (error.name !== 'AbortError') console.error(error); });
    return () => controller.abort();
  }, [namespace]);
  if (!fin) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Финансовые условия для этой организации не заведены.</div>;

  const updateFin = async (next) => {
    await workspaceSettingsApi.save(namespace, next);
    setFin(next);
  };`,
`  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setFin(null);
    setLoading(true);
    workspaceSettingsApi.get(namespace, controller.signal).then((setting) => {
      if (active && setting.value && Object.keys(setting.value).length) setFin(setting.value);
    }).catch((error) => { if (error.name !== 'AbortError') console.error(error); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [namespace]);

  const updateFin = async (next) => {
    await workspaceSettingsApi.save(namespace, next);
    setFin(next);
  };

  if (loading) return <div className="card card-pad" style={{ color: 'var(--muted)' }}>Загрузка финансовых условий…</div>;
  if (!fin) return (
    <>
      <div className="card card-pad" style={{ minHeight: 190, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ maxWidth: 520 }}>
          <span className="oc-svc-ic" style={{ display: 'inline-flex', background: 'var(--blue-soft)', color: 'var(--blue)', width: 52, height: 52, borderRadius: 14, marginBottom: 12 }}><Icon name="finance" /></span>
          <h3 className="card-title" style={{ fontSize: 19, marginBottom: 7 }}>Финансовые условия не настроены</h3>
          <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 16 }}>Укажите тип взаиморасчётов, параметры депозита или отсрочки, договор и шаблон сборов для этой компании.</div>
          <Button icon="plus" onClick={() => setCreateOpen(true)}>Создать финансовые условия</Button>
        </div>
      </div>
      <CompanyFinanceCreateDrawer open={createOpen} co={co} onClose={() => setCreateOpen(false)} onCreated={updateFin} />
    </>
  );`,
  'пустое состояние финансовой вкладки',
);

replaceOnce(
  "  const setSettlement = (t) => updateFin({ ...fin, settlement: t });",
  `  const setSettlement = (t) => {
    const next = { ...fin, settlement: t };
    if (t === 'депозит' && !next.deposit) next.deposit = { balance: 0, reserved: 0, history: [] };
    if (t === 'отсрочка' && !next.credit) next.credit = { limit: 0, termDays: 30, debt: 0, overdue: 0 };
    return updateFin(next);
  };`,
  'переключение типа взаиморасчётов',
);

if (changed) await writeFile(fileUrl, source, 'utf8');

const required = [
  'function CompanyFinanceCreateDrawer(',
  'Создать финансовые условия',
  'contracts: [contract]',
  'fees: feesFromTemplate(template)',
  'onCreated={updateFin}',
  "if (t === 'депозит' && !next.deposit)",
  "if (t === 'отсрочка' && !next.credit)",
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Не подтверждена форма создания финансовых условий: ${token}`);
}

console.log(changed
  ? 'Добавлено создание финансовых условий из карточки компании.'
  : 'Создание финансовых условий уже подключено.');
