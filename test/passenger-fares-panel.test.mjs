import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire,Module} from 'node:module';
import {readFileSync} from 'node:fs';
import {freeFlightDraft,freeFlightFareOptions,freeFlightLocalPassengers,searchFreeFlightOffers} from '../src/modules/services/flights/free-flight-search.js';
import {liveFlightOffer} from '../src/modules/services/flights/live-flight-offer.js';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
const nodes=n=>Array.isArray(n)?n.flatMap(nodes):n?.props?[n,...nodes(n.props.children)]:[];
test('four adults receive distinct real individual quotes and CRM assignments without booking',async()=>{
 const segments=[{origin:'SVO',destination:'LED',departure:'2026-12-01T12:00:00',arrival:'2026-12-01T13:30:00',airline:'SU',flight_number:'100',journey_index:0}];
 const raw=Array.from({length:4},(_,i)=>({id:'offer-'+i,provider:'provider-1',provider_adapter:'ttbooking',itinerary:{segments},price:{amount:String(1000+i*100),currency:'RUB'},fare:{booking_class:'Y'}}));
 const original={...liveFlightOffer({...raw[0],id:'group',price:{amount:'4000',currency:'RUB'}}),backendOffer:{...raw[0],provider:'provider-1'}};
 const people=Array.from({length:4},(_,i)=>({id:'person-'+i,surname:'Пассажир',given_name:String(i+1)}));
 let cursor=0,effects=[],added,criteria;
 const cells=[],ran=new Set();
 const useState=initial=>{const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],next=>cells[i]=typeof next==='function'?next(cells[i]):next];};
 const useRef=initial=>{const i=cursor++;return cells[i]||=( {current:initial} );};
 const useEffect=fn=>{const i=cursor++;if(!ran.has(i)){ran.add(i);effects.push(fn);}};
 const bindings={useState,useRef,useEffect,freeFlightDraft,freeFlightFareOptions,freeFlightLocalPassengers,searchFreeFlightOffers,liveFlightOffer,formatMoney:n=>String(n),resultsOf:p=>p.results||p,setTimeout:fn=>{fn();return 1;},clearTimeout(){},servicesApi:{async search(payload){criteria=payload.criteria;return{search_id:'individual'};},async searchStatus(){return{status:'completed'};},async offers(){return{count:4,results:raw};}},clientsApi:{async persons(){return{results:people};}},...Object.fromEntries(['StackPanel','Button','Field','Select','SearchBox','InfoNotice'].map(n=>[n,n]))};
 const source=readFileSync(new URL('../src/modules/services/flights/PassengerFaresPanel.jsx',import.meta.url),'utf8'),ast=babel.parseSync(source,{filename:'PassengerFaresPanel.jsx',presets:['next/babel'],configFile:false,babelrc:false}),fn=ast.program.body.find(n=>n.type==='ExportNamedDeclaration'&&n.declaration?.id?.name==='PassengerFaresPanel').declaration;
 const m=new Module(import.meta.filename);m.require=n=>n==='bindings'?bindings:require(n);m._compile(babel.transformSync(`import {${Object.keys(bindings)}} from 'bindings';${source.slice(fn.start,fn.end)};export {PassengerFaresPanel};`,{filename:'Panel.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
 const params={trip:'ow',from:'SVO',to:'LED',depDate:new Date('2026-12-01T00:00:00'),pax:{adt:4,chd:0,infNoSeat:0,infSeat:0},cabin:'Эконом'};
 const render=()=>{cursor=0;return m.exports.PassengerFaresPanel({offer:original,params,onClose(){},onAdd:value=>added=value});};
 render();effects.forEach(fn=>fn());await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(criteria.passengers,1,'individual price must come from a new one-person search');
 for(let i=0;i<4;i++){
  let selects=nodes(render()).filter(n=>n.type==='Select');
  selects[i*2].props.onChange({target:{value:'person-'+i}});
  selects=nodes(render()).filter(n=>n.type==='Select');
  selects[i*2+1].props.onChange({target:{value:'offer-'+i}});
 }
 const footer=render().props.footer;
 const button=nodes(footer).find(n=>n.type==='Button');
 assert.equal(button.props.disabled,false);button.props.onClick();
 assert.equal(added.length,4);
 assert.deepEqual(added.map(s=>s.cost),[1000,1100,1200,1300]);
 assert.deepEqual(added.map(s=>s.flightPersonIds[0]),people.map(p=>p.id));
 assert.ok(added.every(s=>s.searchCriteria.passengers===1));
});
