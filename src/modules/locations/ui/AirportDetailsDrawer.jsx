import { AirportMap } from './AirportMap.jsx';
import React, { useEffect, useState } from 'react';
import { Drawer } from '../../../shared/ui/Overlays.jsx';
import { Button } from '../../../shared/ui/Button.jsx';
import { Icon } from '../../../shared/icons/index.jsx';
import { useToast } from '../../../shared/ui/Toast.jsx';

function safeWebsite(value) {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}

function countryFlag(country) {
  return /^[A-Z]{2}$/.test(country || '') ? String.fromCodePoint(...[...country].map((letter) => letter.charCodeAt(0) + 127397)) : null;
}

function AirportCode({ label, value, onCopy }) {
  return <button type="button" className="airport-code-card" onClick={() => onCopy(value)} aria-label={`Скопировать ${label}: ${value}`}>
    <span>{label}</span><strong>{value}<Icon name="copy" /></strong>
  </button>;
}

export function AirportDetailsDrawer({ code, fallback, onClose }) {
  const toast = useToast();
  const [state, setState] = useState({ loading: true, airport: null, error: '' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, airport: null, error: '' });
    fetch(`/api/airports?code=${encodeURIComponent(code)}`, { signal: controller.signal, cache: 'no-cache' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Не удалось загрузить аэропорт');
        setState({ loading: false, airport: payload, error: '' });
      }).catch((error) => {
        if (error.name !== 'AbortError') setState({ loading: false, airport: null, error: error.message });
      });
    return () => controller.abort();
  }, [code, retry]);
  const airport = state.airport;
  const country = fallback?.country || (airport?.countryCode ? new Intl.DisplayNames(['ru'], { type: 'region' }).of(airport.countryCode) : '');
  const city = airport?.cityRu || fallback?.city || airport?.city;
  const name = airport?.localName || fallback?.name || airport?.name || 'Аэропорт';
  const located = airport?.latitude != null && airport?.longitude != null;
  const website = safeWebsite(airport?.website);
  const websiteLabel = website ? new URL(website).hostname.replace(/^www\./, '') : '';
  const mapUrl = located ? `https://www.openstreetmap.org/?mlat=${airport.latitude}&mlon=${airport.longitude}#map=13/${airport.latitude}/${airport.longitude}` : null;
  const mapEmbed = located ? `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox: [airport.longitude - .055, airport.latitude - .035, airport.longitude + .055, airport.latitude + .035].map((value) => value.toFixed(6)).join(','), layer: 'mapnik', marker: `${airport.latitude},${airport.longitude}` })}` : null;
  const types = { large_airport: 'Крупный аэропорт', medium_airport: 'Средний аэропорт', small_airport: 'Малый аэропорт', heliport: 'Вертодром', seaplane_base: 'Гидроаэродром', balloonport: 'Аэростатная база' };
  const copy = async (value) => {
    try { await navigator.clipboard.writeText(value); toast('Скопировано: ' + value, 'ok'); }
    catch { toast('Не удалось скопировать. Выделите текст и скопируйте вручную.', 'err'); }
  };
  const contacts = airport?.contacts || [];
  const flag = countryFlag(airport?.countryCode);
  return <Drawer open title="Об аэропорте" onClose={onClose} width="min(760px, 100vw)" className="airport-panel"
    footer={<><span className="airport-footer-note"><Icon name="plane" />{code} · {name}</span><Button variant="secondary" onClick={onClose}>Готово</Button></>}>
    <section className="airport-hero" aria-label="Основная информация об аэропорте">
      <Icon name="plane" className="airport-hero-plane" />
      <div className="airport-hero-top"><span className="airport-country">{flag && <span className="airport-flag" aria-hidden="true">{flag}</span>}{country || 'Аэропорт'}</span>{types[airport?.type] && <span className="airport-type">{types[airport.type]}</span>}</div>
      <h2>{name}</h2>
      {airport?.name && airport.name !== name && <p className="airport-international-name">{airport.name}</p>}
      {city && <div className="airport-hero-city"><Icon name="mapPin" />{city}{airport?.regionCode ? <span> · {country}</span> : ''}</div>}
      <div className="airport-code-grid">
        <AirportCode label="IATA" value={code} onCopy={copy} />
        {airport?.icao && <AirportCode label="ICAO" value={airport.icao} onCopy={copy} />}
        {airport?.currentCode && airport.currentCode !== code && <AirportCode label="Актуальный IATA" value={airport.currentCode} onCopy={copy} />}
      </div>
    </section>

    {state.loading && <div role="status" className="airport-load-state"><span className="sk" /><span>Загружаем расположение и сведения об аэропорте…</span></div>}
    {state.error && <div className="airport-load-state" role="alert"><Icon name="alertCircle" /><span>{state.error}</span><Button variant="secondary" size="sm" onClick={() => setRetry((value) => value + 1)}>Повторить</Button></div>}

    {mapEmbed && <section className="airport-map-card" aria-label="Расположение аэропорта">
      <div className="airport-section-heading"><div><span className="airport-section-icon"><Icon name="mapPin" /></span><h3>Расположение</h3></div><a className="airport-text-link" href={mapUrl} target="_blank" rel="noopener noreferrer">Открыть карту <Icon name="arrowUpRight" /></a></div>
      <AirportMap airport={{ ...airport, code }} name={name} fallbackUrl={mapEmbed} />
      <div className="airport-map-caption"><div><span>{airport.address ? 'Адрес аэропорта' : 'Город и страна'}</span><p>{airport.address || [city, country].filter(Boolean).join(', ')}</p></div><button type="button" className="airport-coordinates" onClick={() => copy(`${airport.latitude.toFixed(5)}, ${airport.longitude.toFixed(5)}`)} aria-label="Скопировать координаты аэропорта"><span>{airport.latitude.toFixed(5)}, {airport.longitude.toFixed(5)}</span><Icon name="copy" /></button></div>
    </section>}

    {(website || contacts.length > 0) && <section className="airport-contact-card" aria-label="Контакты аэропорта">
      <div className="airport-section-heading"><div><span className="airport-section-icon"><Icon name="phone" /></span><h3>Связаться с аэропортом</h3></div>{airport?.contactsSourceUrl && <a className="airport-verified" href={airport.contactsSourceUrl} target="_blank" rel="noopener noreferrer"><Icon name="checkCircle" />Официальные контакты</a>}</div>
      <div className="airport-contact-grid">
        {contacts.map((contact) => <a className="airport-contact-item" href={contact.href} key={contact.href}><span className="airport-contact-icon"><Icon name={contact.kind === 'mail' ? 'mail' : 'phone'} /></span><div><span>{contact.label}</span><strong>{contact.value}</strong></div><Icon name="arrowUpRight" /></a>)}
        {website && <a className="airport-contact-item" href={website} target="_blank" rel="noopener noreferrer"><span className="airport-contact-icon"><Icon name="globe" /></span><div><span>Официальный сайт</span><strong>{websiteLabel}</strong></div><Icon name="arrowUpRight" /></a>}
      </div>
    </section>}

    {airport?.terminals?.length > 0 && <section className="airport-terminals-card" aria-label="Терминалы аэропорта"><div className="airport-section-heading"><div><span className="airport-section-icon"><Icon name="grid" /></span><h3>Терминалы</h3></div><span className="airport-type">Схемы аэропорта</span></div><div className="airport-terminal-links">{airport.terminals.map((terminal) => <a key={terminal.name} href={safeWebsite(terminal.url)} target="_blank" rel="noopener noreferrer">{terminal.name}<Icon name="arrowUpRight" /></a>)}</div></section>}
    {airport?.sourceUrl && <div className="airport-data-source"><Icon name="globe" /><span>Справочные данные: <a href={airport.sourceUrl} target="_blank" rel="noopener noreferrer">OurAirports</a>{airport.verifiedAt && ' · Контакты проверены ' + airport.verifiedAt.split('-').reverse().join('.')}</span></div>}
  </Drawer>;
}
