import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAirportDirectory, lookupAirport } from '../src/modules/locations/server/airport-directory.js';

const header='ident,type,name,latitude_deg,longitude_deg,iso_country,iso_region,municipality,gps_code,iata_code,home_link,icao_code,elevation_ft';
test('directory parses quoted commas, quotes, multiline names, and zero coordinates', () => {
  const airports=parseAirportDirectory(header+'\r\nTEST,large_airport,"Airport, \\"International\\"",0,0,KG,KG-C,"City\nDistrict",UAFM,BSZ,https://example.com,UAFM,2000'.replace(/\\"/g,'""'));
  const airport=airports.get('BSZ');
  assert.equal(airport.name,'Airport, "International"');
  assert.equal(airport.city,'City\nDistrict');
  assert.equal(airport.latitude,0);
  assert.equal(airport.longitude,0);
  assert.equal(airport.icao,'UAFM');
});
test('closed airports, unknown codes, and invalid coordinates are handled explicitly', () => {
  const airports=parseAirportDirectory(header+'\nONE,closed,Closed,1,1,US,US-TX,City,,OLD,,,\nTWO,small_airport,Active,999,999,US,US-TX,City,,NEW,,,');
  assert.equal(lookupAirport(airports,'OLD'),null);
  assert.equal(lookupAirport(airports,'ZZZ'),null);
  assert.equal(lookupAirport(airports,'NEW').latitude,null);
});
test('legacy FRU resolves to Manas with its current IATA code', () => {
  const airports=parseAirportDirectory(header+'\nUAFM,large_airport,Manas,43,74,KG,KG-C,Bishkek,UAFM,BSZ,https://example.com,UAFM,2000');
  assert.equal(lookupAirport(airports,'FRU').code,'FRU');
  assert.equal(lookupAirport(airports,'FRU').currentCode,'BSZ');
  assert.equal(lookupAirport(airports,'FRU').name,'Manas');
});
