import { useEffect, useState } from 'react';
import { Icon } from './icons';
import { ActionMenu, Avatar, Button, Checkbox, DateField, EmptyState, Field, Input, Radio, SearchBox, Select, fmtDate, useToast } from './ui';
import { HOTEL_MEALS } from './data';
import { Topbar } from './layout';
import { StackPanel } from './components/shared-panels';
import { UnifiedBindPicker } from './forms_unified';
import { servicesApi } from './api/resources';
import { resultsOf } from './api/client';







const HP_SORT_OPTS = [
  ['rec', 'Рекомендуемые'], ['cheap', 'Сначала дешёвые'], ['pricey', 'Сначала дорогие'],
  ['stars', 'По звёздам'], ['rating', 'По рейтингу'],
];
const HP_SORT_LABEL = HP_SORT_OPTS.reduce((m, [k, l]) => (m[k] = l, m), {});

const HP_RADIUS_OPTS = ['500 м', '1 км', '2 км', '5 км', '10 км', 'Без ограничений'];

function hpM(n, currency = 'RUB') {
  const symbol = { RUB: '₽', USD: '$', EUR: '€', KGS: 'сом' }[currency] || currency;
  return Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' ' + symbol;
}
function hpStars(n) { return '★★★★★'.slice(0, n); }
function hpNights(ci, co) {
  if (!ci || !co) return 1;
  const d = Math.round((co - ci) / 86400000);
  return d > 0 ? d : 1;
}
function hotelOfferToUi(offer, criteria = {}) {
  const itinerary = offer.itinerary || {};
  const fare = offer.fare || {};
  const base = Number(offer.price?.amount || 0);
  const currency = offer.price?.currency || 'USD';
  const rawCapacity = itinerary.max_occupancy ?? itinerary.capacity ?? fare.max_occupancy;
  const cap = Number.isFinite(Number(rawCapacity)) && Number(rawCapacity) > 0 ? Number(rawCapacity) : null;
  const cancellation = fare.cancellation_rules || fare.cancellation || itinerary.cancellation_rules || '';
  const room = {
    id: offer.id, name: itinerary.room || 'Категория не указана', base, currency,
    beds: itinerary.beds || itinerary.bed_type || 'Не указано', cap,
    count: typeof offer.availability === 'object' ? offer.availability.rooms ?? null : null,
    area: itinerary.area || null, floor: itinerary.floor || null,
    tariffs: [{
      id: offer.id, name: fare.name || fare.rate_name || itinerary.meal_plan || 'Тариф поставщика', price: base, currency,
      feats: [
        itinerary.meal_plan ? { ok: true, t: `Питание: ${itinerary.meal_plan}` } : null,
        cancellation ? { ok: true, t: String(cancellation) } : null,
      ].filter(Boolean),
    }],
  };
  return {
    ...offer,
    _backendOfferId: offer.id,
    id: offer.id,
    name: itinerary.property_name || offer.external_key || 'Гостиница',
    stars: itinerary.stars == null ? 0 : Number(itinerary.stars),
    addr: itinerary.address || itinerary.city || '—',
    addrFull: itinerary.address || itinerary.city || '—',
    city: itinerary.city || '',
    district: itinerary.district || itinerary.city || '—',
    metro: itinerary.metro_distance ?? null,
    rating: itinerary.rating ?? null,
    ratingText: itinerary.rating_text || '',
    reviews: itinerary.reviews_count ?? null,
    base,
    breakfast: itinerary.meal_plan && itinerary.meal_plan !== 'RO',
    freeCancel: fare.free_cancel_until || itinerary.free_cancel_until || null,
    cancellation,
    payAtHotel: Boolean(fare.pay_at_hotel || itinerary.pay_at_hotel),
    supplier: offer.provider_adapter || 'Подключённый поставщик',
    supplierId: offer.supplier || null,
    phone: itinerary.phone || '', email: itinerary.email || '', currency,
    rooms: [room],
  };
}


function HotelResultCard({ h, onPick }) {
  return (
    <div className="hp-card">
      <div className="hp-card-photo">
        <div className={'hp-photo hp-photo-' + h.id} />
        {h.breakfast && <span className="hp-photo-badge"><Icon name="coffee" />Завтрак включён</span>}
      </div>
      <div className="hp-card-main">
        <div className="hp-card-name">{h.name} <span className="hp-stars">{hpStars(h.stars)}</span></div>
        <div className="hp-card-addr">{h.addr}</div>
        <div className="hp-card-loc"><Icon name="mapPin" />{h.district}{h.metro != null ? ` · ${h.metro} м до метро` : ''}</div>
        <span className="hp-supplier"><Icon name="api" />{h.supplier}</span>
      </div>
      <div className="hp-card-rate">
        {h.rating != null && <div className="hp-rate-pill"><b>{h.rating}</b><span>{h.ratingText}</span></div>}
        {h.reviews != null && <div className="hp-rate-reviews">{h.reviews} отзывов</div>}
        <div className="hp-card-conds">
          {h.freeCancel && <span className="ok"><Icon name="check" />Бесплатная отмена<br /><i>до {h.freeCancel}</i></span>}
          <span><Icon name="bank" />{h.payAtHotel ? 'Оплата на месте' : 'Онлайн-оплата'}<br /><i>{h.payAtHotel ? 'без предоплаты' : 'предоплата'}</i></span>
        </div>
      </div>
      <div className="hp-card-price">
        <div className="hp-price-from">от</div>
        <div className="hp-price-val">{hpM(h.base, h.currency)}</div>
        <div className="hp-price-night">за выбранный период</div>
        <Button size="sm" onClick={() => onPick(h)}>Выбрать номер</Button>
        <button className="hp-more-link" onClick={() => onPick(h)}>Подробнее о номерах</button>
      </div>
    </div>
  );
}


function HotelFilters({ stars, toggleStar, starCounts, districts, distSel, toggleDist, onReset, query, setQuery }) {
  const selCount = Object.values(stars).filter(Boolean).length + Object.values(distSel).filter(Boolean).length + (query && query.trim() ? 1 : 0);
  return (
    <aside className="hp-filters">
      <div className="hp-filters-head">
        <span>Фильтры{selCount > 0 && <span className="flt-count">{selCount}</span>}</span>
        <button className="hp-reset" onClick={onReset}>Очистить</button>
      </div>


      <SearchBox value={query || ''} onChange={setQuery} placeholder="Поиск отелей" style={{ minWidth: 0, width: '100%', height: 42, margin: '4px 0 10px' }} />

      <div className="hp-filter-block">
        <div className="hp-filter-title">Звёзды</div>
        {[5, 4, 3, 2, 0].map((s) => (
          <label key={s} className="hp-check-row">
            <Checkbox on={!!stars[s]} onChange={() => toggleStar(s)} />
            <span className="hp-check-label">{s ? s + (s === 5 ? ' звёзд' : ' звезды') : 'Без звёзд'}</span>
            <span className="hp-check-cnt">{starCounts[s] || 0}</span>
          </label>
        ))}
      </div>

      <div className="hp-filter-block">
        <div className="hp-filter-title">Район</div>
        {districts.map((d) => (
          <label key={d} className="hp-check-row">
            <Checkbox on={!!distSel[d]} onChange={() => toggleDist(d)} />
            <span className="hp-check-label">{d}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}




function HotelPicker({ participants, group = false, onApply, onCancel }) {
  const toast = useToast();
  const PAX = Array.isArray(participants) ? participants : [];


  const [dest, setDest] = useState('');
  const [radius, setRadius] = useState('2 км');
  const [checkin, setCheckin] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [searchRooms, setSearchRooms] = useState(group ? Math.ceil(PAX.length / 2) : 1);
  const [searchGuests, setSearchGuests] = useState(group ? Math.max(1, PAX.length) : Math.max(1, Math.min(2, PAX.length)));
  const [meal, setMeal] = useState('BB');
  const [freeCancelOnly, setFreeCancelOnly] = useState(false);
  const [citizenship, setCitizenship] = useState('');
  const [paxPopOpen, setPaxPopOpen] = useState(false);


  const [stars, setStars] = useState({});
  const [distSel, setDistSel] = useState({});
  const [hotelQ, setHotelQ] = useState('');
  const [sort, setSort] = useState('rec');
  const [liveHotels, setLiveHotels] = useState([]);


  const [activeHotel, setActiveHotel] = useState(null);
  const [panel, setPanel] = useState(null);
  const [groupMode, setGroupMode] = useState(group);

  const [selRoom, setSelRoom] = useState(null);
  const [selTariff, setSelTariff] = useState(null);


  const [bedType, setBedType] = useState('double');
  const [mainGuest, setMainGuest] = useState(0);
  const [guestSel, setGuestSel] = useState({ 0: true, 1: true });
  const [specialReq, setSpecialReq] = useState('');


  const [roomGroups, setRoomGroups] = useState([]);
  const [editRoomId, setEditRoomId] = useState(null);
  const [addRoomOpen, setAddRoomOpen] = useState(false);


  const [supplierComment, setSupplierComment] = useState('');

  const nights = hpNights(checkin, checkout);


  const starCounts = liveHotels.reduce((a, h) => { a[h.stars] = (a[h.stars] || 0) + 1; return a; }, {});
  const anyStar = Object.values(stars).some(Boolean);
  const anyDist = Object.values(distSel).some(Boolean);
  const hq = hotelQ.trim().toLowerCase();
  let list = liveHotels.filter((h) => (!anyStar || stars[h.stars])
    && (!anyDist || distSel[h.district])
    && (!hq || `${h.name} ${h.district || ''} ${h.city || ''}`.toLowerCase().includes(hq))
    && (!freeCancelOnly || h.freeCancel));
  list = [...list].sort((a, b) => {
    if (sort === 'cheap') return a.base - b.base;
    if (sort === 'pricey') return b.base - a.base;
    if (sort === 'stars') return b.stars - a.stars;
    if (sort === 'rating') return b.rating - a.rating;
    return b.rating - a.rating;
  });
  const resetFilters = () => { setStars({}); setDistSel({}); setFreeCancelOnly(false); setHotelQ(''); };
  const runHotelSearch = async () => {
    if (!dest.trim() || !checkin || !checkout) { toast('Укажите локацию, даты заезда и выезда', 'err'); return; }
    try {
      const created = await servicesApi.search({
        kind: 'hotel',
        criteria: {
          location: dest,
          check_in: checkin?.toISOString().slice(0, 10),
          check_out: checkout?.toISOString().slice(0, 10),
          guests: searchGuests,
          rooms: searchRooms,
          meal_plan: meal,
          radius,
          currency: 'USD',
        },
      });
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const status = await servicesApi.searchStatus(created.search_id);
        if (['completed', 'partial', 'failed', 'cancelled'].includes(status.status)) {
          if (status.status === 'failed') throw new Error('Поставщики не вернули варианты гостиниц');
          const offers = resultsOf(await servicesApi.offers(created.search_id)).map((offer) => hotelOfferToUi(offer, { guests: searchGuests, rooms: searchRooms }));
          setLiveHotels(offers);
          toast(`Получено вариантов: ${offers.length}`, 'ok');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      throw new Error('Поиск занимает больше обычного. Повторите попытку.');
    } catch (error) {
      toast(error.message || 'Не удалось выполнить поиск гостиниц', 'err');
    }
  };
  const openHotel = (h) => {
    setActiveHotel(h);
    const r = h.rooms[0];
    setSelRoom(r);
    setSelTariff(r.tariffs[0]);
    setBedType(String(r.beds).toLowerCase().includes('twin') || String(r.beds).toLowerCase().includes('раздельн') ? 'twin' : 'double');
    setPanel('room');
  };
  const pickRoom = (r) => { setSelRoom(r); setSelTariff(r.tariffs[0]); setBedType(String(r.beds).toLowerCase().includes('twin') || String(r.beds).toLowerCase().includes('раздельн') ? 'twin' : 'double'); };


  const proceedFromRoom = (tariff) => {
    setSelTariff(tariff);
    if (groupMode) {
      if (!activeHotel.rooms.every((room) => room.cap != null)) {
        toast('Поставщик не передал вместимость номера — групповое размещение нельзя проверить', 'err');
        return;
      }

      const seeded = [];
      const cats = activeHotel.rooms;
      let idx = 0;
      for (let i = 0; i < PAX.length; i += 2) {
        const members = [i]; if (i + 1 < PAX.length) members.push(i + 1);
        const cat = i === 0 ? selRoom : cats[Math.min(idx % 3 + 1, cats.length - 1)];
        const bed = String(cat.beds).toLowerCase().includes('twin') || String(cat.beds).toLowerCase().includes('раздельн') ? 'twin' : 'double';
        seeded.push({ id: 'rg' + i, cat: cat.id, bed, members });
        idx++;
      }
      setRoomGroups(seeded);
      setPanel('group');
    } else {
      setPanel('pax');
    }
  };


  const catById = (id) => activeHotel ? (activeHotel.rooms.find((r) => r.id === id) || activeHotel.rooms[0]) : null;
  const accommodationTotal = !activeHotel ? 0 : Number(selTariff?.price || activeHotel.base || 0);

  const grandTotal = accommodationTotal;


  const conflicts = (() => {
    if (!activeHotel) return [];
    const out = [];
    const seen = {};
    roomGroups.forEach((g) => {
      const cap = catById(g.cat).cap;
      g.members.forEach((m, i) => {
        if (cap != null && i >= cap) out.push({ type: 'capacity', pax: m, room: g.id, desc: `В номере уже размещено ${cap} ${cap === 1 ? 'гость' : 'гостя'} — превышение вместимости.` });
        if (seen[m] != null) out.push({ type: 'multi', pax: m, room: g.id, desc: `Пассажир уже назначен в другой номер (№${seen[m] + 1}).` });
        else seen[m] = roomGroups.indexOf(g);
      });
    });
    PAX.forEach((_, i) => { if (seen[i] == null) out.push({ type: 'unassigned', pax: i, room: null, desc: 'Гость не размещён ни в одном номере.' }); });
    return out;
  })();
  const totalCap = roomGroups.reduce((s, g) => { const c = catById(g.cat); return s + (c?.cap || 0); }, 0);


  const buildOffer = (sub) => ({
    _backendOfferId: activeHotel._backendOfferId,
    title: activeHotel.name + ' · ' + activeHotel.stars + '★',
    sub,
    cost: grandTotal, fee: 0, supplier: activeHotel.supplier,
    info: [{ l: 'Заезд', v: fmtDate(checkin) }, { l: 'Выезд', v: fmtDate(checkout) }, { l: 'Ночей', v: nights }],
    tags: [selRoom.name, HOTEL_MEALS.find((x) => x.id === meal).full].filter(Boolean),
    currency: activeHotel.currency,
  });
  const finalizeSingle = () => {
    const sub = `${selRoom.name} · ${nights} ${nights === 1 ? 'ночь' : 'ночи'} · ${selTariff.name}`;
    onApply && onApply(buildOffer(sub));
    toast('Вариант гостиницы выбран', 'ok');
    closeAll();
  };
  const finalizeGroup = () => {
    const sub = `${roomGroups.length} номеров · ${PAX.length} гостей · ${nights} ${nights === 1 ? 'ночь' : 'ночи'}`;
    onApply && onApply(buildOffer(sub));
    toast('Групповой вариант гостиницы выбран', 'ok');
    closeAll();
  };
  const closeAll = () => { setPanel(null); setActiveHotel(null); setRoomGroups([]); setEditRoomId(null); setAddRoomOpen(false); };

  const guestsLabel = `${searchRooms} ${searchRooms === 0 ? 'номеров' : searchRooms === 1 ? 'номер' : 'номера'} для ${searchGuests} ${searchGuests === 1 ? 'гостя' : 'гостей'}`;

  return (
    <div className="fade-in hp-root">

      <div className="hp-searchbar">
        <div className="hp-search-row" style={{ rowGap: 26, marginBottom: 6 }}>
          <div className="hp-field hp-field-dest">
            <span className="hp-flabel">Локация или отель</span>
            <Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Название отеля, город, адрес, организация или достопримечательность" leadIcon="mapPin" />
            <span className="hp-fhint">Название отеля, адрес, организация, достопримечательность или точка на карте</span>
          </div>
          <div className="hp-field hp-field-radius">
            <span className="hp-flabel">Радиус</span>
            <Select options={HP_RADIUS_OPTS} value={radius} onChange={(e) => setRadius(e.target.value)} />
          </div>
          <div className="hp-field hp-field-date">
            <span className="hp-flabel">Заезд</span>
            <DateField value={checkin} onChange={setCheckin} />
          </div>
          <div className="hp-field hp-field-date">
            <span className="hp-flabel">Выезд</span>
            <DateField value={checkout} onChange={setCheckout} />
          </div>
          <div className="hp-field hp-field-guests">
            <span className="hp-flabel">Номера и гости</span>
            <div className="hp-guests-trigger" onClick={() => setPaxPopOpen((v) => !v)}>
              <div><b>{guestsLabel}</b></div>
              <Icon name="chevDown" />
            </div>
            {paxPopOpen && (
              <div className="hp-guests-pop">
                <div className="hp-stepper-row">
                  <span>Номера</span>
                  <div className="hp-stepper">
                    <button disabled={searchRooms <= 0} onClick={() => setSearchRooms((n) => Math.max(0, n - 1))}>−</button>
                    <b>{searchRooms}</b>
                    <button onClick={() => setSearchRooms((n) => n + 1)}>+</button>
                  </div>
                </div>
                <div className="hp-stepper-row">
                  <span>Гостей</span>
                  <div className="hp-stepper">
                    <button disabled={searchGuests <= 0} onClick={() => setSearchGuests((n) => Math.max(0, n - 1))}>−</button>
                    <b>{searchGuests}</b>
                    <button onClick={() => setSearchGuests((n) => n + 1)}>+</button>
                  </div>
                </div>
                <Button size="sm" style={{ width: '100%', marginTop: 8 }} onClick={() => setPaxPopOpen(false)}>Готово</Button>
              </div>
            )}
          </div>
          <Button icon="search" className="hp-find-btn" onClick={runHotelSearch}>Найти</Button>
        </div>

        <div className="hp-search-row hp-search-row-2">
          <div className="hp-meal-tabs">
            {HOTEL_MEALS.map((m) => (
              <button key={m.id} className={'hp-meal-tab' + (meal === m.id ? ' active' : '')} onClick={() => setMeal(m.id)} title={m.full}>{m.label}</button>
            ))}
          </div>
          <div className="hp-field hp-field-sm">
            <span className="hp-flabel">Гражданство гостей</span>
            <Select options={['Все', 'РФ', 'Кыргызстан', 'Казахстан', 'Другое']} value={citizenship || 'Все'} onChange={(e) => setCitizenship(e.target.value)} />
          </div>
          <label className="hp-inline-check">
            <Checkbox on={freeCancelOnly} onChange={() => setFreeCancelOnly((v) => !v)} />
            Бесплатная отмена
          </label>
          {PAX.length > 0 && <label className="hp-inline-check">
            <Checkbox on={groupMode} onChange={() => setGroupMode((v) => !v)} />
            Групповое размещение
          </label>}
        </div>
      </div>


      <div className="hp-results-head">
        <h3 className="hp-results-title">Результаты поиска <span>({list.length} вариантов)</span></h3>
        <div className="hp-results-tools">
          <div className="hp-sort">
            <span>Сортировка:</span>
            <ActionMenu
              trigger={<button className="hp-sort-btn"><span>{HP_SORT_LABEL[sort]}</span><Icon name="chevDown" /></button>}
              items={HP_SORT_OPTS.map(([k, l]) => ({ icon: sort === k ? 'check' : undefined, label: l, onClick: () => setSort(k) }))} />
          </div>
          <button className="hp-map-btn" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest)}`, '_blank', 'noopener,noreferrer')}><Icon name="mapPin" />Карта</button>
        </div>
      </div>

      <div className="hp-layout">
        <HotelFilters
          stars={stars} toggleStar={(s) => setStars((p) => ({ ...p, [s]: !p[s] }))} starCounts={starCounts}
          districts={[...new Set(liveHotels.map((hotel) => hotel.district).filter((district) => district && district !== '—'))]} distSel={distSel} toggleDist={(d) => setDistSel((p) => ({ ...p, [d]: !p[d] }))}
          query={hotelQ} setQuery={setHotelQ}
          onReset={resetFilters} />

        <div className="hp-results">
          {list.length ? list.map((h) => (
            <HotelResultCard key={h.id} h={h} onPick={openHotel} />
          )) : <EmptyState icon="building" title="Ничего не найдено" sub="Измените фильтры или параметры поиска" />}
        </div>
      </div>


      {panel === 'room' && activeHotel && (
        <RoomPanel hotel={activeHotel} selRoom={selRoom} selTariff={selTariff} onPickRoom={pickRoom}
          checkin={checkin} checkout={checkout} guestsLabel={guestsLabel} nights={nights}
          onClose={closeAll} onProceed={proceedFromRoom} groupMode={groupMode}
          onContact={async () => {
            try {
              const result = await servicesApi.revalidate(activeHotel._backendOfferId);
              toast(result.revalidation?.status === 'valid' ? 'Наличие и цена подтверждены поставщиком' : 'Ответ поставщика получен', 'ok');
            } catch (error) { toast(error.message, 'err'); }
          }} />
      )}

      {panel === 'pax' && activeHotel && (
        <PaxPlacementPanel hotel={activeHotel} room={selRoom} tariff={selTariff} pax={PAX} nights={nights}
          checkin={checkin} checkout={checkout}
          bedType={bedType} setBedType={setBedType} mainGuest={mainGuest} setMainGuest={setMainGuest}
          guestSel={guestSel} setGuestSel={setGuestSel} specialReq={specialReq} setSpecialReq={setSpecialReq}
          onClose={closeAll} onBack={() => setPanel('room')} onAdd={finalizeSingle} />
      )}

      {panel === 'group' && activeHotel && (
        <GroupAccommodationPanel hotel={activeHotel} pax={PAX} nights={nights} checkin={checkin} checkout={checkout}
          roomGroups={roomGroups} setRoomGroups={setRoomGroups} catById={catById} totalCap={totalCap}
          onAddRoom={() => setAddRoomOpen(true)} onEditRoom={(id) => setEditRoomId(id)}
          onClose={closeAll} onBack={() => setPanel('room')} onContinue={() => setPanel('matrix')} />
      )}

      {panel === 'matrix' && activeHotel && (
        <RoomingMatrixPanel hotel={activeHotel} pax={PAX} roomGroups={roomGroups} setRoomGroups={setRoomGroups}
          catById={catById} conflicts={conflicts} nights={nights} checkin={checkin} checkout={checkout}
          onEditRoom={(id) => setEditRoomId(id)} onConflicts={() => setPanel('conflicts')}
          onClose={closeAll} onBack={() => setPanel('group')} onContinue={() => setPanel('confirm')} />
      )}

      {panel === 'conflicts' && activeHotel && (
        <ConflictsPanel hotel={activeHotel} pax={PAX} roomGroups={roomGroups} setRoomGroups={setRoomGroups}
          catById={catById} conflicts={conflicts} nights={nights} checkin={checkin} checkout={checkout}
          onClose={closeAll} onBack={() => setPanel('matrix')} />
      )}

      {panel === 'confirm' && activeHotel && (
        <ConfirmPanel hotel={activeHotel} pax={PAX} roomGroups={roomGroups} catById={catById}
          nights={nights} checkin={checkin} checkout={checkout}
          accommodationTotal={accommodationTotal}
          grandTotal={grandTotal} meal={meal}
          supplierComment={supplierComment} setSupplierComment={setSupplierComment}
          onClose={closeAll} onBack={() => setPanel('matrix')} onBook={finalizeGroup} />
      )}


      {addRoomOpen && activeHotel && (
        <RoomGroupEditor title="Добавление номера" hotel={activeHotel}
          onClose={() => setAddRoomOpen(false)}
          onSave={(data) => { setRoomGroups((gs) => [...gs, { id: 'rg' + Date.now(), cat: data.cat, bed: data.bed, members: [] }]); setAddRoomOpen(false); toast('Номер добавлен', 'ok'); }} />
      )}
      {editRoomId && activeHotel && (() => {
        const g = roomGroups.find((x) => x.id === editRoomId);
        if (!g) return null;
        return <GroupCompositionEditor hotel={activeHotel} pax={PAX} roomGroups={roomGroups} group={g} catById={catById}
          onClose={() => setEditRoomId(null)}
          onSave={(members) => {
            setRoomGroups((gs) => gs.map((x) => x.id === g.id ? { ...x, members } : { ...x, members: x.members.filter((m) => !members.includes(m)) }));
            setEditRoomId(null);
          }}
          onRemove={() => { setRoomGroups((gs) => gs.filter((x) => x.id !== g.id)); setEditRoomId(null); }} />;
      })()}
    </div>
  );
}


function HotelPanelHead({ hotel, checkin, checkout, nights, guestsLabel, guests, rooms, onEdit }) {
  return (
    <div className="hp-panel-head">
      <div className={'hp-photo hp-photo-sm hp-photo-' + hotel.id} />
      <div className="hp-ph-info">
        <div className="hp-ph-name">{hotel.name} <span className="hp-stars">{hpStars(hotel.stars)}</span></div>
        <div className="hp-ph-addr">{hotel.addr}{hotel.metro != null ? ` · ${hotel.metro} м до метро` : ''}</div>
        <span className="hp-supplier"><Icon name="api" />{hotel.supplier}</span>
      </div>
      <div className="hp-ph-dates">
        <div><span>Заезд</span><b>{fmtDate(checkin)}</b></div>
        <div><span>Выезд</span><b>{fmtDate(checkout)}</b></div>
        <div><span>Ночей</span><b>{nights}</b></div>
        {guestsLabel != null && <div><span>Размещение</span><b>{guestsLabel}</b></div>}
        {guests != null && <div><span>Гостей</span><b>{guests}</b></div>}
        {rooms != null && <div><span>Номеров</span><b>{rooms}</b></div>}
        <button className="hp-edit-link" onClick={onEdit}>Изменить</button>
      </div>
    </div>
  );
}


function RoomPanel({ hotel, selRoom, selTariff, onPickRoom, checkin, checkout, guestsLabel, nights, onClose, onProceed, groupMode, onContact }) {
  const toast = useToast();
  return (
    <StackPanel title="Выбор номера" width="min(1240px,96vw)" onClose={onClose}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guestsLabel={guestsLabel} onEdit={onClose} />

      <div className="hp-room-grid">

        <div className="hp-room-col">
          <div className="hp-col-title">1. Выберите категорию номера</div>
          {hotel.rooms.map((r) => (
            <div key={r.id} className={'hp-roomcat' + (selRoom.id === r.id ? ' sel' : '')} onClick={() => onPickRoom(r)}>
              <div className="hp-rc-main">
                <div className="hp-rc-name">{r.name}</div>
                <div className="hp-rc-meta">{r.cap != null ? `до ${r.cap} ${r.cap === 1 ? 'гостя' : 'гостей'} · ` : ''}{r.beds}</div>
                {r.count != null && <div className="hp-rc-left">{r.count} {r.count === 1 ? 'номер' : 'номеров'}</div>}
              </div>
              <div className="hp-rc-price">{hpM(r.base, r.currency)}</div>
            </div>
          ))}
          <div className="hp-room-help"><button onClick={onContact}>Проверить наличие и цену у поставщика</button></div>
        </div>


        <div className="hp-room-col">
          <div className="hp-col-title">2. {selRoom.name}</div>
          <div className="hp-gallery">
            <div className={'hp-gallery-main hp-photo-' + hotel.id} />
          </div>
          <div className="hp-room-specs">
            {selRoom.area && <span><Icon name="grid" />{selRoom.area} м²</span>}
            {selRoom.floor && <span><Icon name="building" />Этаж {selRoom.floor}</span>}
            {selRoom.cap != null && <span><Icon name="users" />{selRoom.cap} гостя</span>}
            <span><Icon name="bed" />{selRoom.beds}</span>
          </div>
          <div className="hp-col-subtitle">Питание</div>
          <div className="hp-room-line"><Icon name="coffee" />{hotel.breakfast ? 'Питание включено по данным поставщика' : 'Питание не включено или не указано'}</div>
          <div className="hp-col-subtitle">Условия отмены</div>
          <div className="hp-room-line"><Icon name="docs" />{hotel.cancellation || (hotel.freeCancel ? `Бесплатная отмена до ${hotel.freeCancel}` : 'Поставщик не передал условия отмены')}</div>
          <div className="hp-col-subtitle">Условия оплаты</div>
          <div className="hp-room-line"><Icon name="bank" />{hotel.payAtHotel ? 'Оплата на месте' : 'Онлайн-оплата'}</div>
        </div>


        <div className="hp-room-col">
          <div className="hp-col-title">3. Доступные тарифы</div>
          <div className="hp-tariff-note">Цена поставщика за выбранный период</div>
          {selRoom.tariffs.map((t) => (
            <div key={t.id} className={'hp-tariff' + (selTariff.id === t.id ? ' sel' : '')} onClick={() => onPickRoom && undefined}>
              {t.badge && <span className="hp-tariff-badge">{t.badge}</span>}
              <div className="hp-tariff-price">{hpM(t.price, t.currency)}<small>за период</small></div>
              {t.feats.map((f, i) => (<div key={i} className={'hp-tariff-feat ' + (f.ok ? 'ok' : 'no')}><Icon name={f.ok ? 'check' : 'x'} />{f.t}</div>))}
              <Button size="sm" style={{ width: '100%', marginTop: 10 }} variant={selTariff.id === t.id ? 'primary' : 'secondary'}
                onClick={() => onProceed(t)}>{groupMode ? 'Выбрать и разместить' : 'Выбрать этот тариф'}</Button>
            </div>
          ))}
          <div className="hp-room-footnote">Состав цены и правила показываются только в объёме, который передал поставщик.</div>
        </div>
      </div>
    </StackPanel>
  );
}


function PaxPlacementPanel({ hotel, room, tariff, pax, nights, checkin, checkout, bedType, setBedType, mainGuest, setMainGuest, guestSel, setGuestSel, specialReq, setSpecialReq, onClose, onBack, onAdd }) {
  const selected = pax.map((_, i) => i).filter((i) => guestSel[i]);
  const cap = room.cap || pax.length;
  const toggleGuest = (i) => {
    if (guestSel[i]) { const n = { ...guestSel }; delete n[i]; setGuestSel(n); }
    else { if (selected.length >= cap) return; setGuestSel({ ...guestSel, [i]: true }); }
  };
  const total = tariff.price;
  return (
    <StackPanel title="Пассажиры и размещение" width="min(1180px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>Назад</Button>
        <div style={{ flex: 1 }} />
        <div className="hp-foot-total">Итого<b>{hpM(total, tariff.currency)}</b></div>
        <Button icon="check" onClick={onAdd}>Добавить в заказ</Button>
      </>}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guests={selected.length} rooms={1} onEdit={onBack} />

      <div className="hp-pax-grid">
        <div>
          <div className="hp-col-subtitle">1. Выбранный номер</div>
          <div className="hp-selroom-card">
            <div>
              <div className="hp-rc-name">{room.name}</div>
              <div className="hp-room-specs sm">
                {room.area && <span><Icon name="grid" />{room.area} м²</span>}{room.floor && <span><Icon name="building" />Этаж {room.floor}</span>}{room.cap != null && <span><Icon name="users" />{room.cap} гостя</span>}
              </div>
              <div className="hp-room-line sm"><Icon name="docs" />{hotel.cancellation || (hotel.freeCancel ? `Бесплатная отмена до ${hotel.freeCancel}` : 'Условия отмены не переданы')}</div>
            </div>
            <div className="hp-selroom-price"><span>Цена за период</span><b>{hpM(tariff.price, tariff.currency)}</b></div>
          </div>

          <div className="hp-col-subtitle">2. Тип размещения</div>
          <div className="hp-bed-opts">
            <label className={'hp-bed-opt' + (bedType === 'double' ? ' sel' : '')} onClick={() => setBedType('double')}>
              <Radio on={bedType === 'double'} onChange={() => setBedType('double')} />
              <span>1 двуспальная кровать</span><Icon name="bed" />
            </label>
            <label className={'hp-bed-opt' + (bedType === 'twin' ? ' sel' : '')} onClick={() => setBedType('twin')}>
              <Radio on={bedType === 'twin'} onChange={() => setBedType('twin')} />
              <span>2 раздельные кровати</span><Icon name="bed" />
            </label>
          </div>

          <div className="hp-col-subtitle">3. Гости номера</div>
          <div className="hp-hint">Выерите гостей, которые будут проживать в номере. Выбрано {selected.length}{room.cap != null ? ` из ${room.cap}` : ''}</div>
          <div className="hp-guest-list">
            {pax.map((p, i) => {
              const on = !!guestSel[i]; const dis = !on && selected.length >= cap;
              return (
                <label key={i} className={'hp-guest-row' + (on ? ' sel' : '') + (dis ? ' dis' : '')} onClick={() => !dis && toggleGuest(i)}>
                  <Checkbox on={on} onChange={() => {}} />
                  <Avatar name={p.name} size={32} />
                  <div className="hp-guest-info"><div className="nm">{p.name}</div><div className="mt">{p.docType || 'Паспорт'} {p.docNo || p.doc}</div></div>
                  <span className="hp-guest-role">{p.role}</span>
                </label>
              );
            })}
          </div>
          {room.cap != null && selected.length >= room.cap && <div className="hp-cap-note"><Icon name="alertCircle" />Максимальное размещение — {room.cap} гостя</div>}
        </div>

        <div>
          <div className="hp-col-subtitle">4. Основной гость</div>
          <div className="hp-hint">Укажите гостя, который будет основным при проживании</div>
          <div className="hp-main-guest">
            {selected.map((i) => (
              <label key={i} className={'hp-mg-row' + (mainGuest === i ? ' sel' : '')} onClick={() => setMainGuest(i)}>
                <Radio on={mainGuest === i} onChange={() => setMainGuest(i)} />
                <div><div className="nm">{pax[i].name}</div><div className="mt">{pax[i].dob ? pax[i].dob + ' · ' : ''}{pax[i].docType || 'Паспорт'} {pax[i].docNo || pax[i].doc}</div></div>
              </label>
            ))}
            {!selected.length && <div className="hp-hint">Сначала выберите гостей номера</div>}
          </div>

          <div className="hp-col-subtitle">5. Специальные пожелания <span className="hp-opt">(необязательно)</span></div>
          <textarea className="hp-textarea" rows={4} value={specialReq} onChange={(e) => setSpecialReq(e.target.value)}
            placeholder="Например: высокий этаж, ранний заезд, кровати рядом, тихий номер и т.д." />

          <div className="hp-summary">
            <div className="hp-sum-title">Итог размещения</div>
            <div className="hp-sum-row"><span>Номер</span><b>{room.name}</b></div>
            <div className="hp-sum-row"><span>Тип размещения</span><b>{bedType === 'double' ? '1 двуспальная кровать' : '2 раздельные кровати'}</b></div>
            <div className="hp-sum-row top"><span>Гости</span><b className="hp-sum-guests">{selected.map((i) => pax[i].name).join(', ') || '—'}</b></div>
            <div className="hp-sum-divider" />
            <div className="hp-sum-row"><span>Стоимость за период</span><b>{hpM(tariff.price, tariff.currency)}</b></div>
            <div className="hp-sum-row"><span>Количество ночей</span><b>{nights}</b></div>
            <div className="hp-sum-total"><span>Итого</span><b>{hpM(total, tariff.currency)}</b></div>
          </div>
          <div className="hp-room-footnote">Номер будет добавлен в заказ и забронирован после подтверждения.</div>
        </div>
      </div>
    </StackPanel>
  );
}


function GroupAccommodationPanel({ hotel, pax, nights, checkin, checkout, roomGroups, setRoomGroups, catById, totalCap, onAddRoom, onEditRoom, onClose, onBack, onContinue }) {
  const [q, setQ] = useState('');
  const assigned = new Set(roomGroups.flatMap((g) => g.members));
  const selectedGuests = pax.map((_, i) => i).filter((i) => assigned.has(i));
  const s = q.trim().toLowerCase();
  const shown = pax.map((p, i) => ({ p, i })).filter(({ p }) => !s || p.name.toLowerCase().includes(s));
  const allDistributed = selectedGuests.length === pax.length && totalCap >= pax.length;

  return (
    <StackPanel title="Создание групп проживания" width="min(1180px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>Назад</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="chevRight" iconRight="chevRight" onClick={onContinue}>Продолжить к размещению гостей</Button>
      </>}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guests={pax.length} rooms={roomGroups.length} onEdit={onBack} />

      <div className="hp-info-banner"><Icon name="alertCircle" />Создайте группы проживания и распределите гостей по номерам. Одна группа = один номер.</div>

      <div className="hp-group-grid">
        <div>
          <div className="hp-col-title">1. Гости для размещения</div>
          <div className="hp-hint">Выберите гостей, которых необходимо разместить</div>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск пассажира" />
          <div className="hp-selcount">Выбрано {selectedGuests.length} из {pax.length}<button onClick={() => setRoomGroups((gs) => gs.map((g) => ({ ...g, members: [] })))}>Очистить</button></div>
          <div className="hp-guest-list">
            {shown.map(({ p, i }) => {
              const on = assigned.has(i);
              const room = roomGroups.find((g) => g.members.includes(i));
              return (
                <div key={i} className={'hp-guest-row' + (on ? ' sel' : '')}>
                  <Checkbox on={on} onChange={() => {}} style={{ pointerEvents: 'none' }} />
                  <Avatar name={p.name} size={32} />
                  <div className="hp-guest-info"><div className="nm">{p.name}</div><div className="mt">{p.docType || 'Паспорт'} {p.docNo || p.doc}{room ? ' · ' + catById(room.cat).name : ''}</div></div>
                  <span className="hp-guest-role">{p.role}</span>
                </div>
              );
            })}
          </div>
          <div className="hp-cap-note info"><Icon name="alertCircle" />При необходимости вы сможете изменить состав групп позже в заказе.</div>
        </div>

        <div>
          <div className="hp-col-title">2. Группы проживания (номера)</div>
          <div className="hp-hint">Создайте группы проживания и укажите тип номера</div>
          <button className="hp-add-room" onClick={onAddRoom}><Icon name="plus" />Добавить группу</button>
          {roomGroups.map((g, idx) => {
            const cat = catById(g.cat);
            return (
              <div key={g.id} className="hp-roomgroup">
                <span className="hp-rg-num">{idx + 1}</span>
                <div className="hp-rg-main">
                  <div className="hp-rg-name">{cat.name}</div>
                  <div className="hp-rg-bed"><Icon name="bed" />{g.bed === 'double' ? '1 двуспальная кровать' : '2 раздельные кровати'}</div>
                </div>
                <span className={'hp-rg-count' + (g.members.length > cat.cap ? ' over' : '')}>{g.members.length} / {cat.cap} {cat.cap === 1 ? 'гость' : 'гостя'}</span>
                <button className="hp-rg-ic" onClick={() => onEditRoom(g.id)}><Icon name="edit" /></button>
                <button className="hp-rg-ic" onClick={() => setRoomGroups((gs) => gs.filter((x) => x.id !== g.id))}><Icon name="trash" /></button>
              </div>
            );
          })}
          <div className={'hp-distrib-note' + (allDistributed ? ' ok' : ' warn')}>
            <Icon name={allDistributed ? 'checkCircle' : 'alertCircle'} />
            {allDistributed
              ? `Все распределены. Суммарная вместимость номеров: ${totalCap} гостей`
              : `Распределено ${selectedGuests.length} из ${pax.length}. Вместимость номеров: ${totalCap} гостей`}
          </div>
        </div>
      </div>
    </StackPanel>
  );
}


function RoomingMatrixPanel({ hotel, pax, roomGroups, setRoomGroups, catById, conflicts, nights, checkin, checkout, onEditRoom, onConflicts, onClose, onBack, onContinue }) {
  const [q, setQ] = useState('');
  const memberRoom = (i) => roomGroups.findIndex((g) => g.members.includes(i));
  const assign = (paxIdx, roomId) => {
    setRoomGroups((gs) => gs.map((g) => {
      if (g.id === roomId) return g.members.includes(paxIdx) ? { ...g, members: g.members.filter((m) => m !== paxIdx) } : { ...g, members: [...g.members, paxIdx] };
      return { ...g, members: g.members.filter((m) => m !== paxIdx) };
    }));
  };
  const s = q.trim().toLowerCase();
  const rows = pax.map((p, i) => ({ p, i })).filter(({ p }) => !s || p.name.toLowerCase().includes(s));

  return (
    <StackPanel title="Матрица расселения" width="min(1240px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>Назад к группам</Button>
        <div style={{ flex: 1 }} />
        <Button icon="chevRight" onClick={onContinue}>К подтверждению</Button>
      </>}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guests={pax.length} rooms={roomGroups.length} onEdit={onBack} />

      <div className="hp-info-banner"><Icon name="alertCircle" />Матрица показывает размещение гостей по номерам. Нажимайте на ячейки, чтобы переместить гостя между номерами.</div>

      {conflicts.length > 0 && (
        <div className="hp-conflict-banner">
          <Icon name="alertCircle" />Обнаружено конфликтов: {conflicts.length}. Их необходимо решить перед бронированием.
          <button onClick={onConflicts}>Показать конфликты</button>
        </div>
      )}

      <div className="hp-matrix-tools">
        <SearchBox value={q} onChange={setQ} placeholder="Поиск по гостям" style={{ width: 240 }} />
        <span className="hp-matrix-count">Гостей: {pax.length} · Номеров: {roomGroups.length}</span>
      </div>

      <div className="hp-matrix-wrap">
        <table className="hp-matrix">
          <thead>
            <tr>
              <th className="hp-mx-corner">Гости ({pax.length})</th>
              {roomGroups.map((g, idx) => (
                <th key={g.id} className="hp-mx-room" onClick={() => onEditRoom(g.id)}>
                  <span className="hp-mx-roomno">№{idx + 1}</span>
                  <span className="hp-mx-roomname">{catById(g.cat).name}</span>
                  <span className="hp-mx-roomcap">{g.members.length}/{catById(g.cat).cap}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, i }) => {
              const homeRoom = memberRoom(i);
              return (
                <tr key={i}>
                  <td className="hp-mx-guest">
                    <Avatar name={p.name} size={28} />
                    <div><div className="nm">{p.name}</div><div className="mt">{homeRoom < 0 ? 'Не размещён' : 'Номер №' + (homeRoom + 1)}</div></div>
                  </td>
                  {roomGroups.map((g) => {
                    const here = g.members.includes(i);
                    const over = g.members.length > catById(g.cat).cap;
                    return (
                      <td key={g.id} className={'hp-mx-cell' + (here ? ' on' : '') + (here && over ? ' over' : '')} onClick={() => assign(i, g.id)}>
                        {here ? <span className="hp-mx-chip">{p.name.split(' ')[0]} {p.name.split(' ')[1] ? p.name.split(' ')[1][0] + '.' : ''}<Icon name="x" /></span> : <span className="hp-mx-plus">+</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StackPanel>
  );
}


function ConflictsPanel({ hotel, pax, roomGroups, setRoomGroups, catById, conflicts, nights, checkin, checkout, onClose, onBack }) {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const groups = {
    capacity: conflicts.filter((c) => c.type === 'capacity'),
    multi: conflicts.filter((c) => c.type === 'multi'),
    unassigned: conflicts.filter((c) => c.type === 'unassigned'),
  };
  const TABS = [
    ['all', 'Все конфликты', conflicts.length],
    ['capacity', 'Превышение вместимости', groups.capacity.length],
    ['multi', 'Назначен в несколько номеров', groups.multi.length],
    ['unassigned', 'Не размещены', groups.unassigned.length],
  ];
  const shown = tab === 'all' ? conflicts : groups[tab];
  const roomIdx = (id) => roomGroups.findIndex((g) => g.id === id);

  const resolve = (c) => {
    if (c.type === 'multi' || c.type === 'capacity') {

      setRoomGroups((gs) => {
        let removed = false;
        const cleaned = gs.map((g) => { if (g.members.includes(c.pax)) { removed = true; return { ...g, members: g.members.filter((m) => m !== c.pax) }; } return g; });
        const free = cleaned.find((g) => g.members.length < catById(g.cat).cap);
        return cleaned.map((g) => g === free ? { ...g, members: [...g.members, c.pax] } : g);
      });
    } else if (c.type === 'unassigned') {
      setRoomGroups((gs) => {
        const free = gs.find((g) => g.members.length < catById(g.cat).cap);
        return gs.map((g) => g === free ? { ...g, members: [...g.members, c.pax] } : g);
      });
    }
    toast('Конфликт решён', 'ok');
  };
  const resolveAll = () => { shown.forEach(resolve); };

  const conflictTitle = { capacity: 'Превышение вместимости', multi: 'Назначен в несколько номеров', unassigned: 'Гость не размещён' };

  return (
    <StackPanel title="Конфликты размещения" width="min(1100px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>К матрице</Button>
        <div style={{ flex: 1 }} />
        {shown.length > 0 && <Button variant="secondary" icon="zap" onClick={resolveAll}>Решить автоматически</Button>}
        <Button icon="check" disabled={conflicts.length > 0} onClick={onBack}>Готово</Button>
      </>}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guests={pax.length} rooms={roomGroups.length} onEdit={onBack} />

      {conflicts.length > 0
        ? <div className="hp-conflict-banner solid"><Icon name="alertCircle" />Обнаружены конфликты размещения, которые необходимо решить перед применением.</div>
        : <div className="hp-distrib-note ok"><Icon name="checkCircle" />Все конфликты решены. Размещение можно подтверждать.</div>}

      <div className="hp-conf-tabs">
        {TABS.map(([k, l, n]) => (
          <button key={k} className={'hp-conf-tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{l}{n > 0 && <span className="b">{n}</span>}</button>
        ))}
      </div>

      {shown.length === 0 ? <EmptyState icon="checkCircle" title="Конфликтов нет" sub="В этой категории всё в порядке" /> : (
        <div className="hp-conf-table">
          <div className="hp-conf-h"><span>Пассажир / Проблема</span><span>Назначение</span><span>Описание конфликта</span><span>Действие</span></div>
          {shown.map((c, idx) => {
            const ri = c.room != null ? roomIdx(c.room) : -1;
            return (
              <div key={idx} className="hp-conf-row">
                <div className="hp-conf-pax"><Avatar name={pax[c.pax].name} size={30} /><div><div className="nm">{pax[c.pax].name}</div><div className="mt">{pax[c.pax].docType || 'Паспорт'} {pax[c.pax].docNo || pax[c.pax].doc}</div></div></div>
                <div className="hp-conf-room">{ri >= 0 ? <><b>№{ri + 1} {catById(c.room).name}</b><span>{catById(c.room).cap} гостя</span></> : <span className="muted">—</span>}</div>
                <div className="hp-conf-desc"><span className={'hp-conf-tag ' + c.type}><Icon name="alertCircle" />{conflictTitle[c.type]}</span><div>{c.desc}</div></div>
                <div className="hp-conf-act"><Button size="sm" variant="secondary" icon="swap" onClick={() => resolve(c)}>Переназначить</Button></div>
              </div>
            );
          })}
        </div>
      )}
    </StackPanel>
  );
}


function ExtrasPanel({ hotel, pax, nights, checkin, checkout, roomsCount, extras, setExtras, extrasByCat, extrasTotal, extrasCount, hotelComment, setHotelComment, onClose, onBack, onContinue, groupMode }) {
  const [cat, setCat] = useState('stay');
  const defaultQty = (it) => it.per === 'guest' ? pax.length : it.per === 'room' ? roomsCount : 1;
  const setQty = (id, q) => setExtras((e) => { const n = { ...e }; if (q <= 0) delete n[id]; else n[id] = q; return n; });
  const toggle = (it) => { const cur = extras[it.id] || 0; setQty(it.id, cur > 0 ? 0 : defaultQty(it)); };
  const catTotal = (c) => HOTEL_EXTRAS.find((x) => x.cat === c).items.reduce((s, it) => s + (extras[it.id] || 0) * it.price, 0);
  const catCount = (c) => HOTEL_EXTRAS.find((x) => x.cat === c).items.filter((it) => (extras[it.id] || 0) > 0).length;
  const active = HOTEL_EXTRAS.find((c) => c.cat === cat);

  return (
    <StackPanel title="Дополнительные услуги" width="min(1240px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>Назад</Button>
        <div style={{ flex: 1 }} />
        <div className="hp-foot-total">Доп. услуги<b>{hpM(extrasTotal)}</b></div>
        <Button icon="check" onClick={onContinue}>{groupMode ? 'Добавить услуги и продолжить' : 'Применить услуги'}</Button>
      </>}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guests={pax.length} rooms={roomsCount} onEdit={onBack} />

      <div className="hp-extras-grid">

        <div className="hp-extras-nav">
          <div className="hp-col-subtitle" style={{ marginTop: 0 }}>Категории услуг</div>
          {HOTEL_EXTRAS.map((c) => (
            <button key={c.cat} className={'hp-extras-navitem' + (cat === c.cat ? ' active' : '')} onClick={() => setCat(c.cat)}>
              <Icon name={c.icon} />{c.label}
              {catCount(c.cat) > 0 && <span className="b">{catCount(c.cat)}</span>}
            </button>
          ))}
        </div>


        <div className="hp-extras-list">
          <div className="hp-extras-listhead">
            <span className="hp-extras-listtitle"><Icon name={active.icon} />{active.label}</span>
            <span className="hp-extras-listsub">{catCount(cat)} услуг на сумму {hpM(catTotal(cat))}</span>
          </div>
          {active.items.map((it) => {
            const qty = extras[it.id] || 0; const on = qty > 0;
            return (
              <div key={it.id} className={'hp-extra-row' + (on ? ' sel' : '')}>
                <Checkbox on={on} onChange={() => toggle(it)} />
                <div className="hp-extra-main" onClick={() => toggle(it)}>
                  <div className="hp-extra-name">{it.label}{it.note ? <span className="hp-extra-note"> · {it.note}</span> : ''}</div>
                  <div className="hp-extra-per">{it.per === 'guest' ? 'за гостя' : it.per === 'room' ? 'за номер' : 'за услугу'}</div>
                </div>
                <div className="hp-extra-price">{it.price ? hpM(it.price) : 'бесплатно'}</div>
                <div className={'hp-stepper sm' + (on ? '' : ' off')}>
                  <button disabled={!on} onClick={() => setQty(it.id, qty - 1)}>−</button>
                  <b>{qty}</b>
                  <button onClick={() => setQty(it.id, (qty || 0) + 1)}>+</button>
                </div>
              </div>
            );
          })}
          <div className="hp-col-subtitle">Комментарий для отеля</div>
          <textarea className="hp-textarea" rows={3} value={hotelComment} onChange={(e) => setHotelComment(e.target.value)}
            placeholder="Напишите ваши пожелания или особые запросы, которые мы передадим персоналу отеля" />
        </div>


        <div className="hp-extras-totals">
          <div className="hp-sum-title">Итог по услугам</div>
          {HOTEL_EXTRAS.map((c) => (
            <div key={c.cat} className="hp-sum-row"><span>{c.label}</span><b>{catTotal(c.cat) ? hpM(catTotal(c.cat)) : '—'}</b></div>
          ))}
          <div className="hp-sum-total"><span>Итого</span><b>{hpM(extrasTotal)}</b></div>
          <div className="hp-distrib-note ok"><Icon name="checkCircle" />Все выбранные услуги доступны на даты заезда.</div>
        </div>
      </div>
    </StackPanel>
  );
}


function ConfirmPanel({ hotel, pax, roomGroups, catById, nights, checkin, checkout, accommodationTotal, grandTotal, supplierComment, setSupplierComment, onClose, onBack, onBook }) {
  const [showRooms, setShowRooms] = useState(true);
  return (
    <StackPanel title="Подтверждение варианта гостиницы" width="min(1240px,96vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="chevLeft" onClick={onBack}>Назад</Button>
        <div style={{ flex: 1 }} />
        <div className="hp-foot-total big">Итого к оплате<b>{hpM(grandTotal, hotel.currency)}</b></div>
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={onBook}>Добавить в заказ</Button>
      </>}>
      <HotelPanelHead hotel={hotel} checkin={checkin} checkout={checkout} nights={nights} guests={pax.length} rooms={roomGroups.length} onEdit={onBack} />

      <div className="hp-confirm-grid">
        <div>
          <div className="hp-col-title">1. Размещение <span className="hp-opt">{roomGroups.length} номеров · {pax.length} гостей</span></div>
          <button className="hp-toggle-link" onClick={() => setShowRooms((v) => !v)}>{showRooms ? 'Скрыть' : 'Показать'} размещение по номерам<Icon name={showRooms ? 'chevUp' : 'chevDown'} /></button>
          {showRooms && (
            <div className="hp-confirm-rooms">
              {roomGroups.map((g, idx) => {
                const cat = catById(g.cat);
                return (
                  <div key={g.id} className="hp-confirm-room">
                    <span className="hp-cr-no">№{idx + 1}</span>
                    <span className="hp-cr-name">{cat.name}</span>
                    <span className="hp-cr-guests">{g.members.length} {g.members.length === 1 ? 'гость' : 'гостя'}</span>
                    <span className="hp-cr-bed">{g.bed === 'double' ? '1 двуспальная кровать' : '2 раздельные кровати'}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="hp-col-title">2. Контакты отеля</div>
          {hotel.phone && <div className="hp-contact"><Icon name="phone" />{hotel.phone}</div>}
          {hotel.email && <div className="hp-contact"><Icon name="mail" />{hotel.email}</div>}
          <div className="hp-contact"><Icon name="mapPin" />{hotel.addrFull}</div>

          <div className="hp-col-title">3. Комментарий для поставщика</div>
          <textarea className="hp-textarea" rows={3} value={supplierComment} onChange={(e) => setSupplierComment(e.target.value)}
            placeholder="Уточните важные пожелания или особые запросы для отеля" />
        </div>

        <div>
          <div className="hp-col-subtitle" style={{ marginTop: 0 }}>4. Стоимость</div>
          <div className="hp-summary">
            <div className="hp-sum-row"><span>Предложение поставщика · {nights} {nights === 1 ? 'ночь' : 'ночи'}</span><b>{hpM(accommodationTotal, hotel.currency)}</b></div>
            <div className="hp-sum-total"><span>Итого</span><b>{hpM(grandTotal, hotel.currency)}</b></div>
            <div className="hp-distrib-note"><Icon name="alertCircle" />Валюта поставщика: {hotel.currency}. Состав налогов и сборов не дополняется на фронте.</div>
          </div>

          <div className="hp-col-subtitle">5. Поставщик</div>
          <div className="hp-prov"><Icon name="api" /><div><b>{hotel.supplier}</b>{hotel.supplierId && <span>ID: {hotel.supplierId}</span>}</div></div>

          <div className="hp-col-subtitle">6. Условия</div>
          <div className="hp-cond-list">
            <div className="hp-cond"><span>Отмена</span><b>{hotel.cancellation || (hotel.freeCancel ? `бесплатно до ${hotel.freeCancel}` : 'не передано поставщиком')}</b></div>
            <div className="hp-cond"><span>Оплата</span><b>{hotel.payAtHotel ? 'Гарантия картой' : 'Онлайн'}</b></div>
          </div>
          <div className="hp-room-footnote">Перед добавлением в заказ backend повторно проверит актуальность предложения по правилам поставщика.</div>
        </div>
      </div>
    </StackPanel>
  );
}


function RoomGroupEditor({ title, hotel, onClose, onSave }) {
  const [cat, setCat] = useState(hotel.rooms[0].id);
  const [bed, setBed] = useState('double');
  return (
    <StackPanel title={title} width="min(560px,92vw)" onClose={onClose}
      footer={<><Button variant="secondary" style={{ flex: 1 }} onClick={onClose}>Отмена</Button>
        <Button style={{ flex: 1 }} icon="plus" onClick={() => onSave({ cat, bed })}>Добавить номер</Button></>}>
      <Field label="Категория номера">
        <Select options={hotel.rooms.map((r) => ({ value: r.id, label: `${r.name} · ${hpM(r.base, r.currency)}` }))} value={cat} onChange={(e) => setCat(e.target.value)} />
      </Field>
      <Field label="Тип кроватей">
        <div className="hp-bed-opts">
          <label className={'hp-bed-opt' + (bed === 'double' ? ' sel' : '')} onClick={() => setBed('double')}><Radio on={bed === 'double'} onChange={() => setBed('double')} /><span>1 двуспальная кровать</span><Icon name="bed" /></label>
          <label className={'hp-bed-opt' + (bed === 'twin' ? ' sel' : '')} onClick={() => setBed('twin')}><Radio on={bed === 'twin'} onChange={() => setBed('twin')} /><span>2 раздельные кровати</span><Icon name="bed" /></label>
        </div>
      </Field>
    </StackPanel>
  );
}


function GroupCompositionEditor({ hotel, pax, roomGroups, group, catById, onClose, onSave, onRemove }) {
  const [members, setMembers] = useState([...group.members]);
  const [q, setQ] = useState('');
  const cat = catById(group.cat);
  const otherRoomOf = (i) => roomGroups.find((g) => g.id !== group.id && g.members.includes(i));
  const toggle = (i) => setMembers((m) => m.includes(i) ? m.filter((x) => x !== i) : [...m, i]);
  const s = q.trim().toLowerCase();
  const list = pax.map((p, i) => ({ p, i })).filter(({ p }) => !s || p.name.toLowerCase().includes(s));
  return (
    <StackPanel title={'Изменение состава · ' + cat.name} width="min(900px,94vw)" onClose={onClose}
      footer={<>
        <Button variant="secondary" icon="trash" onClick={onRemove}>Удалить номер</Button>
        <div style={{ flex: 1 }} />
        <Button variant="secondary" onClick={onClose}>Отмена</Button>
        <Button icon="check" onClick={() => onSave(members)}>Сохранить</Button>
      </>}>
      <div className="hp-info-banner"><Icon name="alertCircle" />Выберите гостей для номера.{cat.cap != null && <> Вместимость: {cat.cap} {cat.cap === 1 ? 'гость' : 'гостя'}. {members.length > cat.cap && <b style={{ color: 'var(--red)' }}>Превышение вместимости!</b>}</>}</div>
      <div className="hp-group-grid">
        <div>
          <div className="hp-col-title">Гости для размещения</div>
          <SearchBox value={q} onChange={setQ} placeholder="Поиск пассажира" />
          <div className="hp-selcount">Выбрано {members.length} из {pax.length}</div>
          <div className="hp-guest-list">
            {list.map(({ p, i }) => { const other = otherRoomOf(i); return (
              <label key={i} className={'hp-guest-row' + (members.includes(i) ? ' sel' : '')} onClick={() => toggle(i)}>
                <Checkbox on={members.includes(i)} onChange={() => {}} />
                <Avatar name={p.name} size={32} />
                <div className="hp-guest-info"><div className="nm">{p.name}</div><div className="mt">{p.docType || 'Паспорт'} {p.docNo || p.doc}{other ? ' · в номере ' + catById(other.cat).name : ''}</div></div>
                <span className="hp-guest-role">{p.role}</span>
              </label>
            ); })}
          </div>
        </div>
        <div>
          <div className="hp-col-title">В номере «{cat.name}»</div>
          {members.length === 0 ? <div className="hp-hint">Пока никого не добавлено</div> : (
            <div className="hp-guest-list">
              {members.map((i) => (
                <div key={i} className="hp-guest-row sel">
                  <Avatar name={pax[i].name} size={32} />
                  <div className="hp-guest-info"><div className="nm">{pax[i].name}</div><div className="mt">{pax[i].docType || 'Паспорт'} {pax[i].docNo || pax[i].doc}</div></div>
                  <button className="hp-rg-ic" onClick={(e) => { e.stopPropagation(); toggle(i); }}><Icon name="x" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </StackPanel>
  );
}


function HotelsPage({ orders = [] }) {
  const toast = useToast();
  const [selectedOffer, setSelectedOffer] = useState(null);
  const attach = async (target) => {
    const order = target.order;
    if (!order?.id || !selectedOffer?._backendOfferId) return;
    try {
      await servicesApi.revalidate(selectedOffer._backendOfferId);
      await servicesApi.addToOrder(order.id, { offer_id: selectedOffer._backendOfferId });
      toast(`Гостиница добавлена в backend-заказ № ${order.no || order.number}`, 'ok');
      setSelectedOffer(null);
    } catch (error) { toast(error.message || 'Не удалось добавить гостиницу в заказ', 'err'); }
  };
  return (
    <>
      <Topbar title="Гостиницы" />
      <div className="content">
        <HotelPicker participants={[]} group={false}
          onApply={setSelectedOffer}
          onCancel={() => {}} />
      </div>
      {selectedOffer && <UnifiedBindPicker open title="Добавить гостиницу в заказ" sub={selectedOffer.title}
        modes={['order']} orderOptions={orders} onClose={() => setSelectedOffer(null)} onPick={attach} />}
    </>
  );
}

Object.assign(window, { HotelPicker, HotelsPage });



export { HP_SORT_OPTS, HP_SORT_LABEL, HP_RADIUS_OPTS, hpM, hpStars, hpNights, HotelResultCard, HotelFilters, HotelPicker, HotelPanelHead, RoomPanel, PaxPlacementPanel, GroupAccommodationPanel, RoomingMatrixPanel, ConflictsPanel, ConfirmPanel, RoomGroupEditor, GroupCompositionEditor, HotelsPage };
