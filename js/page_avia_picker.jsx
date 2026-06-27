// ===== AVIA PICKER: two-pane in-order flight selection =====
// Left  — «Сценарий поездки» (order composition)
// Right — flight list stays static; тариф / доп.услуги и места / пассажиры open as side panels (StackPanel)
//         over the screen instead of an inline accordion, so picking a fare never requires scrolling past flights

function rub(n) { return Math.round(n).toLocaleString('ru-RU') + ' ₽'; }
const RUB_PER_USD = 90; // demo conversion rate used across the picker totals

function parseDurMin(s) { const m = /(?:(\d+)ч)?\s*(?:(\d+)м)?/.exec(s || ''); return (+(m && m[1] || 0)) * 60 + (+(m && m[2] || 0)); }
function fmtDurMin(min) { return `${Math.floor(min / 60)}ч ${min % 60}м`; }

/* ---------- compact flight row (step 1) ---------- */
function ApFlightRow({ opt, sel, onSelect }) {
  const leg = opt.leg;
  return (
    <div className={'ap-flight' + (sel ? ' sel' : '')} onClick={() => onSelect(opt)}>
      <AirlineLogo code={opt.airline} size="sm" />
      <div className="ap-fl-time">{leg.dep}<div className="ap">{leg.from}</div></div>
      <div className="ap-fl-mid">
        <div className="d">{leg.dur}</div>
        <div className="line" />
        <div className={'st ' + (leg.stops ? 'via' : 'direct')}>{leg.stops ? leg.stopText.split('·')[0].trim() : 'Прямой'}</div>
      </div>
      <div className="ap-fl-time">{leg.arr}<div className="ap">{leg.to}</div></div>
      <div className="ap-fl-pr"><div className="v">{rub(opt.price)}</div><div className="c">{AIRLINES[opt.airline].name}</div></div>
      <Radio on={sel} onChange={() => onSelect(opt)} />
    </div>
  );
}

/* ---------- seat selector (steps 3 + 4·Места) ---------- */
function SeatSelector({ seats, setSeats, pax }) {
  const [activePax, setActivePax] = useState(0);
  const M = AVIA_SEATMAP;
  const kindOf = (row) => M.rowKind[row] || 'std';
  const occupied = new Set(M.occupied);
  const taken = new Set(Object.entries(seats).filter(([k]) => +k !== activePax).map(([, v]) => v));
  const pick = (id) => {
    if (occupied.has(id) || taken.has(id)) return;
    setSeats({ ...seats, [activePax]: seats[activePax] === id ? undefined : id });
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {pax.map((p, i) => (
          <button key={i} className={'tab' + (activePax === i ? ' active' : '')} onClick={() => setActivePax(i)}>
            {p.name.split(' ')[0]} {seats[i] && <span className="tab-count">{seats[i]}</span>}
          </button>
        ))}
      </div>
      <div className="seatmap-wrap">
        <div className="seatmap">
          <div className="seatmap-cabin">↑ Нос самолёта</div>
          {Array.from({ length: M.rows }, (_, r) => {
            const row = r + 1; const kind = kindOf(row);
            return (
              <div className="seat-row" key={row}>
                <span className="rn">{row}</span>
                {M.cols.map((c, ci) => {
                  const id = row + c;
                  const isOcc = occupied.has(id) || taken.has(id);
                  const isSel = seats[activePax] === id;
                  return (
                    <React.Fragment key={c}>
                      {ci === 3 && <span className="aisle" />}
                      <div className={'seat ' + kind + (isOcc ? ' occupied' : '') + (isSel ? ' sel' : '')}
                        title={isOcc ? 'Занято' : `${id} · ${M.price[kind] ? rub(M.price[kind]) : 'бесплатно'}`}
                        onClick={() => pick(id)}>{c}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="seat-legend">
          {M.legend.map((l) => (
            <div className="seat-leg-item" key={l.kind}>
              <span className={'seat-leg-sw seat ' + l.kind} />
              <span>{l.label}{l.price ? ' · ' + rub(l.price) : ' · бесплатно'}</span>
            </div>
          ))}
          <div className="seat-leg-item"><span className="seat-leg-sw seat occupied" /><span>Занято</span></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- per-passenger option picker (baggage / meal / insurance) ---------- */
function PaxOptionBlock({ pax, options, value, onChange, render }) {
  return (
    <>
      {pax.map((p, i) => (
        <div className="ap-pax" key={i}>
          <div className="ap-pax-h">
            <Avatar name={p.name} size={30} />
            <div><div className="n">{p.name}</div><div className="r">{p.role}</div></div>
          </div>
          <div className="ap-opt-row">
            {options.map((o) => (
              <div key={o.id} className={'ap-opt' + (value[i] === o.id ? ' sel' : '')} onClick={() => onChange({ ...value, [i]: o.id })}>
                <span className="ol">{o.label}</span>
                {render ? render(o) : <span className={'op' + (o.price ? '' : ' free')}>{o.price ? '+ ' + rub(o.price) : 'бесплатно'}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------- additional services (step 4) — по макету: покарточный выбор по каждому пассажиру ---------- */
function xtrShortName(p, i) {
  const parts = (p.name || ('Пассажир ' + (i + 1))).split(' ');
  return (i + 1) + '. ' + parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '');
}

/* per-passenger option cards used by Багаж / Питание / Страхование */
function XtrPaxBlock({ pax, options, value, onChange, kind }) {
  const def = options[0].id;
  return (
    <>
      {pax.map((p, i) => {
        const sel = value[i] || def;
        const selOpt = options.find((o) => o.id === sel) || options[0];
        const selPrice = selOpt.price ? '+ ' + rub(selOpt.price) : (selOpt.incl ? 'включено' : '0 ₽');
        return (
          <div className="xtr-pax" key={i}>
            <div className="xtr-pax-head">
              <span className="ic"><Icon name="user" /></span>
              <div className="who"><div className="n">{(i + 1) + '. ' + p.name}</div>{(p.tariff || p.role) && <span className="xtr-tariff">{p.tariff ? 'Тариф: ' + p.tariff : p.role}</span>}</div>
            </div>
            <div className={'xtr-cards' + (kind === 'meal' ? ' meal' : kind === 'insurance' ? ' ins' : '')}>
              {options.map((o) => {
                const on = sel === o.id;
                return (
                  <button type="button" key={o.id} className={'xtr-card' + (on ? ' sel' : '')} onClick={() => onChange({ ...value, [i]: o.id })}>
                    <span className="xtr-radio">{on && <span />}</span>
                    <div className="xtr-card-t">{o.label}</div>
                    {kind === 'insurance' && o.sub && <div className="xtr-card-s">{o.sub}</div>}
                    {kind === 'insurance' && o.cover && <div className="xtr-card-s">{o.cover}</div>}
                    {kind === 'meal' && o.id !== 'none' && <span className="xtr-meal-img" style={{ background: o.color || 'var(--surface-2)' }}><Icon name="utensils" /></span>}
                    <div className="xtr-card-p">{o.price ? '+ ' + rub(o.price) : (o.incl ? 'Включено' : '0 ₽')}</div>
                  </button>
                );
              })}
            </div>
            <div className="xtr-pax-foot"><span>Выбрано: {selOpt.label}</span><b>{selPrice}</b></div>
          </div>
        );
      })}
    </>
  );
}

/* «Комфорт и сервис» — матрица: услуги по строкам, пассажиры по колонкам */
function ComfortMatrix({ pax, state, set }) {
  const sel = state.comfort || {};
  const toggle = (id, i) => set({ ...state, comfort: { ...sel, [id + ':' + i]: !sel[id + ':' + i] } });
  const minW = 220 + pax.length * 74 + 104;
  const gt = { display: 'grid', gridTemplateColumns: '220px repeat(' + pax.length + ', 74px) 104px', alignItems: 'center', gap: 8, minWidth: minW };
  return (
    <div className="xtr-cm">
      <div className="xtr-cm-note"><Icon name="alertCircle" />Доступность услуг зависит от авиакомпании, рейса и тарифа.</div>
      <div className="xtr-cm-scroll">
      <div className="xtr-cm-headrow" style={gt}>
        <span className="svc">Пассажиры</span>
        {pax.map((p, i) => <span className="pax" key={i}>{xtrShortName(p, i)}</span>)}
        <span className="pr">Стоимость для 1 пассажира</span>
      </div>
      {AVIA_COMFORT_GROUPS.map((g) => {
        const groupSelCount = g.items.reduce((a, it) => a + pax.filter((_, i) => sel[it.id + ':' + i]).length, 0);
        const groupTotal = g.items.reduce((a, it) => a + it.price * pax.filter((_, i) => sel[it.id + ':' + i]).length, 0);
        return (
          <div className="xtr-cm-group" key={g.group} style={{ minWidth: minW }}>
            <div className="xtr-cm-grouphead">
              <span className="ic"><Icon name={g.icon} /></span>
              <div className="who"><div className="n">{g.group}</div><div className="s">{g.sub}</div></div>
              <span className="cnt">Выбрано: {groupSelCount} услуг</span>
            </div>
            {g.items.map((it) => (
              <div className="xtr-cm-row" key={it.id} style={gt}>
                <span className="svc"><span className="ic"><Icon name={it.icon} /></span><span className="lbl"><span className="t">{it.label}</span><span className="s">{it.sub}</span></span></span>
                {pax.map((_, i) => (
                  <span className="pax" key={i}><label className="xtr-cb"><Checkbox on={!!sel[it.id + ':' + i]} onChange={() => toggle(it.id, i)} /><span className="p">+ {rub(it.price)}</span></label></span>
                ))}
                <span className="pr">{rub(it.price)}<Icon name="alertCircle" className="pcp-info" /></span>
              </div>
            ))}
            <div className="xtr-cm-grouptotal"><span>Итого по категории</span><b>{groupTotal ? '+ ' + rub(groupTotal) : '0 ₽'}</b></div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

function ExtrasTabs({ pax, state, set, embedded }) {
  const [tab, setTab] = useState('baggage');
  const TABS = [
    { key: 'seats', label: 'Места', icon: 'idcard' },
    { key: 'baggage', label: 'Багаж', icon: 'luggage' },
    { key: 'meal', label: 'Питание', icon: 'utensils' },
    { key: 'insurance', label: 'Страхование', icon: 'shield' },
    { key: 'comfort', label: 'Комфорт и сервис', icon: 'star' },
  ];
  const cnt = {
    seats: Object.values(state.seats).filter(Boolean).length,
    baggage: pax.filter((_, i) => (state.baggage[i] || 'none') !== 'none').length,
    meal: pax.filter((_, i) => { const m = state.meal[i] || 'standard'; return m !== 'standard' && m !== 'none'; }).length,
    insurance: pax.filter((_, i) => (state.insurance[i] || 'basic') !== 'none').length,
    comfort: Object.keys(state.comfort).filter((k) => state.comfort[k]).length,
  };
  const seatPrice = (id) => { if (!id) return 0; const row = +String(id).match(/\d+/)[0]; const kind = AVIA_SEATMAP.rowKind[row] || 'std'; return AVIA_SEATMAP.price[kind] || 0; };
  const seatsTotal = Object.values(state.seats).reduce((a, id) => a + seatPrice(id), 0);
  const baggageTotal = pax.reduce((a, _, i) => a + ((AVIA_BAGGAGE_OPTIONS.find((o) => o.id === (state.baggage[i] || 'none')) || {}).price || 0), 0)
    + Object.entries(state.special || {}).reduce((a, [id, n]) => a + (n ? n * ((AVIA_SPECIAL_BAGGAGE.find((b) => b.id === id) || {}).from || 0) : 0), 0);
  const mealTotal = pax.reduce((a, _, i) => a + ((AVIA_MEALS.find((o) => o.id === (state.meal[i] || 'standard')) || {}).price || 0), 0);
  const insTotal = pax.reduce((a, _, i) => a + ((AVIA_INSURANCE_PLANS.find((o) => o.id === (state.insurance[i] || 'basic')) || {}).price || 0), 0);
  const comfortTotal = AVIA_COMFORT_GROUPS.reduce((a, g) => a + g.items.reduce((s, it) => s + it.price * pax.filter((_, i) => state.comfort[it.id + ':' + i]).length, 0), 0);
  const tabTotal = { seats: seatsTotal, baggage: baggageTotal, meal: mealTotal, insurance: insTotal, comfort: comfortTotal };
  const setSpecial = (id, n) => set({ ...state, special: { ...(state.special || {}), [id]: Math.max(0, n) } });

  return (
    <div className="xtr">
      <div className="ap-svc-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={'ap-svc-tab' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            <Icon name={t.icon} />{t.label}{cnt[t.key] > 0 && <span className="b">{cnt[t.key]}</span>}
          </button>
        ))}
      </div>

      <div className="xtr-sec-head"><Icon name={(TABS.find((t) => t.key === tab) || {}).icon} /><span>{(TABS.find((t) => t.key === tab) || {}).label}</span></div>

      {tab === 'seats' && <SeatSelector seats={state.seats} setSeats={(s) => set({ ...state, seats: s })} pax={pax} />}

      {tab === 'baggage' && (<>
        <XtrPaxBlock pax={pax} options={AVIA_BAGGAGE_OPTIONS} value={state.baggage} onChange={(v) => set({ ...state, baggage: v })} kind="baggage" />
        <div className="ap-sc-title" style={{ marginTop: 18 }}>Специальный багаж</div>
        <div className="xtr-note-line">Оплачивается за место. Стоимость за 1 единицу.</div>
        {AVIA_SPECIAL_BAGGAGE.map((b) => (
          <div className="xtr-special-row" key={b.id}>
            <span className="ic"><Icon name={b.icon} /></span>
            <span className="t">{b.label}</span>
            <span className="from">от {rub(b.from)}</span>
            <PaxStepper val={(state.special || {})[b.id] || 0} onChange={(n) => setSpecial(b.id, n)} />
          </div>
        ))}
        <div className="xtr-info-box"><Icon name="alertCircle" />Спецбагаж подтверждается авиакомпанией. Возможны ограничения по весу и габаритам.</div>
      </>)}

      {tab === 'meal' && (<>
        <XtrPaxBlock pax={pax} options={AVIA_MEALS} value={state.meal} onChange={(v) => set({ ...state, meal: v })} kind="meal" />
        <div className="xtr-info-box"><Icon name="alertCircle" />Питание предоставляется на рейсах продолжительностью более 2 часов. На некоторых рейсах нужна заявка не менее чем за 24 часа до вылета.</div>
      </>)}

      {tab === 'insurance' && (<>
        <XtrPaxBlock pax={pax} options={AVIA_INSURANCE_PLANS} value={state.insurance} onChange={(v) => set({ ...state, insurance: v })} kind="insurance" />
        <div className="ap-sc-title" style={{ marginTop: 18 }}>Что входит в страховое покрытие</div>
        <div className="xtr-incl">
          {AVIA_INSURANCE_INCLUDES.map((c) => (<div className="xtr-incl-item" key={c.title}><span className="ic"><Icon name={c.icon} /></span><div><div className="t">{c.title}</div><div className="s">{c.sub}</div></div></div>))}
        </div>
      </>)}

      {tab === 'comfort' && <ComfortMatrix pax={pax} state={state} set={set} />}

      <div className="xtr-total"><span>Итого по разделу «{(TABS.find((t) => t.key === tab) || {}).label}»</span><b>{tabTotal[tab] ? '+ ' + rub(tabTotal[tab]) : '0 ₽'}</b></div>
    </div>
  );
}

/* ---------- per-passenger fare selection (step 2 · «Тариф») ---------- */
function fareClassGroup(code) { return ['C', 'J', 'D'].includes(code) ? 'business' : 'economy'; }
function fareTiersForClass(code) { return fareClassGroup(code) === 'business' ? AVIA_FARE_TIERS_BUSINESS : AVIA_FARE_TIERS; }
function fareCabinLabel(code) { return (AVIA_BOOKING_CLASSES.find((c) => c.code === code) || {}).cabin || 'Эконом'; }

function paxIsChild(p) { return /реб[её]н|child|инфант|infant/i.test(p.role || ''); }

function FareSelectPanel({ pax, groups, classByPax, setClassByPax, fareByPax, setFareByPax, individualMode, setIndividualMode, onAddPax, onClose, onApply, routeHeader, applyLabel = 'Применить тарифы и продолжить' }) {
  const [activePax, setActivePax] = useState(0);
  const [collapsed, setCollapsed] = useState({}); // groupId -> bool (left-list subgroup folding)
  const classOf = (i) => classByPax[i] || 'Y';
  const tiersOf = (i) => fareTiersForClass(classOf(i));
  const fareOf = (i) => fareByPax[i] || (tiersOf(i).find((f) => f.recommended) || tiersOf(i)[0]).id;
  const tierOf = (i) => tiersOf(i).find((f) => f.id === fareOf(i)) || tiersOf(i)[0];

  // when individualMode is off, every selection broadcasts to all passengers at once
  const setForPax = (i, patch) => {
    const idxs = individualMode ? [i] : pax.map((_, k) => k);
    if (patch.cls !== undefined) {
      setClassByPax((p) => { const n = { ...p }; idxs.forEach((k) => { n[k] = patch.cls; }); return n; });
      // switching class can invalidate the previously chosen fare id (economy ↔ business tier ids differ)
      setFareByPax((p) => { const n = { ...p }; idxs.forEach((k) => delete n[k]); return n; });
    }
    if (patch.fare !== undefined) {
      setFareByPax((p) => { const n = { ...p }; idxs.forEach((k) => { n[k] = patch.fare; }); return n; });
    }
  };

  // copy the active passenger's class + fare onto an explicit set of passenger indices
  const applyTo = (idxs) => {
    const cls = classOf(activePax), fr = fareOf(activePax);
    setClassByPax((p) => { const n = { ...p }; idxs.forEach((k) => { n[k] = cls; }); return n; });
    setFareByPax((p) => { const n = { ...p }; idxs.forEach((k) => { n[k] = fr; }); return n; });
  };
  const applyToAll = () => applyTo(pax.map((_, k) => k));

  // ---- subgroup sections for the left list ----
  // `groups` (optional): [{ id, name, members:[paxIdx] }]. Passengers not in any group fall
  // into a trailing «Без подгруппы» section. With no groups we render one flat, header-less list.
  const sections = (() => {
    if (groups && groups.length) {
      const used = new Set();
      const secs = groups.map((g) => {
        const members = (g.members || []).filter((i) => i < pax.length && !used.has(i));
        members.forEach((i) => used.add(i));
        return { id: g.id, name: g.name, members };
      }).filter((s) => s.members.length);
      const rest = pax.map((_, i) => i).filter((i) => !used.has(i));
      if (rest.length) secs.push({ id: '__rest', name: 'Без подгруппы', members: rest });
      return secs;
    }
    return [{ id: '__all', name: null, members: pax.map((_, i) => i) }];
  })();

  const sectionStatus = (members) => {
    if (members.every((i) => paxIsChild(pax[i]))) return { label: 'Дети', tone: 'blue' };
    const explicit = members.filter((i) => fareByPax[i] !== undefined).length;
    if (explicit === members.length) return { label: 'С тарифом', tone: 'green' };
    if (explicit === 0) return { label: 'Не назначены', tone: 'amber' };
    return { label: explicit + ' из ' + members.length, tone: 'gray' };
  };

  const total = pax.reduce((s, _, i) => s + tierOf(i).delta, 0);
  const ap = pax[activePax];

  const PaxRow = ({ i }) => (
    <div className={'fare-sel-row' + (activePax === i ? ' active' : '')} onClick={() => setActivePax(i)}>
      <div className="nm">{i + 1}. {pax[i].name}</div>
      <div className="tr">{tierOf(i).name}{classOf(i) !== 'Y' ? ' · класс ' + classOf(i) : ''}</div>
      <div className="pr">{tierOf(i).delta ? '+ ' + rub(tierOf(i).delta) : '0 ₽'}</div>
    </div>
  );

  return (
    <StackPanel title="Выберите класс и тариф" width="min(1180px,96vw)" onClose={onClose}
      footer={<>
        <div className="fare-total-foot">Итого по тарифам<b>{rub(total)}</b></div>
        <div style={{ flex: 1 }} />
        <Button icon="check" onClick={onApply}>{applyLabel}</Button>
      </>}>
      {routeHeader}
      <div className="fare-hint"><Icon name="alertCircle" />Стоимость может отличаться для каждого пассажира в зависимости от выбранного тарифа и условий.</div>

      <div className="fare-layout">
        {/* LEFT — passengers / selected fares, grouped by subgroup when the order has them */}
        <aside className="fare-aside">
          <div className="ap-sc-title">Выбранные тарифы ({pax.length})</div>
          <div className="fare-paxgroups">
            {sections.map((sec) => {
              if (!sec.name) return <div className="fare-sel-list" key={sec.id}>{sec.members.map((i) => <PaxRow key={i} i={i} />)}</div>;
              const st = sectionStatus(sec.members);
              const isCol = !!collapsed[sec.id];
              return (
                <div className="fare-paxgroup" key={sec.id}>
                  <div className="fare-paxgroup-head">
                    <button type="button" className="fpg-toggle" onClick={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}>
                      <Icon name={isCol ? 'chevRight' : 'chevDown'} />
                      <span className="fpg-name">{sec.name}</span>
                      <span className="fpg-cnt">{sec.members.length}</span>
                    </button>
                    <Pill tone={st.tone}>{st.label}</Pill>
                    <button type="button" className="fpg-apply" title="Применить выбранный тариф этой подгруппе" onClick={() => applyTo(sec.members)}><Icon name="users" /></button>
                  </div>
                  {!isCol && <div className="fare-sel-list">{sec.members.map((i) => <PaxRow key={i} i={i} />)}</div>}
                </div>
              );
            })}
          </div>
          {onAddPax && <button type="button" className="ap-sc-add" onClick={onAddPax}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить пассажира</button>}
          <div className="fare-total-row"><span>Итого за всех пассажиров</span><b>{rub(total)}</b></div>
        </aside>

        {/* RIGHT — class + fare selection for the active passenger */}
        <div className="fare-main">
          <div className="fare-sub-head">
            <span>Выберите тариф для пассажира: <b>{ap.name}</b></span>
            <button type="button" className="fare-applyall" onClick={applyToAll}><Icon name="users" />Применить выбранный тариф для всех</button>
          </div>

          <div className="ap-sc-title">1. Выберите класс бронирования</div>
          <div className="fare-class-grid">
            {AVIA_BOOKING_CLASSES.map((c) => (
              <div key={c.code} className={'fare-class-tile' + (classOf(activePax) === c.code ? ' sel' : '')}
                onClick={() => setForPax(activePax, { cls: c.code })}>
                {classOf(activePax) === c.code && <Icon name="check" className="ic-sel" />}
                <div className="code">{c.code}</div>
                <div className="cab">{c.cabin}</div>
                <div className="left">Осталось мест: {c.seatsLeft}</div>
              </div>
            ))}
          </div>

          <div className="ap-sc-title">2. Выберите тариф в классе {classOf(activePax)} ({fareCabinLabel(classOf(activePax))})</div>
          <div className="fare-grid">
            {tiersOf(activePax).map((f) => (
              <div key={f.id} className={'fare-card' + (fareOf(activePax) === f.id ? ' sel' : '')} onClick={() => setForPax(activePax, { fare: f.id })}>
                {f.recommended && <span className="fc-badge">Рекомендуем</span>}
                <div className="fc-name">{f.name}</div>
                <div className="fc-price">{f.delta ? '+ ' + rub(f.delta) : 'без доплаты'}<small>{f.delta ? ' / пассажир' : ''}</small></div>
                {f.features.map((ft, k) => (
                  <div key={k} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>
                ))}
                <Button variant="secondary" size="sm" className="fare-pick-btn" icon={fareOf(activePax) === f.id ? 'check' : undefined}
                  onClick={(e) => { e.stopPropagation(); setForPax(activePax, { fare: f.id }); }}>
                  {fareOf(activePax) === f.id ? 'Выбран' : 'Выбрать тариф'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="fare-footer-toggles">
        <label className="fare-toggle-card" onClick={() => setIndividualMode(true)}>
          <Icon name="users" />
          <div style={{ flex: 1 }}><div className="t">Индивидуальный тариф для каждого пассажира</div><div className="s">Итоговая стоимость будет рассчитана с учётом выбранных тарифов для всех пассажиров заказа</div></div>
          <Toggle on={individualMode} onChange={setIndividualMode} style={{ pointerEvents: 'none' }} />
        </label>
        <label className="fare-toggle-card" onClick={() => setIndividualMode(false)}>
          <Icon name="users" />
          <div style={{ flex: 1 }}><div className="t">Применить для всех участников</div><div className="s">Выбранный тариф будет назначен всем пассажирам заказа</div></div>
          <Toggle on={!individualMode} onChange={(v) => setIndividualMode(!v)} style={{ pointerEvents: 'none' }} />
        </label>
      </div>
    </StackPanel>
  );
}

/* ---------- compact summary row — opens a side panel instead of expanding inline ---------- */
function ApSumRow({ icon, title, sub, value, done, locked, onClick }) {
  return (
    <div className={'ap-list-row ap-sum-row' + (done ? ' sel' : '') + (locked ? ' locked' : '')} onClick={locked ? undefined : onClick}>
      <span className="ic"><Icon name={icon} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t">{title}</div>
        <div className="s">{sub}</div>
      </div>
      <span className="pr">{value}</span>
      <Icon name="chevRight" style={{ width: 18, height: 18, color: 'var(--muted-2)', flex: '0 0 18px' }} />
    </div>
  );
}

/* ====================================================================
   MAIN PICKER
   ==================================================================== */
function AviaPicker({ params, setParams, services = [], onApply, onCancel, onAddType, onRemoveService, group = false }) {
  const toast = useToast();
  const paxPool = group ? GROUP_PAX : ORDER_PARTICIPANTS;
  const PAX = paxPool.slice(0, Math.min(paxPool.length, Math.max(1, params.pax.adt + params.pax.chd)));
  const onAddPax = PAX.length < paxPool.length ? () => setParams({ ...params, pax: { ...params.pax, adt: params.pax.adt + 1 } }) : null;
  const [editSearch, setEditSearch] = useState(false);
  const [farePanel, setFarePanel] = useState(false);
  const [extrasPanel, setExtrasPanel] = useState(false);
  const [paxPanel, setPaxPanel] = useState(false);

  // selections
  const [legs, setLegs] = useState({});         // { out, back } or { seg0, seg1 }
  const [fare, setFare] = useState('optimum');  // group mode: single fallback tariff for passengers not assigned to a group
  const [classByPax, setClassByPax] = useState({}); // individual mode: paxIdx -> booking class code (Y/B/M/U/C/J/D)
  const [fareByPax, setFareByPax] = useState({});   // individual mode: paxIdx -> fare tier id within that class
  const [individualMode, setIndividualMode] = useState(true);
  const [groups, setGroups] = useState(() => AVIA_GROUPS_SEED.map((g) => ({ ...g, members: [...g.members] })));
  const [extras, setExtras] = useState({ seats: {}, baggage: {}, meal: {}, insurance: {}, special: {}, comfort: {} });

  // leg option lists derived from FLIGHT_OFFERS
  const outOpts = FLIGHT_OFFERS.map((o) => ({ key: o.id + '-o', airline: o.airline, leg: o.out, supplier: o.supplier, price: (o.fare + o.fee) * 90 * 0.6 }));
  const backOpts = FLIGHT_OFFERS.filter((o) => o.back).map((o) => ({ key: o.id + '-b', airline: o.airline, leg: o.back, supplier: o.supplier, price: (o.fare + o.fee) * 90 * 0.4 }));

  const trip = params.trip;
  const segKeys = trip === 'rt' ? ['out', 'back'] : trip === 'ow' ? ['out'] : ['out', 'seg1', 'seg2'];

  // ---- 3 alternative route packages shown side by side: one-way / round-trip / complex ----
  const sortedOutOpts = [...outOpts].sort((a, b) => a.price - b.price);
  const rtCombos = FLIGHT_OFFERS.filter((o) => o.back).map((o) => ({
    id: o.id,
    out: { key: o.id + '-o', airline: o.airline, leg: o.out, price: (o.fare + o.fee) * 90 * 0.6 },
    back: { key: o.id + '-b', airline: o.airline, leg: o.back, price: (o.fare + o.fee) * 90 * 0.4 },
  })).sort((a, b) => (a.out.price + a.back.price) - (b.out.price + b.back.price));
  const complexOpts = AVIA_COMPLEX_ROUTE.legs.map((l, i) => ({
    key: 'mc-' + i, airline: l.airline, price: l.price,
    leg: { from: l.from, to: l.to, dep: l.dep, arr: l.arr, dur: l.dur, stops: 0, stopText: 'Прямой' },
  }));
  const complexTotal = AVIA_COMPLEX_ROUTE.legs.reduce((s, l) => s + l.price, 0);
  const complexDur = fmtDurMin(
    AVIA_COMPLEX_ROUTE.legs.reduce((s, l) => s + parseDurMin(l.dur), 0) +
    AVIA_COMPLEX_ROUTE.layovers.reduce((s, lo) => s + lo.min, 0)
  );

  const activeRoute = legs.out ? trip : null;
  const sectionInactive = (type) => activeRoute && activeRoute !== type;

  const selectOneWay = (opt) => { setParams({ ...params, trip: 'ow' }); setLegs({ out: opt }); setFarePanel(true); };
  const selectRoundTrip = (outOpt, backOpt) => { setParams({ ...params, trip: 'rt' }); setLegs({ out: outOpt, back: backOpt }); setFarePanel(true); };
  const selectComplex = () => { setParams({ ...params, trip: 'mc' }); setLegs({ out: complexOpts[0], seg1: complexOpts[1], seg2: complexOpts[2] }); setFarePanel(true); };

  // totals (₽)
  const fareTier = AVIA_FARE_TIERS.find((f) => f.id === fare) || AVIA_FARE_TIERS[0];
  // per-passenger fare/class (non-group mode)
  const paxTierOf = (i) => { const cls = classByPax[i] || 'Y'; const tiers = fareTiersForClass(cls); const id = fareByPax[i] || (tiers.find((f) => f.recommended) || tiers[0]).id; return tiers.find((f) => f.id === id) || tiers[0]; };
  const allSameFare = !group && PAX.every((_, i) => (classByPax[i] || 'Y') === (classByPax[0] || 'Y') && paxTierOf(i).id === paxTierOf(0).id);
  const flightTotal = segKeys.reduce((s, k) => s + (legs[k] ? legs[k].price : 0), 0);
  const fareTotal = group ? fareTier.delta * PAX.length : PAX.reduce((s, _, i) => s + paxTierOf(i).delta, 0);
  const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);
  const seatPrice = (id) => { if (!id) return 0; const row = +id.match(/\d+/)[0]; const kind = AVIA_SEATMAP.rowKind[row] || 'std'; return AVIA_SEATMAP.price[kind] || 0; };
  const seatsTotal = sum(Object.values(extras.seats), seatPrice);
  const baggageTotal = sum(Object.entries(extras.baggage), ([, v]) => (AVIA_BAGGAGE_OPTIONS.find((o) => o.id === v) || {}).price || 0)
    + sum(Object.entries(extras.special), ([id, on]) => on ? (AVIA_SPECIAL_BAGGAGE.find((b) => b.id === id) || {}).from || 0 : 0);
  const mealTotal = sum(Object.values(extras.meal), (v) => (AVIA_MEALS.find((m) => m.id === v) || {}).price || 0);
  const insTotal = sum(Object.values(extras.insurance), (v) => (AVIA_INSURANCE_PLANS.find((p) => p.id === v) || {}).price || 0);
  const comfortTotal = Object.entries(extras.comfort).reduce((a, [k, on]) => {
    if (!on) return a; const id = k.split(':')[0];
    for (const g of AVIA_COMFORT_GROUPS) { const it = g.items.find((x) => x.id === id); if (it) return a + it.price; }
    return a;
  }, 0);
  const extrasTotal = seatsTotal + baggageTotal + mealTotal + insTotal + comfortTotal;
  // group pricing: each passenger pays the base leg fare + the fare-tier delta of their group
  const fareDeltaOf = (i) => { const g = groups.find((gr) => gr.members.includes(i)); const t = AVIA_FARE_TIERS.find((x) => x.id === (g ? g.fare : fare)); return t ? t.delta : 0; };
  const groupFlightTotal = PAX.reduce((a, _, i) => a + flightTotal + fareDeltaOf(i), 0);
  const grand = group ? groupFlightTotal + extrasTotal : flightTotal + fareTotal + extrasTotal;
  const assignedCount = groups.reduce((a, g) => a + g.members.length, 0);

  const allLegsPicked = segKeys.every((k) => legs[k]);
  const seatsSummary = Object.values(extras.seats).filter(Boolean).length ? Object.values(extras.seats).filter(Boolean).join(', ') + ' · ' : '';
  const sumRow = {
    fare: group
      ? fareTier.name + ' · ' + (fareTier.delta ? '+ ' + rub(fareTotal) : 'без доплаты')
      : (allSameFare
          ? paxTierOf(0).name + ' · ' + (paxTierOf(0).delta ? '+ ' + rub(paxTierOf(0).delta) + ' / пасс.' : 'без доплаты')
          : 'Индивидуальные тарифы · ' + PAX.length + ' пасс.'),
    extras: extrasTotal ? seatsSummary + '+ ' + rub(extrasTotal) : 'Не добавлены',
    pax: group ? `${PAX.length} пасс. · ${groups.length} ${groups.length === 1 ? 'группа' : 'группы'}` : PAX.length + ' пасс. · ' + PAX.map((p) => p.name.split(' ')[0]).join(', '),
  };

  // left scenario items (current services + the in-progress avia draft)
  const draftTitle = allLegsPicked ? legs.out.leg.from + segKeys.map((k) => ' → ' + legs[k].leg.to).join('') : 'Новый перелёт';
  const draftSub = allLegsPicked ? `${legs.out.leg.from} → ${legs[segKeys[segKeys.length - 1]].leg.to} · ${PAX.length} пасс.` : 'выберите рейс';

  const apply = () => {
    if (!allLegsPicked) { toast('Сначала выберите рейс', 'err'); return; }
    onApply({
      out: legs.out.leg, back: legs.back ? legs.back.leg : null,
      airline: legs.out.airline, supplier: legs.out.supplier,
      fareName: group ? fareTier.name : (allSameFare ? paxTierOf(0).name : 'Индивидуальные тарифы'), paxCount: PAX.length, totalRub: grand, extrasTotal,
    });
  };

  const ServiceList = () => (
    <>
      {services.map((s) => {
        const k = SERVICE_KIND[s.kind] || SERVICE_KIND['Авиа'];
        return (
          <div className="ap-sc-item" key={s.id}>
            <span className="ic" style={{ background: k.color }}><Icon name={k.icon} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div className="t">{s.title}</div><div className="s">{s.sub}</div></div>
            <span className="pr">{ocMoney(s.sum, s.currency)}</span>
            {onRemoveService && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => onRemoveService(s)}><Icon name="x" /></button>}
          </div>
        );
      })}
      <div className="ap-sc-item draft">
        <span className="ic" style={{ background: SERVICE_KIND['Авиа'].color }}><Icon name="plane" /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t">{draftTitle}</div>
          <div className="s">{draftSub}</div>
        </div>
        <span className="pr">{grand ? rub(grand) : '—'}</span>
      </div>
    </>
  );

  return (
    <div className="fade-in">
      <div className="avia-picker">
        {/* LEFT — scenario */}
        <aside className="ap-scenario">
          <div className="ap-sc-head">
            <div className="ap-sc-route">
              <Icon name="plane" />
              {(AIRPORTS.find((a) => a.code === params.from) || {}).city || params.from}
              <Icon name="arrowRight" />
              {(AIRPORTS.find((a) => a.code === params.to) || {}).city || params.to}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>
              {params.depDate ? fmtDate(params.depDate) : '24.06'}{trip === 'rt' ? ' — ' + (params.retDate ? fmtDate(params.retDate) : '01.07') : ''} · {PAX.length} пасс. · {params.cabin}
            </div>
          </div>
          <div className="ap-sc-body">
            <div className="ap-sc-title">Состав сценария</div>
            <ServiceList />
            <button className="ap-sc-add" onClick={() => onAddType && onAddType()}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить услугу</button>
          </div>
          <div className="ap-sc-foot">
            <div className="ap-sc-total">
              <span className="l">Итого по сценарию</span>
              <span className="v">{rub(grand + services.reduce((a, s) => a + (s.currency === '₽' || s.currency === 'RUB' ? s.sum : s.sum * RUB_PER_USD), 0))}</span>
            </div>
            {services.some((s) => s.currency && s.currency !== '₽' && s.currency !== 'RUB') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', margin: '0 0 10px' }}>
                <Icon name="alertCircle" style={{ width: 13, height: 13 }} />
                Суммы в валюте пересчитаны по курсу ≈ {RUB_PER_USD} ₽/$
              </div>
            )}
            <Button icon="template" style={{ width: '100%' }} onClick={() => toast('Сформировано предложение из сценария', 'ok')}>Сформировать предложение</Button>
          </div>
        </aside>

        {/* RIGHT — static flight list + compact summary rows that open side panels */}
        <div className="ap-steps">
          {/* flight selection — the only thing that lives inline; never collapses, never pushed around */}
          <div className="ap-step done">
            <div className="ap-step-head static">
              <span className="ap-num"><Icon name="plane" style={{ width: 15, height: 15 }} /></span>
              <div className="ap-step-tt"><div className="t">Выберите рейс</div></div>
            </div>
            <div className="ap-step-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ flex: 1 }} />
                <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditSearch((v) => !v)}>{editSearch ? 'Свернуть' : 'Изменить поиск'}</Button>
              </div>
              {editSearch && <div style={{ margin: '0 0 18px' }}><FlightSearch params={params} setParams={setParams} onSearch={() => setEditSearch(false)} /></div>}

              {/* 1. one-way options */}
              <div className={'ap-route-section' + (sectionInactive('ow') ? ' inactive' : '')}>
                <div className="ap-route-title">1. Маршрут туда</div>
                {sortedOutOpts.map((o) => {
                  const sel = activeRoute === 'ow' && legs.out && legs.out.key === o.key;
                  return (
                    <div key={o.key} className={'ap-route-card' + (sel ? ' sel' : '')}>
                      <ApFlightRow opt={o} sel={sel} onSelect={selectOneWay} />
                    </div>
                  );
                })}
              </div>

              {/* 2. round-trip combos (same offer both ways) */}
              <div className={'ap-route-section' + (sectionInactive('rt') ? ' inactive' : '')}>
                <div className="ap-route-title">2. Туда и обратно</div>
                {rtCombos.map((c) => {
                  const total = c.out.price + c.back.price;
                  const dur = fmtDurMin(parseDurMin(c.out.leg.dur) + parseDurMin(c.back.leg.dur));
                  const savings = Math.round(total * 0.045);
                  const sel = activeRoute === 'rt' && legs.out && legs.out.key === c.out.key;
                  const pick = () => selectRoundTrip(c.out, c.back);
                  return (
                    <div key={c.id} className={'ap-route-card' + (sel ? ' sel' : '')}>
                      <ApFlightRow opt={c.out} sel={sel} onSelect={pick} />
                      <span className="ap-route-swap"><Icon name="swap" /></span>
                      <ApFlightRow opt={c.back} sel={sel} onSelect={pick} />
                      <div className="ap-route-totals">
                        <div className="rt-block"><Icon name="route" /><div><div className="l">Общая продолжительность</div><div className="v">{dur}</div></div></div>
                        <div className="rt-price"><div className="l">Итого за маршрут</div><div className="v">{rub(total)}</div></div>
                        <span className="pill pill-green rt-badge"><Icon name="zap" />Выгоднее на {rub(savings)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. complex / multi-city route */}
              <div className={'ap-route-section' + (sectionInactive('mc') ? ' inactive' : '')}>
                <div className="ap-route-title">3. Сложный маршрут</div>
                <div className={'ap-route-card chain' + (activeRoute === 'mc' ? ' sel' : '')}>
                  <div className="ap-route-chain">
                    {complexOpts.map((o, i) => (
                      <React.Fragment key={o.key}>
                        <div className="ap-route-chain-row">
                          <div className="ap-route-chain-num"><span>{i + 1}</span>{i < complexOpts.length - 1 && <i />}</div>
                          <div className="ap-route-chain-leg"><ApFlightRow opt={o} sel={activeRoute === 'mc'} onSelect={selectComplex} /></div>
                        </div>
                        {i < AVIA_COMPLEX_ROUTE.layovers.length && (
                          <div style={{ marginLeft: 36 }}><span className="ap-route-chain-layover">{AVIA_COMPLEX_ROUTE.layovers[i].label}</span></div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="ap-route-totals">
                    <div className="rt-block"><Icon name="route" /><div><div className="l">Общая продолжительность (с учётом пересадок)</div><div className="v">{complexDur}</div></div></div>
                    <div className="rt-price"><div className="l">Итого за маршрут</div><div className="v">{rub(complexTotal)}</div></div>
                    <span className="pill pill-blue rt-badge"><Icon name="star" />Оптимальный маршрут</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* compact summary rows — tariff / extras / passengers open as side panels over the static screen */}
          <div className="ap-step">
            <div className="ap-step-head static">
              <span className="ap-num">2</span>
              <div className="ap-step-tt"><div className="t">Тариф, услуги и пассажиры</div></div>
            </div>
            <div className="ap-step-body">
              <ApSumRow icon="template" title="Тариф" sub={sumRow.fare} value={fareTier.delta ? '+ ' + rub(fareTotal) : 'без доплаты'}
                done={!!fare} locked={!allLegsPicked} onClick={() => setFarePanel(true)} />
              <ApSumRow icon="briefcase" title="Доп. услуги и места" sub={sumRow.extras} value={extrasTotal ? rub(extrasTotal) : '—'}
                done={extrasTotal > 0} locked={!allLegsPicked} onClick={() => setExtrasPanel(true)} />
              <ApSumRow icon="users" title={group ? 'Пассажиры и тарифы' : 'Пассажиры'} sub={sumRow.pax} value={PAX.length + ' чел.'}
                done locked={!allLegsPicked} onClick={() => setPaxPanel(true)} />
              {!allLegsPicked && (
                <div className="chan-note" style={{ justifyContent: 'flex-start', marginTop: 4 }}>
                  <Icon name="alertCircle" />Сначала выберите рейс — тариф, услуги и пассажиры откроются в боковой панели
                </div>
              )}
            </div>
          </div>

          {/* footer */}
          <div className="ap-footer">
            <div className="ft-total">Итого за перелёт<b>{rub(grand)}</b></div>
            <div style={{ flex: 1 }} />
            <Button variant="secondary" onClick={onCancel}>Отмена</Button>
            <Button icon="check" disabled={!allLegsPicked} onClick={apply}>Применить в сценарий</Button>
          </div>
        </div>
      </div>

      {/* side panel — fare. Group trips keep the single shared-tariff grid (per-group tariffs
          live in the «Пассажиры» panel's GroupManager); individual trips get the full
          per-passenger fare-selection screen. */}
      {farePanel && (group ? (
        <StackPanel title="Выберите тариф" width="min(760px,92vw)" onClose={() => setFarePanel(false)}
          footer={<Button style={{ width: '100%' }} icon="check" onClick={() => setFarePanel(false)}>Готово</Button>}>
          <div className="fare-grid">
            {AVIA_FARE_TIERS.map((f) => (
              <div key={f.id} className={'fare-card' + (fare === f.id ? ' sel' : '')} onClick={() => setFare(f.id)}>
                {f.recommended && <span className="fc-badge">Рекомендуем</span>}
                <div className="fc-name">{f.name}</div>
                <div className="fc-price">{f.delta ? '+ ' + rub(f.delta) : 'без доплаты'}<small>{f.delta ? ' / пасс.' : ''}</small></div>
                {f.features.map((ft, i) => (
                  <div key={i} className={'fare-feat ' + (ft.ok ? 'ok' : 'no')}><Icon name={ft.ok ? 'check' : 'x'} />{ft.text}</div>
                ))}
              </div>
            ))}
          </div>
        </StackPanel>
      ) : (
        <FareSelectPanel pax={PAX} classByPax={classByPax} setClassByPax={setClassByPax}
          fareByPax={fareByPax} setFareByPax={setFareByPax}
          individualMode={individualMode} setIndividualMode={setIndividualMode}
          onAddPax={onAddPax}
          onClose={() => setFarePanel(false)} onApply={() => setFarePanel(false)} />
      ))}

      {/* side panel — extras (seats / baggage / meal / insurance / comfort) */}
      {extrasPanel && (
        <StackPanel title="Дополнительные услуги и места" width="min(820px,92vw)" onClose={() => setExtrasPanel(false)}
          footer={<><div className="ft-total" style={{ marginRight: 'auto' }}>Доп.услуги<b style={{ fontSize: 18 }}>{rub(extrasTotal)}</b></div>
            <Button icon="check" onClick={() => setExtrasPanel(false)}>Готово</Button></>}>
          <ExtrasTabs pax={PAX} state={extras} set={setExtras} embedded />
        </StackPanel>
      )}

      {/* side panel — passengers (group → group manager & fares) */}
      {paxPanel && (
        <StackPanel title={group ? 'Пассажиры и тарифы' : 'Пассажиры'} width="min(900px,92vw)" onClose={() => setPaxPanel(false)}
          footer={<Button style={{ width: '100%' }} icon="check" onClick={() => setPaxPanel(false)}>Готово</Button>}>
          {group ? (
            <GroupManager pax={PAX} groups={groups} setGroups={setGroups} perPax={flightTotal} extras={extras} />
          ) : (
            <div className="table-card">
              <table className="tbl">
                <thead><tr><th>Пассажир</th><th>Тип</th><th>Документ</th><th>Место</th><th>Багаж</th></tr></thead>
                <tbody>{PAX.map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td><td>{p.role}</td><td>{p.doc}</td>
                    <td>{extras.seats[i] || <span style={{ color: 'var(--muted-2)' }}>—</span>}</td>
                    <td>{(AVIA_BAGGAGE_OPTIONS.find((o) => o.id === extras.baggage[i]) || AVIA_BAGGAGE_OPTIONS[0]).label}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </StackPanel>
      )}
    </div>
  );
}

/* ====================================================================
   GROUP MANAGEMENT (4a) — used in step 5 when the order is a group trip
   ==================================================================== */
function tierName(id) { return (AVIA_FARE_TIERS.find((t) => t.id === id) || {}).name || id; }
function tierDelta(id) { return (AVIA_FARE_TIERS.find((t) => t.id === id) || {}).delta || 0; }

function GroupManager({ pax, groups, setGroups, perPax, extras }) {
  const toast = useToast();
  const [tab, setTab] = useState('manage');
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const groupOf = (i) => groups.find((g) => g.members.includes(i));
  const assigned = new Set(groups.flatMap((g) => g.members));
  const unassigned = pax.map((_, i) => i).filter((i) => !assigned.has(i));

  const setGroupFare = (id, fare) => setGroups((gs) => gs.map((g) => g.id === id ? { ...g, fare } : g));
  const removeGroup = (id) => setGroups((gs) => gs.filter((g) => g.id !== id));
  // members assigned to one group are removed from every other group (a passenger is in one group)
  const saveMembers = (id, members) => setGroups((gs) => gs.map((g) => g.id === id ? { ...g, members } : { ...g, members: g.members.filter((m) => !members.includes(m)) }));
  const createGroup = (g) => { setGroups((gs) => [...gs.map((x) => ({ ...x, members: x.members.filter((m) => !g.members.includes(m)) })), { id: 'g' + Date.now(), ...g }]); toast('Группа создана', 'ok'); };
  const fareOpts = AVIA_FARE_TIERS.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div>
      <div className="ap-svc-tabs">
        <button className={'ap-svc-tab' + (tab === 'manage' ? ' active' : '')} onClick={() => setTab('manage')}><Icon name="users" />Управление группами<span className="b">{groups.length}</span></button>
        <button className={'ap-svc-tab' + (tab === 'applied' ? ' active' : '')} onClick={() => setTab('applied')}><Icon name="clipboard" />Применённый список<span className="b">{pax.length}</span></button>
      </div>

      {tab === 'manage' ? (
        <>
          {groups.map((g) => (
            <div className="ap-pax" key={g.id}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <span className="ap-num" style={{ background: 'var(--blue)', color: '#fff' }}>{g.members.length}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>{g.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{g.desc || 'Без описания'}</div>
                </div>
                <Button variant="secondary" size="sm" icon="edit" onClick={() => setEditId(g.id)}>Изменить состав</Button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeGroup(g.id)}><Icon name="trash" /></button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 220, flex: 1 }}>
                  <Field label="Тариф группы"><Select options={fareOpts} value={g.fare} onChange={(e) => setGroupFare(g.id, e.target.value)} /></Field>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Стоимость группы</div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>{rub(g.members.length * (perPax + tierDelta(g.fare)))}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {g.members.map((mi) => <span key={mi} className="pill pill-gray" style={{ height: 26, fontSize: 12.5 }}>{pax[mi].name}</span>)}
              </div>
            </div>
          ))}
          {unassigned.length > 0 && (
            <div className="chan-note" style={{ justifyContent: 'flex-start' }}><Icon name="alertCircle" />Не распределено пассажиров: {unassigned.length}</div>
          )}
          <button className="ap-sc-add" onClick={() => setAddOpen(true)}><Icon name="plus" style={{ width: 16, height: 16 }} />Добавить группу</button>
        </>
      ) : (
        <div className="table-card">
          <table className="tbl">
            <thead><tr><th>#</th><th>Пассажир</th><th>Группа</th><th>Тариф</th><th>Место</th><th style={{ textAlign: 'right' }}>Стоимость</th></tr></thead>
            <tbody>{pax.map((p, i) => { const g = groupOf(i); const fare = g ? g.fare : 'light'; return (
              <tr key={i}>
                <td style={{ color: 'var(--muted)' }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>{g ? <Pill tone="blue">{g.name}</Pill> : <span style={{ color: 'var(--muted-2)' }}>—</span>}</td>
                <td>{tierName(fare)}</td>
                <td>{extras.seats[i] || <span style={{ color: 'var(--muted-2)' }}>—</span>}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{rub(perPax + tierDelta(fare))}</td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      )}

      {addOpen && <GroupEditPanel title="Добавление группы" pax={pax} groups={groups}
        onClose={() => setAddOpen(false)} onSave={(data) => { createGroup(data); setAddOpen(false); }} isNew />}
      {editId && (() => { const g = groups.find((x) => x.id === editId); return (
        <GroupEditPanel title={'Изменение состава · ' + g.name} pax={pax} groups={groups} group={g}
          onClose={() => setEditId(null)} onSave={(data) => { saveMembers(g.id, data.members); setEditId(null); toast('Состав группы обновлён', 'ok'); }} />
      ); })()}
    </div>
  );
}

/* add / edit group composition drawer (reuses the stacked panel shell) */
function GroupEditPanel({ title, pax, groups, group, onClose, onSave, isNew }) {
  const [name, setName] = useState(group ? group.name : '');
  const [desc, setDesc] = useState(group ? group.desc : '');
  const [fare, setFare] = useState(group ? group.fare : 'optimum');
  const [members, setMembers] = useState(group ? [...group.members] : []);
  const [q, setQ] = useState('');
  const s = q.trim().toLowerCase();
  const otherGroupOf = (i) => groups.find((g) => g.id !== (group ? group.id : null) && g.members.includes(i));
  const toggle = (i) => setMembers((m) => m.includes(i) ? m.filter((x) => x !== i) : [...m, i]);
  const list = pax.map((p, i) => ({ p, i })).filter(({ p }) => !s || p.name.toLowerCase().includes(s));
  const fareOpts = AVIA_FARE_TIERS.map((t) => ({ value: t.id, label: t.name }));
  return (
    <StackPanel title={title} onClose={onClose}
      footer={<><Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
        <Button style={{ flex: 1 }} icon="check" disabled={isNew && !name.trim()} onClick={() => onSave({ name: name.trim() || 'Новая группа', desc, fare, members })}>{isNew ? 'Создать группу' : 'Сохранить изменения'}</Button></>}>
      {isNew && (
        <>
          <Field label="Название группы"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Руководство" /></Field>
          <Field label="Описание (необязательно)"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Краткое описание" /></Field>
        </>
      )}
      <Field label="Тариф группы"><Select options={fareOpts} value={fare} onChange={(e) => setFare(e.target.value)} /></Field>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.02em', margin: '16px 2px 10px', display: 'flex', alignItems: 'center' }}>
        Пассажиры<span style={{ flex: 1 }} /><span style={{ textTransform: 'none', color: 'var(--blue)' }}>{members.length} выбрано</span>
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="Поиск пассажира" />
      <div style={{ marginTop: 10 }}>
        {list.map(({ p, i }) => { const og = otherGroupOf(i); return (
          <label key={i} className="oce-client" style={{ cursor: 'pointer', opacity: og && !members.includes(i) ? 0.6 : 1 }}>
            <Checkbox on={members.includes(i)} onChange={() => toggle(i)} />
            <Avatar name={p.name} size={30} />
            <div style={{ flex: 1, minWidth: 0 }}><div className="nm">{p.name}</div>
              <div className="mt">{p.doc}{og ? ' · в группе «' + og.name + '»' : ''}</div></div>
          </label>
        ); })}
      </div>
    </StackPanel>
  );
}

Object.assign(window, { AviaPicker });
