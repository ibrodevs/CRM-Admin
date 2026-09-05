import { useState, useEffect } from 'react';
import { Icon } from './icons';
import { Avatar, Button, Checkbox, Drawer, EmptyState, Field, Input, SearchBox, Select, useToast } from './ui';
import { UnifiedPersonDrawer } from './forms_unified';
import { PanelSub } from './components/shared-panels';
import { documentsApi } from './api/resources';

const ENABLE_DEMO_BUSINESS_DATA = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';



function CollapseSection({ title, note, noteWarn, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="accordion">
      <div className="acc-head" onClick={() => setOpen((o) => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <div className="acc-title">{title}</div>
            {badge && <span className="pill pill-green" style={{ fontSize: 11 }}><Icon name="checkCircle" style={{ width: 13, height: 13 }} />{badge}</span>}
          </div>
          {note && <div className={'acc-note' + (noteWarn ? ' warn' : '')}>{note}</div>}
        </div>
        <Icon name="chevDown" className={'acc-chev' + (open ? ' open' : '')} />
      </div>
      {open && <div className="acc-body" style={{ paddingTop: 18 }}>{children}</div>}
    </div>
  );
}


const PASS_DOCTYPES = [
  { key: 'id', label: 'ID Card', icon: 'idcard' },
  { key: 'pass', label: 'Паспорт', icon: 'users' },
  { key: 'visa', label: 'Visa', icon: 'users' },
  { key: 'bank', label: 'Банковская выписка', icon: 'bank' },
];
function PassportModal({ passenger, participants, onClose, onAddDoc }) {
  const [q, setQ] = useState('');

  const source = (participants && participants.length)
    ? participants
    : (passenger ? [{ name: passenger, docStatus: 'check' }] : []);
  const pax = source.map((p) => ({
    name: p.name,
    sub: p.docStatus === 'check' || p.docStatus === 'missing' ? 'Требует проверки' : (p.docNo || p.doc || 'Документы в порядке'),
    expired: p.docStatus === 'check' || p.docStatus === 'missing',
    source: p,
    documents: p.documents || [],
  }));
  const initIdx = Math.max(0, pax.findIndex((p) => p.name === passenger));
  const [activePax, setActivePax] = useState(initIdx);
  const cur = pax[activePax] || pax[0];
  const showSearch = pax.length > 6;
  const s = q.trim().toLowerCase();
  const filtered = pax.map((p, i) => ({ p, i })).filter(({ p }) => !s || p.name.toLowerCase().includes(s));
  const currentDocs = cur?.documents || [];
  return (
    <Drawer open onClose={onClose} width="min(720px,96vw)"
      title="Документация" sub={passenger ? `Документы пассажира: ${passenger}` : 'Документы пассажира'}
      footer={<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 }}>
        <Button variant="secondary" icon="plus" disabled={!cur} onClick={() => onAddDoc && onAddDoc(cur ? cur.source : null)}>Добавить документ</Button>
        <div style={{ flex: 1 }} />
        <Button onClick={onClose}>Закрыть</Button>
      </div>}>
      <PanelSub style={{ marginTop: 0 }}>Пассажир</PanelSub>
      {showSearch && <div style={{ marginBottom: 12 }}><SearchBox value={q} onChange={setQ} placeholder="Поиск пассажира по ФИО" /></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxHeight: 260, overflowY: 'auto', paddingRight: filtered.length > 6 ? 4 : 0 }}>
        {filtered.map(({ p, i }) => (
          <button key={i} onClick={() => setActivePax(i)}
            style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 13, border: '1px solid ' + (activePax === i ? 'var(--blue)' : 'var(--field-line)'), background: activePax === i ? 'var(--blue-soft)' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <Avatar name={p.name} size={34} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div><div className="t-sub">{p.sub}</div></div>
            <span className={'radio' + (activePax === i ? ' on' : '')} />
          </button>
        ))}
        {filtered.length === 0 && <div style={{ gridColumn: '1 / -1' }}><EmptyState icon="user" title="Пассажиры не найдены" sub="Добавьте участника заказа, чтобы работать с документами" /></div>}
      </div>


      {cur && <div style={{ position: 'relative', paddingTop: 34, marginTop: 12 }}>
        <div className="badge-tip" style={{ left: '50%', top: 6, background: cur.expired ? '#ec4444' : '#21a67a' }}>
          {cur.expired ? 'Документ требует проверки' : cur.sub}
        </div>
        {currentDocs.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {currentDocs.map((doc, index) => (
              <div key={doc.id || doc.docNo || index} style={{ display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', background: '#fff' }}>
                <span className="oc-svc-ic" style={{ background: 'var(--blue)', width: 34, height: 34 }}><Icon name="idcard" /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14 }}>{doc.docType || 'Документ'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>№ {doc.docNo || doc.number || '—'}{doc.docExpiry ? ' · до ' + doc.docExpiry : ''}</div>
                  {(doc.citizenship || doc.issuing_country) && <div style={{ fontSize: 12, color: 'var(--muted-2)' }}>Страна: {doc.citizenship || doc.issuing_country}</div>}
                </div>
                <Pill tone={doc.status === 'active' || !doc.status ? 'green' : 'gray'}>{doc.status === 'active' || !doc.status ? 'Активен' : doc.status}</Pill>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ borderRadius: 12, border: '1px solid var(--line)', background: 'var(--surface-2)', padding: 18 }}>
            <EmptyState icon="idcard" title="Документ не добавлен" sub="Добавьте паспорт или другой документ пассажира, чтобы он подтягивался в бронирование и выписку." />
          </div>
        )}
      </div>}
    </Drawer>
  );
}


function FeeDrawer({ open, onClose }) {
  const toast = useToast();
  const empty = { service: '', feeType: '', value: '', tax: '', currency: 'USD', comment: '' };
  const [f, setF] = useState(empty);
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target ? e.target.value : e }));
  useEffect(() => { if (open) { setF(empty); setErrs({}); } }, [open]);
  const submit = () => {
    const er = {};
    if (!f.service) er.service = 'Выберите тип услуги';
    if (!f.feeType) er.feeType = 'Выберите тип сбора';
    if (!f.value) er.value = 'Введите значение';
    setErrs(er);
    if (Object.keys(er).length) { toast('Проверьте поля формы', 'err'); return; }
    toast('Сбор создан', 'ok'); onClose();
  };
  return (
    <Drawer open={open} onClose={onClose} title="Создание сбора"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button variant="primary" onClick={submit}>Создать</Button></>}>
      <div className="form-grid">
        <Field label="Тип услуги" required error={errs.service}><Select placeholder="Выберите тип" options={['Авиа', 'Отель', 'Виза', 'Трансфер']} value={f.service} onChange={set('service')} error={errs.service} /></Field>
        <Field label="Тип сбора" required error={errs.feeType}><Select placeholder="Выберите тип" options={['Процентный (%)', 'Фиксированная сумма']} value={f.feeType} onChange={set('feeType')} error={errs.feeType} /></Field>
        <Field label="Значение" required error={errs.value}><Input placeholder="Введите значение" value={f.value} onChange={set('value')} error={errs.value} /></Field>
        <Field label="Такса"><Input placeholder="Введите таксу" value={f.tax} onChange={set('tax')} /></Field>
        <div className="full"><Field label="Валюта"><Select options={CURRENCIES.map((c) => c.code)} value={f.currency} onChange={set('currency')} /></Field></div>
        <div className="full"><Field label="Комментарий"><textarea className="input" rows={4} placeholder="Descriptions..." value={f.comment} onChange={set('comment')} /></Field></div>
      </div>
    </Drawer>
  );
}



function PassengerDrawer({ open, onClose, onAdd }) {
  const toast = useToast();
  return (
    <UnifiedPersonDrawer open={open} kind="person" mode="create" showRole title="Добавить пассажира"
      onClose={onClose}
      onSave={async (person, client) => {
        try {
          if (onAdd) await onAdd(client, person);
          toast('Пассажир добавлен', 'ok');
          onClose();
        } catch (error) {
          toast(error.message || 'Не удалось добавить пассажира', 'err');
        }
      }} />
  );
}



const ORG_REGISTRY = {
  '02208200512345': {
    full: 'ОсОО "Asia Travel"', short: 'Asia Travel', orgType: 'Турагент', currency: 'KGS',
    kpp: '020801001', ogrn: '124047000123', okpo: '2291055',
    legalAddr: 'г. Ош, ул. Курманжан Датка 12', factAddr: 'г. Ош, ул. Курманжан Датка 12',
    director: 'Каримов Икрам', signatory: 'директора Каримова Икрама', phone: '+996 312 555 444', email: 'office@asia.kg', site: 'asia.kg',
    account: '1090000111223344', bank: 'Оптима Банк', bik: '109018', corrAccount: '1090180000000001',
  },
  '07070707070707': {
    full: 'ОсОО "Гранд лимитед"', short: 'Гранд лимитед', orgType: 'Туроператор', currency: 'KGS',
    kpp: '070701001', ogrn: '124047000707', okpo: '8362411',
    legalAddr: 'г. Бишкек, ул. Токтогула 125/1', factAddr: 'г. Бишкек, ул. Токтогула 125/1',
    director: 'Нуралиев Данияр', signatory: 'директора Нуралиева Данияра', phone: '+996 777 777 777', email: 'grandlimited@mail.ru', site: 'grandlimited.kg',
    account: '1240020000123456', bank: 'Демир Банк', bik: '124001', corrAccount: '1240010000000007',
  },
  '12345678901234': {
    full: 'ОсОО "Тянь-Шань Тур"', short: 'Тянь-Шань Тур', orgType: 'Туроператор', currency: 'KGS',
    kpp: '123401001', ogrn: '125047001234', okpo: '4417092',
    legalAddr: 'г. Бишкек, пр. Чуй 155', factAddr: 'г. Бишкек, пр. Чуй 155',
    director: 'Абдыкадыров Тимур', signatory: 'директора Абдыкадырова Тимура', phone: '+996 555 220 330', email: 'info@tienshan-tour.kg', site: 'tienshan-tour.kg',
    account: '1180000445566778', bank: 'РСК Банк', bik: '118001', corrAccount: '1180010000000012',
  },
};
if (!ENABLE_DEMO_BUSINESS_DATA) Object.keys(ORG_REGISTRY).forEach((key) => { delete ORG_REGISTRY[key]; });

function NewOrgDrawer({ open, onClose, onCreated }) {
  const toast = useToast();
  const empty = {
    full: '', short: '', email: '', phone: '', orgType: '', inn: '', okpo: '',
    legalAddr: '', director: '', account: '', bank: '', vat: '', status: 'Действующий',
    requiresESign: false,
  };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event?.target ? event.target.value : event }));

  useEffect(() => {
    if (open) {
      setForm(empty);
      setErrors({});
      setLogoFile(null);
    }
  }, [open]);

  const submit = async () => {
    const nextErrors = {};
    if (!form.inn.trim()) nextErrors.inn = 'Введите ИНН';
    if (!form.full.trim()) nextErrors.full = 'Введите название';
    if (!form.orgType) nextErrors.orgType = 'Выберите тип';
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) nextErrors.email = 'Некорректный e-mail';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast('Проверьте поля формы', 'err');
      return;
    }
    const company = {
      name: form.full.trim(),
      shortName: form.short.trim() || form.full.trim(),
      fullName: form.full.trim(),
      type: form.orgType,
      status: form.status,
      inn: form.inn.trim(),
      okpo: form.okpo.trim(),
      dir: form.director.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      addr: form.legalAddr.trim(),
      bank: form.bank.trim(),
      account: form.account.trim(),
      vat: form.vat.trim(),
      requiresESign: form.requiresESign,
    };
    setSaving(true);
    try {
      const saved = onCreated ? await onCreated(company) : company;
      if (logoFile && (saved?.serverId || saved?.id)) {
        await documentsApi.upload(logoFile, {
          company: saved.serverId || saved.id,
          kind: 'other',
          title: logoFile.name,
          source: 'upload',
          metadata: { purpose: 'company_logo' },
        });
      }
      toast('Компания «' + (saved?.name || company.name) + '» создана в backend', 'ok');
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось создать компанию', 'err');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Новая организация" width="min(720px,96vw)"
      footer={<><Button variant="secondary" onClick={onClose}>Отмена</Button><Button icon="check" onClick={submit} disabled={saving}>{saving ? 'Создание…' : 'Создать'}</Button></>}>
      <div className="card" style={{ padding: '10px 12px', borderLeft: '3px solid var(--blue)', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--body)' }}>Заполните реквизиты вручную. Автопоиск по внешнему реестру не подключён.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <span className="avatar-ph" style={{ width: 54, height: 54 }}><Icon name="building" style={{ width: 24, height: 24 }} /></span>
        <label className="btn btn-secondary" style={{ cursor: 'pointer' }}><Icon name="download" />{logoFile ? logoFile.name : 'Логотип организации'}<input type="file" accept="image/*" hidden onChange={(event) => setLogoFile(event.target.files?.[0] || null)} /></label>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <CollapseSection title="Основные данные" note="Название, тип и руководитель" defaultOpen>
          <div className="form-grid">
            <Field label="Полное название" required error={errors.full}><Input value={form.full} onChange={set('full')} error={errors.full} /></Field>
            <Field label="Краткое название"><Input value={form.short} onChange={set('short')} /></Field>
            <Field label="Тип организации" required error={errors.orgType}><Select placeholder="Выберите тип" options={['Корпоративный клиент', 'Туроператор', 'Турагент', 'Авиакомпания', 'Отель', 'Партнёр', 'Поставщик']} value={form.orgType} onChange={set('orgType')} error={errors.orgType} /></Field>
            <Field label="Руководитель"><Input value={form.director} onChange={set('director')} /></Field>
            <Field label="Статус"><Select options={['Действующий', 'На паузе', 'Архив']} value={form.status} onChange={set('status')} /></Field>
            <Field label="НДС"><Input value={form.vat} onChange={set('vat')} placeholder="например, 12% или без НДС" /></Field>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: 'var(--body)' }}><Checkbox on={form.requiresESign} onChange={(value) => setForm((current) => ({ ...current, requiresESign: value }))} />Требуется электронная подпись</label>
          </div>
        </CollapseSection>

        <CollapseSection title="Регистрационные данные" note="ИНН, ОКПО и юридический адрес" defaultOpen>
          <div className="form-grid">
            <Field label="ИНН" required error={errors.inn}><Input value={form.inn} onChange={set('inn')} error={errors.inn} /></Field>
            <Field label="ОКПО"><Input value={form.okpo} onChange={set('okpo')} /></Field>
            <div className="full"><Field label="Юридический адрес"><Input value={form.legalAddr} onChange={set('legalAddr')} /></Field></div>
          </div>
        </CollapseSection>

        <CollapseSection title="Контакты" note="E-mail и телефон">
          <div className="form-grid">
            <Field label="Контактный e-mail" error={errors.email}><Input type="email" value={form.email} onChange={set('email')} error={errors.email} /></Field>
            <Field label="Контактный телефон"><Input value={form.phone} onChange={set('phone')} /></Field>
          </div>
        </CollapseSection>

        <CollapseSection title="Расчётный счёт" note="Банк и номер счёта">
          <div className="form-grid">
            <Field label="Номер счёта"><Input value={form.account} onChange={set('account')} /></Field>
            <Field label="Банк"><Input value={form.bank} onChange={set('bank')} /></Field>
          </div>
        </CollapseSection>
      </div>
    </Drawer>
  );
}

Object.assign(window, { PassportModal, FeeDrawer, PassengerDrawer, NewOrgDrawer, CollapseSection });



export { CollapseSection, PASS_DOCTYPES, PassportModal, FeeDrawer, PassengerDrawer, ORG_REGISTRY, NewOrgDrawer };
