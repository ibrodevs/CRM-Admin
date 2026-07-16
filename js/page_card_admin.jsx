import { useState } from 'react';
import { Icon } from './icons';
import { Button, Checkbox, Input, Pill, Tabs, Toggle, useToast } from './ui';
import { SEND_CHANNELS } from './data_tz2';
import { CARD_ACTION_CATALOG, CARD_BLOCK_CATALOG, CARD_KINDS_ALL, CARD_RIGHT_KEYS, CARD_RIGHT_LABELS, CARD_SCENARIO_ORDER, allCardRights, cardAction, cardScenario, noCardRights } from './data_service_cards';
import { StackPanel } from './page_orders';

// ===== Настройки администратора: карточки услуг (ТЗ §30) =====
// Единый экран управления универсальной системой карточек: сценарии, ярлыки, блоки и их
// порядок, действия клиента, включение видов/каналов, шаблоны email, права операторов,
// видимость клиентских полей. Правит живые объекты конфигурации (window.CARD_*).

function clone(o) { return JSON.parse(JSON.stringify(o)); }

function ServiceCardAdminDrawer({ onClose }) {
  const toast = useToast();
  const [tab, setTab] = useState('scenarios');
  // Рабочие копии конфигурации (применяются по «Сохранить»)
  const [scen, setScen] = useState(() => clone(window.CARD_SCENARIOS));
  const [kinds, setKinds] = useState(() => clone(window.CARD_KINDS_ENABLED));
  const [chans, setChans] = useState(() => clone(window.CARD_CHANNELS_ENABLED));
  const [rights, setRights] = useState(() => clone(window.OPERATOR_CARD_ACCESS));
  const [emails, setEmails] = useState(() => clone(window.CARD_EMAIL_TEMPLATES));
  const [vis, setVis] = useState(() => clone(window.CARD_CLIENT_VISIBILITY));
  const [curSys, setCurSys] = useState(CARD_SCENARIO_ORDER[0]);
  const [curOp, setCurOp] = useState(Object.keys(window.OPERATOR_CARD_ACCESS)[0]);

  const save = () => {
    // Применяем все изменения к живой конфигурации системы карточек
    Object.keys(scen).forEach((k) => Object.assign(window.CARD_SCENARIOS[k], scen[k]));
    Object.assign(window.CARD_KINDS_ENABLED, kinds);
    Object.assign(window.CARD_CHANNELS_ENABLED, chans);
    Object.keys(rights).forEach((k) => window.OPERATOR_CARD_ACCESS[k] = rights[k]);
    Object.keys(emails).forEach((k) => window.CARD_EMAIL_TEMPLATES[k] = emails[k]);
    Object.assign(window.CARD_CLIENT_VISIBILITY, vis);
    toast('Настройки карточек услуг сохранены', 'ok');
    onClose && onClose();
  };

  const TABS = [
    { key: 'scenarios', label: 'Сценарии и блоки' },
    { key: 'kinds', label: 'Виды и каналы' },
    { key: 'rights', label: 'Права операторов' },
    { key: 'email', label: 'Шаблоны Email' },
    { key: 'fields', label: 'Клиентские поля' },
  ];

  return (
    <StackPanel title="Настройки карточек услуг · администратор" width="min(1080px,97vw)" onClose={onClose}
      footer={<>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Изменения применяются ко всей системе карточек услуг</div>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={save}>Сохранить</Button>
      </>}>
      <div style={{ marginBottom: 18 }}><Tabs tabs={TABS} value={tab} onChange={setTab} /></div>

      {tab === 'scenarios' && (
        <ScenariosTab scen={scen} setScen={setScen} curSys={curSys} setCurSys={setCurSys} />
      )}

      {tab === 'kinds' && (
        <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>
          <div className="card card-pad">
            <h3 className="card-title" style={{ fontSize: 14, margin: '0 0 4px' }}>Виды услуг с карточками</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Включайте и отключайте виды карточек услуг (§30).</div>
            {CARD_KINDS_ALL.map((k) => (
              <label key={k} className="hp-check-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 2px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13 }}>{k}</span>
                <Toggle on={kinds[k] !== false} onChange={(on) => setKinds((s) => ({ ...s, [k]: on }))} />
              </label>
            ))}
          </div>
          <div className="card card-pad">
            <h3 className="card-title" style={{ fontSize: 14, margin: '0 0 4px' }}>Каналы отправки</h3>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Доступные каналы для отправки карточек клиенту (§20, §30).</div>
            {Object.keys(window.SEND_CHANNELS).map((c) => (
              <label key={c} className="hp-check-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 2px', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 8 }}><Icon name={SEND_CHANNELS[c].icon} style={{ width: 14, height: 14, color: 'var(--muted)' }} />{c}</span>
                <Toggle on={chans[c] !== false} onChange={(on) => setChans((s) => ({ ...s, [c]: on }))} />
              </label>
            ))}
          </div>
        </div>
      )}

      {tab === 'rights' && (
        <RightsTab rights={rights} setRights={setRights} curOp={curOp} setCurOp={setCurOp} />
      )}

      {tab === 'email' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Шаблоны письма по сценарию. Подстановки: {'{label}'} — ярлык, {'{title}'} — услуга.</div>
          {Object.keys(emails).map((sys) => (
            <div key={sys} className="card card-pad">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Pill tone={cardScenario(sys).tone}>{cardScenario(sys).name}</Pill>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{sys}</span>
              </div>
              <label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Тема</label>
              <Input value={emails[sys].subject} onChange={(e) => setEmails((s) => ({ ...s, [sys]: { ...s[sys], subject: e.target.value } }))} />
              <label className="lbl" style={{ display: 'block', margin: '10px 0 6px' }}>Текст письма</label>
              <textarea className="input" rows={2} value={emails[sys].body} onChange={(e) => setEmails((s) => ({ ...s, [sys]: { ...s[sys], body: e.target.value } }))} style={{ width: '100%', resize: 'vertical' }} />
            </div>
          ))}
        </div>
      )}

      {tab === 'fields' && (
        <div className="card card-pad" style={{ maxWidth: 560 }}>
          <h3 className="card-title" style={{ fontSize: 14, margin: '0 0 4px' }}>Видимость полей для клиента</h3>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Какие финансовые поля клиент видит в карточке. Неотмеченные остаются внутренними (§7).</div>
          {[['clientTotal', 'Итоговая стоимость для клиента'], ['serviceFee', 'Сервисный сбор'], ['supplierPrice', 'Цена поставщика'], ['commission', 'Комиссия поставщика'], ['markup', 'Наценка'], ['profit', 'Прибыль'], ['cost', 'Себестоимость']].map(([k, l]) => (
            <label key={k} className="hp-check-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 2px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontSize: 13 }}>{l}</span>
              <Toggle on={!!vis[k]} onChange={(on) => setVis((s) => ({ ...s, [k]: on }))} />
            </label>
          ))}
        </div>
      )}
    </StackPanel>
  );
}

// --- Вкладка «Сценарии и блоки»: клиентское название, ярлык, ярлыки, действия, блоки + порядок ---
function ScenariosTab({ scen, setScen, curSys, setCurSys }) {
  const sc = scen[curSys];
  const upd = (patch) => setScen((s) => ({ ...s, [curSys]: { ...s[curSys], ...patch } }));
  const toggleIn = (key, val) => {
    const arr = sc[key] || [];
    upd({ [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] });
  };
  const moveBlock = (i, dir) => {
    const arr = sc.blocks.slice(); const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; upd({ blocks: arr });
  };
  return (
    <div className="grid-2" style={{ gap: 20, alignItems: 'start', gridTemplateColumns: '260px 1fr' }}>
      {/* Список сценариев */}
      <div className="card card-pad" style={{ padding: 8 }}>
        {CARD_SCENARIO_ORDER.map((sys) => {
          const s = scen[sys];
          return (
            <button key={sys} type="button" onClick={() => setCurSys(sys)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: curSys === sys ? 'var(--blue-soft)' : 'transparent' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: s.enabled === false ? 'var(--line)' : 'var(--green)' }} />
              <span style={{ fontSize: 13, fontWeight: curSys === sys ? 700 : 500, color: 'var(--ink)' }}>{s.name}</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{sys}</span>
            </button>
          );
        })}
      </div>

      {/* Редактор сценария */}
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Pill tone={sc.tone}>{sc.badge}</Pill>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>финансовая логика: {sc.fin}</span>
          <div style={{ flex: 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>Включён<Toggle on={sc.enabled !== false} onChange={(on) => upd({ enabled: on })} /></label>
        </div>

        <div className="grid-2" style={{ gap: 12 }}>
          <div><label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Клиентское название сценария</label><Input value={sc.name} onChange={(e) => upd({ name: e.target.value })} /></div>
          <div><label className="lbl" style={{ display: 'block', marginBottom: 6 }}>Основной ярлык</label><Input value={sc.badge} onChange={(e) => upd({ badge: e.target.value })} /></div>
        </div>

        <label className="lbl" style={{ display: 'block', margin: '12px 0 6px' }}>Варианты ярлыка (по строке)</label>
        <textarea className="input" rows={3} value={(sc.labels || []).join('\n')} onChange={(e) => upd({ labels: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} style={{ width: '100%', resize: 'vertical' }} />

        <label className="lbl" style={{ display: 'block', margin: '14px 0 6px' }}>Действия клиента</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
          {Object.keys(CARD_ACTION_CATALOG).map((a) => (
            <label key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
              <Checkbox on={(sc.actions || []).includes(a)} onChange={() => toggleIn('actions', a)} />{cardAction(a).label}
            </label>
          ))}
        </div>

        <label className="lbl" style={{ display: 'block', margin: '14px 0 6px' }}>Блоки карточки и порядок</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {(sc.blocks || []).map((b, i) => (
            <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 8, background: 'var(--surface-2)' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', width: 18 }}>{i + 1}</span>
              <span style={{ fontSize: 12.5, flex: 1 }}>{CARD_BLOCK_CATALOG[b] || b}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => moveBlock(i, -1)} disabled={i === 0}><Icon name="chevUp" /></button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => moveBlock(i, 1)} disabled={i === sc.blocks.length - 1}><Icon name="chevDown" /></button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => toggleIn('blocks', b)}><Icon name="x" /></button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {Object.keys(CARD_BLOCK_CATALOG).filter((b) => !(sc.blocks || []).includes(b)).map((b) => (
            <button key={b} type="button" onClick={() => toggleIn('blocks', b)}
              style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 16, border: '1px dashed var(--line)', background: '#fff', color: 'var(--muted)', cursor: 'pointer' }}>+ {CARD_BLOCK_CATALOG[b]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Вкладка «Права операторов»: полный доступ + права по видам услуг (§26) ---
function RightsTab({ rights, setRights, curOp, setCurOp }) {
  const ops = Object.keys(rights);
  const a = rights[curOp] || { fullAccess: false, kinds: {} };
  const setOp = (patch) => setRights((r) => ({ ...r, [curOp]: { ...r[curOp], ...patch } }));
  const setKindRight = (kind, key, val) => {
    const kinds = { ...(a.kinds || {}) };
    kinds[kind] = { ...(kinds[kind] || noCardRights()), [key]: val };
    setOp({ kinds });
  };
  const grantKind = (kind) => { const kinds = { ...(a.kinds || {}) }; kinds[kind] = allCardRights(); setOp({ kinds }); };
  const revokeKind = (kind) => { const kinds = { ...(a.kinds || {}) }; delete kinds[kind]; setOp({ kinds }); };
  return (
    <div className="grid-2" style={{ gap: 20, alignItems: 'start', gridTemplateColumns: '220px 1fr' }}>
      <div className="card card-pad" style={{ padding: 8 }}>
        {ops.map((op) => (
          <button key={op} type="button" onClick={() => setCurOp(op)}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: curOp === op ? 'var(--blue-soft)' : 'transparent' }}>
            <span style={{ fontSize: 13, fontWeight: curOp === op ? 700 : 500 }}>{op}</span>
            <div style={{ flex: 1 }} />
            {rights[op].fullAccess && <Pill tone="green">все</Pill>}
          </button>
        ))}
      </div>
      <div className="card card-pad">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, marginBottom: 14 }}>
          <Toggle on={!!a.fullAccess} onChange={(on) => setOp({ fullAccess: on })} />Полный доступ ко всем видам услуг
        </label>
        {a.fullAccess ? (
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Оператор может создавать и отправлять карточки по всем видам услуг со всеми правами.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ minWidth: 640, fontSize: 12 }}>
              <thead><tr>
                <th style={{ textAlign: 'left' }}>Вид услуги</th>
                {CARD_RIGHT_KEYS.map((k) => <th key={k} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 92, padding: 2 }}>{CARD_RIGHT_LABELS[k]}</th>)}
                <th></th>
              </tr></thead>
              <tbody>
                {['Авиа', 'ЖД', 'Гостиница', 'Трансфер', 'Виза', 'Страхование'].map((kind) => {
                  const kr = (a.kinds || {})[kind];
                  return (
                    <tr key={kind}>
                      <td style={{ fontWeight: 600 }}>{kind}</td>
                      {CARD_RIGHT_KEYS.map((k) => (
                        <td key={k} style={{ textAlign: 'center' }}>
                          <Checkbox on={!!(kr && kr[k])} onChange={(on) => setKindRight(kind, k, on)} />
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {kr ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => revokeKind(kind)}>Убрать</button>
                          : <button type="button" className="btn btn-ghost btn-sm" onClick={() => grantKind(kind)}>Всё</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { ServiceCardAdminDrawer });



export { clone, ServiceCardAdminDrawer, ScenariosTab, RightsTab };
