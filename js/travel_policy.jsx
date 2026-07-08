// ===== Тревел-политика компании (ТЗ): разделы Авиа / ЖД / Гостиницы / Трансферы /
//        Доп. услуги / Согласование + Контроль соответствия при подборе + история изменений =====

/* Проверка услуги на соответствие тревел-политике (демо). Возвращает ключ статуса из TP_COMPLIANCE.
   Система не запрещает, а помечает: ok | overLimit | class | supplier | approval. */
function checkTravelPolicy(kind, offer, policy) {
  if (!policy) return 'ok';
  if (kind === 'Авиа' && policy.avia) {
    if (offer.supplierForbidden) return 'supplier';
    if (offer.cls && policy.avia.classAllowed && TP_CLASSES_AVIA.indexOf(offer.cls) > TP_CLASSES_AVIA.indexOf(policy.avia.classAllowed)) return 'class';
    if (offer.price != null && policy.avia.maxPrice && offer.price > policy.avia.maxPrice) return 'overLimit';
  }
  if (kind === 'Гостиницы' && policy.hotels) {
    if (offer.night != null && policy.hotels.maxNight && offer.night > policy.hotels.maxNight) return 'overLimit';
  }
  if (offer.needsApproval) return 'approval';
  return 'ok';
}

/* Бейдж статуса соответствия — переиспользуется в выдаче подбора */
function ComplianceBadge({ status }) {
  const c = TP_COMPLIANCE[status] || TP_COMPLIANCE.ok;
  return <Pill tone={c.tone}><Icon name={c.icon} style={{ width: 12, height: 12, verticalAlign: -2, marginRight: 4 }} />{c.label}</Pill>;
}

/* Небольшие поля-строки для редактора политики */
function TpNum({ label, value, onChange, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 120 }}><Input type="number" min="0" value={value} onChange={(e) => onChange(e.target.value === '' ? '' : (parseFloat(e.target.value) || 0))} /></div>
      {suffix && <span style={{ width: 46, fontSize: 12.5, color: 'var(--muted)' }}>{suffix}</span>}
    </div>
  );
}
function TpText({ label, value, onChange, placeholder }) {
  return (
    <div style={{ padding: '7px 0' }}>
      <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 5 }}>{label}</div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function TpSelect({ label, options, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--body)' }}>{label}</span>
      <div style={{ width: 200 }}><Select options={options} value={value} onChange={(e) => onChange(e.target.value)} /></div>
    </div>
  );
}
function TpToggle({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--body)' }}>{label}</span>
      <Toggle on={!!value} onChange={onChange} />
    </div>
  );
}

function TravelPolicyBlock({ co }) {
  const toast = useToast();
  const store = travelPolicyFor(co.id);
  const [pol, setPol] = useState(() => JSON.parse(JSON.stringify(store.policy)));
  const [histOpen, setHistOpen] = useState(false);
  const s = (section, key, v) => setPol((p) => ({ ...p, [section]: { ...p[section], [key]: v } }));

  const diffFields = () => {
    const out = [];
    const base = store.policy;
    ['avia', 'rail', 'hotels', 'transfers', 'extras', 'approval'].forEach((sec) => {
      Object.keys(pol[sec]).forEach((k) => { if (String(pol[sec][k]) !== String(base[sec][k])) out.push(sec + ' · ' + k); });
    });
    if (pol.scope !== base.scope || pol.scopeValue !== base.scopeValue) out.push('Область применения');
    return out;
  };
  const save = () => {
    const fields = diffFields();
    if (!fields.length) { toast('Изменений нет', 'info'); return; }
    store.policy = JSON.parse(JSON.stringify(pol));
    store.history.push({ date: window.cfNow ? window.cfNow() : new Date().toLocaleString('ru-RU'), user: (CURRENT_USER && CURRENT_USER.name) || 'Оператор', title: 'Изменение тревел-политики', fields });
    toast('Тревел-политика сохранена (новая версия)', 'ok');
  };

  return (
    <div className="fade-in">
      {/* Область применения */}
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 className="card-title" style={{ fontSize: 17, margin: 0 }}>Тревел-политика</h3>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>Правила оформления командировок. Проверяются автоматически при подборе и бронировании.</div>
          </div>
          <Button variant="secondary" size="sm" icon="clock" onClick={() => setHistOpen(true)}>История изменений</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>Применяется к:</span>
          <div className="seg-toggle" style={{ maxWidth: 480 }}>
            {TP_SCOPES.map((t) => (
              <button key={t} className={'seg-btn' + (pol.scope === t ? ' active' : '')} onClick={() => setPol((p) => ({ ...p, scope: t }))}>{t}</button>
            ))}
          </div>
          {pol.scope !== 'Вся компания' && (
            <div style={{ width: 240 }}><Input placeholder={pol.scope === 'Подразделение' ? 'Название подразделения' : pol.scope === 'Должность' ? 'Название должности' : 'ФИО сотрудника'} value={pol.scopeValue} onChange={(e) => setPol((p) => ({ ...p, scopeValue: e.target.value }))} /></div>
          )}
        </div>
      </div>

      {/* Авиа */}
      <CollapseSection title="Авиа" note="Класс, авиакомпании, пересадки, лимиты стоимости" defaultOpen>
        <TpSelect label="Разрешённый класс обслуживания" options={TP_CLASSES_AVIA} value={pol.avia.classAllowed} onChange={(v) => s('avia', 'classAllowed', v)} />
        <TpText label="Разрешённые авиакомпании" value={pol.avia.airlinesAllowed} onChange={(v) => s('avia', 'airlinesAllowed', v)} placeholder="через запятую" />
        <TpText label="Запрещённые авиакомпании" value={pol.avia.airlinesForbidden} onChange={(v) => s('avia', 'airlinesForbidden', v)} placeholder="через запятую" />
        <TpToggle label="Разрешены рейсы с пересадками" value={pol.avia.stops} onChange={(v) => s('avia', 'stops', v)} />
        <TpNum label="Максимум пересадок" value={pol.avia.maxStops} onChange={(v) => s('avia', 'maxStops', v)} suffix="шт." />
        <TpNum label="Макс. продолжительность пересадки" value={pol.avia.maxLayoverH} onChange={(v) => s('avia', 'maxLayoverH', v)} suffix="ч" />
        <TpNum label="Мин. время пересадки" value={pol.avia.minLayoverMin} onChange={(v) => s('avia', 'minLayoverMin', v)} suffix="мин" />
        <TpNum label="Максимальная стоимость билета" value={pol.avia.maxPrice} onChange={(v) => s('avia', 'maxPrice', v)} suffix="$" />
        <TpNum label="Допустимое отклонение от самого дешёвого" value={pol.avia.deviationPct} onChange={(v) => s('avia', 'deviationPct', v)} suffix="%" />
        <TpToggle label="Разрешены невозвратные тарифы" value={pol.avia.nonRefundable} onChange={(v) => s('avia', 'nonRefundable', v)} />
        <TpToggle label="Разрешены доп. услуги (багаж, место, бизнес-зал)" value={pol.avia.extrasAllowed} onChange={(v) => s('avia', 'extrasAllowed', v)} />
        <TpNum label="Мин. срок оформления до вылета" value={pol.avia.minLeadDays} onChange={(v) => s('avia', 'minLeadDays', v)} suffix="дн." />
      </CollapseSection>

      {/* ЖД */}
      <CollapseSection title="ЖД" note="Классы вагонов, лимиты, типы поездов">
        <TpSelect label="Разрешённый класс вагона" options={TP_RAIL_CLASSES} value={pol.rail.wagonClass} onChange={(v) => s('rail', 'wagonClass', v)} />
        <TpText label="Разрешённые типы вагонов" value={pol.rail.wagonTypes} onChange={(v) => s('rail', 'wagonTypes', v)} placeholder="через запятую" />
        <TpNum label="Максимальная стоимость билета" value={pol.rail.maxPrice} onChange={(v) => s('rail', 'maxPrice', v)} suffix="$" />
        <TpToggle label="Разрешено СВ" value={pol.rail.svAllowed} onChange={(v) => s('rail', 'svAllowed', v)} />
        <TpToggle label="Разрешено купе" value={pol.rail.kupeAllowed} onChange={(v) => s('rail', 'kupeAllowed', v)} />
        <TpToggle label="Разрешены скоростные поезда" value={pol.rail.highSpeed} onChange={(v) => s('rail', 'highSpeed', v)} />
        <TpNum label="Мин. срок оформления" value={pol.rail.minLeadDays} onChange={(v) => s('rail', 'minLeadDays', v)} suffix="дн." />
      </CollapseSection>

      {/* Гостиницы */}
      <CollapseSection title="Гостиницы" note="Категория, стоимость за ночь, сети, услуги">
        <TpNum label="Максимальная стоимость за ночь" value={pol.hotels.maxNight} onChange={(v) => s('hotels', 'maxNight', v)} suffix="$" />
        <TpSelect label="Максимальная категория гостиницы" options={['3★', '4★', '5★']} value={pol.hotels.maxCategory} onChange={(v) => s('hotels', 'maxCategory', v)} />
        <TpText label="Разрешённые сети гостиниц" value={pol.hotels.chainsAllowed} onChange={(v) => s('hotels', 'chainsAllowed', v)} placeholder="через запятую" />
        <TpText label="Запрещённые гостиницы" value={pol.hotels.forbidden} onChange={(v) => s('hotels', 'forbidden', v)} placeholder="через запятую" />
        <TpNum label="Допустимое расстояние до места назначения" value={pol.hotels.maxDistanceKm} onChange={(v) => s('hotels', 'maxDistanceKm', v)} suffix="км" />
        <TpText label="Разрешённые типы питания" value={pol.hotels.boardAllowed} onChange={(v) => s('hotels', 'boardAllowed', v)} placeholder="Завтрак, Полупансион…" />
        <TpToggle label="Разрешено раннее заселение" value={pol.hotels.earlyCheckIn} onChange={(v) => s('hotels', 'earlyCheckIn', v)} />
        <TpToggle label="Разрешён поздний выезд" value={pol.hotels.lateCheckOut} onChange={(v) => s('hotels', 'lateCheckOut', v)} />
        <TpToggle label="Разрешено повышение категории номера" value={pol.hotels.upgrade} onChange={(v) => s('hotels', 'upgrade', v)} />
      </CollapseSection>

      {/* Трансферы */}
      <CollapseSection title="Трансферы" note="Классы авто, такси, лимиты">
        <TpText label="Разрешённые классы автомобилей" value={pol.transfers.carClasses} onChange={(v) => s('transfers', 'carClasses', v)} placeholder="Эконом, Комфорт…" />
        <TpToggle label="Разрешены индивидуальные трансферы" value={pol.transfers.individual} onChange={(v) => s('transfers', 'individual', v)} />
        <TpToggle label="Разрешено такси" value={pol.transfers.taxi} onChange={(v) => s('transfers', 'taxi', v)} />
        <TpNum label="Максимальная стоимость" value={pol.transfers.maxPrice} onChange={(v) => s('transfers', 'maxPrice', v)} suffix="$" />
      </CollapseSection>

      {/* Доп. услуги */}
      <CollapseSection title="Дополнительные услуги" note="Что разрешено оформлять">
        <TpToggle label="Страхование" value={pol.extras.insurance} onChange={(v) => s('extras', 'insurance', v)} />
        <TpToggle label="Визовая поддержка" value={pol.extras.visa} onChange={(v) => s('extras', 'visa', v)} />
        <TpToggle label="VIP-залы" value={pol.extras.vipLounge} onChange={(v) => s('extras', 'vipLounge', v)} />
        <TpToggle label="Fast Track" value={pol.extras.fastTrack} onChange={(v) => s('extras', 'fastTrack', v)} />
        <TpToggle label="Дополнительные услуги аэропорта" value={pol.extras.airportExtra} onChange={(v) => s('extras', 'airportExtra', v)} />
      </CollapseSection>

      {/* Согласование */}
      <CollapseSection title="Согласование" note="Кто и когда согласовывает поездку">
        <TpToggle label="Требуется согласование поездки" value={pol.approval.required} onChange={(v) => s('approval', 'required', v)} />
        <TpSelect label="Кто согласовывает" options={TP_APPROVERS} value={pol.approval.approver} onChange={(v) => s('approval', 'approver', v)} />
        <TpToggle label="Согласование при превышении лимитов" value={pol.approval.onOverLimit} onChange={(v) => s('approval', 'onOverLimit', v)} />
        <TpToggle label="Автосогласование при соблюдении политики" value={pol.approval.autoIfCompliant} onChange={(v) => s('approval', 'autoIfCompliant', v)} />
        <TpToggle label="Возможность оформления без согласования" value={pol.approval.allowWithout} onChange={(v) => s('approval', 'allowWithout', v)} />
      </CollapseSection>

      {/* Контроль */}
      <div className="card card-pad" style={{ marginTop: 16 }}>
        <h3 className="card-title" style={{ fontSize: 16, marginBottom: 8 }}>Контроль соответствия при подборе</h3>
        <div style={{ fontSize: 13, color: 'var(--body)', marginBottom: 12 }}>При подборе услуг система автоматически проверяет тревел-политику и помечает каждый вариант. Оформление не блокируется — при нарушении указывается причина и, при необходимости, заявка отправляется на согласование.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Object.keys(TP_COMPLIANCE).map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ComplianceBadge status={k} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 18 }}>
        <Button icon="check" onClick={save}>Сохранить тревел-политику</Button>
      </div>

      <Drawer open={histOpen} onClose={() => setHistOpen(false)} title="История изменений тревел-политики"
        footer={<Button variant="secondary" style={{ width: '100%' }} onClick={() => setHistOpen(false)}>Закрыть</Button>}>
        <div className="timeline">
          {[...store.history].reverse().map((v, i) => (
            <div className="tl-item" key={i}><span className="tl-dot" /><span className="tl-line" />
              <div style={{ paddingBottom: 8 }}>
                <div className="tl-time">{v.date} · {v.user}</div>
                <div className="tl-text" style={{ fontWeight: 600 }}>{v.title}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{v.fields.join(', ')}</div>
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}

Object.assign(window, { TravelPolicyBlock, checkTravelPolicy, ComplianceBadge });
