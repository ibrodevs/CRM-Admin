import { translate as t } from '../../../shared/preferences/translations.js';
import { useEffect, useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Input } from '../../../shared/ui/Input.jsx';
import { Field } from '../../../shared/ui/Field.jsx';
import { Select } from '../../../shared/ui/Select.jsx';
import { Checkbox } from '../../../shared/ui/Checkbox.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';
import { documentsApi } from '../../documents/api.js';

export function DocumentTemplatesDrawer({ open, onClose, create = false }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const blank = () => ({ code: '', name: '', kind: 'other', body: '', publish: false });
  const load = async () => { const rows = await documentsApi.templates(); setTemplates(rows); };
  useEffect(() => {
    if (!open) return;
    setForm(create ? blank() : null); setBusy(true);
    load().catch((error) => toast(error.message, 'err')).finally(() => setBusy(false));
  }, [open, create]);
  const save = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.body.trim()) { toast('Заполните код, название и содержимое шаблона', 'err'); return; }
    setBusy(true);
    try { await documentsApi.createTemplate(form); await load(); setForm(null); toast('Версия шаблона сохранена', 'ok'); }
    catch (error) { toast(error.message, 'err'); }
    finally { setBusy(false); }
  };
  return <Drawer open={open} onClose={onClose} title={t("Шаблоны документов")} width="min(850px,96vw)" footer={<><Button variant="secondary" onClick={onClose}>{t("Закрыть")}</Button>{form && <Button disabled={busy} onClick={save}>{t("Сохранить шаблон")}</Button>}</>}>
    {form ? <div className="form-grid">
      <Field label={t("Код шаблона")}><Input aria-label="Код шаблона" value={form.code} readOnly={!!form.id} onChange={(e) => setForm({...form, code: e.target.value})} /></Field>
      <Field label={t("Название шаблона")}><Input aria-label="Название шаблона" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} /></Field>
      <Field label={t("Тип документа")}><Select options={['other', 'invoice', 'act', 'voucher', 'itinerary_receipt']} value={form.kind} onChange={(e) => setForm({...form, kind: e.target.value})} /></Field>
      <label><Checkbox on={form.publish} onChange={(publish) => setForm({...form, publish})} />{t("Опубликовать")}</label>
      <div className="full"><Field label={t("Содержимое шаблона")}><textarea className="input" aria-label="Содержимое шаблона" rows={12} value={form.body} onChange={(e) => setForm({...form, body: e.target.value})} /></Field></div>
      <Button variant="secondary" onClick={() => setForm(null)}>{t("К списку")}</Button>
    </div> : <><Button disabled={busy} onClick={() => setForm(blank())}>{t("Добавить шаблон")}</Button><table className="tbl"><thead><tr><th>{t("Шаблон")}</th><th>{t("Версия")}</th><th>{t("Статус")}</th><th /></tr></thead><tbody>
      {templates.map((item) => <tr key={item.id}><td>{item.name} · {item.code}</td><td>{item.template_version}</td><td>{item.status}</td><td><Button size="sm" onClick={() => setForm({...item, publish: item.status === 'published'})}>{t("Изменить")}</Button></td></tr>)}
      {!templates.length && <tr><td colSpan={4}>{busy ? 'Загрузка…' : 'Шаблонов пока нет'}</td></tr>}
    </tbody></table></>}
  </Drawer>;
}

const KINDS = [['avia', 'Авиабилеты'], ['rail', 'ЖД билеты'], ['hotel', 'Гостиницы'], ['transfer', 'Трансферы'], ['bus', 'Автобусы'], ['tour', 'Туры'], ['visa', 'Визы'], ['insurance', 'Страхование'], ['aeroexpress', 'Аэроэкспресс'], ['lounge', 'Бизнес-залы'], ['other', 'Дополнительные услуги']];
export function SettingsDirectory({ kind, onClose }) {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (kind !== 'locations' || query.trim().length < 2) { setRows([]); setBusy(false); setError(''); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError('');
      try {
        const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, {signal: controller.signal});
        if (!response.ok) throw new Error('Не удалось загрузить справочник');
        setRows((await response.json()).results || []);
      } catch (error) { if (error.name !== 'AbortError') setError(error.message); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [kind, query]);
  return <Drawer open={!!kind} onClose={onClose} title={kind === 'locations' ? 'Аэропорты и города' : 'Типы услуг'} footer={<Button onClick={onClose}>{t("Закрыть")}</Button>}>
    <Input aria-label="Поиск в справочнике" placeholder={t("Поиск в справочнике")} value={query} onChange={(e) => setQuery(e.target.value)} />
    {kind === 'locations' ? <>{error && <p role="alert">{error}</p>}{busy && <p>{t("Загрузка…")}</p>}{!rows.length && !busy && <p>{query.length < 2 ? 'Введите не менее двух символов' : 'Ничего не найдено'}</p>}{rows.map((row, i) => <div className="kv-row" key={row.id || i}><span>{row.name || row.label || row.city}</span><span>{row.country || ''} {row.code || row.iata || ''}</span></div>)}</> : KINDS.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase())).map(([code, name]) => <div className="kv-row" key={code}><span>{name}</span><span>{code}</span></div>)}
  </Drawer>;
}
