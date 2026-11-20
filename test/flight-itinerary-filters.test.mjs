import test from 'node:test';
import assert from 'node:assert/strict';
import { flightJourneys, matchesFlightFilters, flightCarriers } from '../src/modules/services/flights/itinerary.js';
const offer={airline:'SU',supplier:'ttbooking',fare:100,fee:10,baggage:'1PC',refundable:false,itinerary:{segments:[
 {origin:'SVO',destination:'IST',airline:'SU',flight_number:'100',journey_index:0},
 {origin:'IST',destination:'DXB',airline:'TK',flight_number:'200',journey_index:0},
 {origin:'DXB',destination:'SVO',airline:'SU',flight_number:'101',journey_index:1},
]}};
test('connections and return journeys remain distinct',()=>{
 assert.deepEqual(flightJourneys(offer).map(j=>j.length),[2,1]);
 assert.equal(matchesFlightFilters(offer,{stops:['0']}),false);
 assert.equal(matchesFlightFilters(offer,{stops:['1']}),true);
 assert.deepEqual(flightCarriers(offer),['SU','TK']);
});
test('airline, flight, supplier, baggage, refund and price filters affect all segments',()=>{
 assert.equal(matchesFlightFilters(offer,{air:['TK'],flightNo:'TK 200',priceMax:110}),true);
 assert.equal(matchesFlightFilters(offer,{air:['DP']}),false);
 assert.equal(matchesFlightFilters(offer,{sup:['other']}),false);
 assert.equal(matchesFlightFilters(offer,{flightNo:'SU 999'}),false);
 assert.equal(matchesFlightFilters(offer,{priceMax:109}),false);
 assert.equal(matchesFlightFilters({...offer,baggage:'—'},{bagOnly:true}),false);
 assert.equal(matchesFlightFilters(offer,{refundOnly:true}),false);
});
test('old offers split at requested city endpoints, never count the return as a connection',()=>{
 const old={...offer,itinerary:{segments:offer.itinerary.segments.map(({journey_index,...s})=>s)}};
 assert.deepEqual(flightJourneys(old,{trip:'rt',from:'city:MOW',to:'DXB'}).map(j=>j.length),[2,1]);
});

test('live offers aggregate connections and retain local airport clocks',async()=>{
 const {liveFlightOffer}=await import('../src/modules/services/flights/live-flight-offer.js');
 const data=liveFlightOffer({...offer,price:{amount:'110',currency:'RUB'},fare:{refundable:'false'},itinerary:{segments:[
  {...offer.itinerary.segments[0],departure:'2026-12-01T23:30:00+03:00',arrival:'2026-12-02T02:30:00+03:00'},
  {...offer.itinerary.segments[1],departure:'2026-12-02T04:00:00+03:00',arrival:'2026-12-02T09:00:00+04:00'},
 ]}});
 assert.equal(data.out.stops,1);assert.equal(data.out.to,'DXB');
 assert.equal(data.out.dep,'23:30');assert.equal(data.out.arr,'09:00');
 assert.equal(data.refundable,false);assert.equal(data.out.layovers.length,1);
});
