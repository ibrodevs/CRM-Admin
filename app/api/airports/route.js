import { NextResponse } from 'next/server';
import { airportDirectory, lookupAirport } from '../../../src/modules/locations/server/airport-directory.js';

export async function GET(request) {
  const code = String(new URL(request.url).searchParams.get('code') || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return NextResponse.json({ error: 'Некорректный код аэропорта' }, { status: 400 });
  try {
    const airports = await airportDirectory();
    const airport = lookupAirport(airports, code);
    if (!airport) return NextResponse.json({ error: 'Аэропорт не найден в справочнике' }, { status: 404 });
    return NextResponse.json(airport, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить справочник аэропортов' }, { status: 502 });
  }
}
