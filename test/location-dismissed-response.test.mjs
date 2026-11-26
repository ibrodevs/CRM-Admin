import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire,Module } from 'node:module';
const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
test('a delayed city lookup updates results without reopening the dismissed menu',async()=>{
 const source=readFileSync(new URL('../src/shared/ui/Input.jsx',import.meta.url),'utf8');
 const ast=babel.parseSync(source,{filename:'Input.jsx',presets:['next/babel'],configFile:false,babelrc:false});
 const fn=ast.program.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name==='LocationAutocomplete');
 const state=[],refs=[],effects=[];let si=0,ri=0,timer;
 const bindings={useState:initial=>{const i=si++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=typeof v==='function'?v(state[i]):v;}]},useRef:()=>{const i=ri++;return refs[i]||=( {current:null});},useEffect:effect=>effects.push(effect),useRecentLocations:()=>[[],()=>{}],containsFloatingTarget:()=>false,Icon:'Icon',FloatingPanel:'FloatingPanel',setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{},AbortController,fetch:async()=>({ok:true,json:async()=>({results:[{title:'Москва'}]})})};
 const mod=new Module(import.meta.filename);mod.require=n=>n==='bindings'?bindings:require(n);
 mod._compile(babel.transformSync(`import React from 'react';import {${Object.keys(bindings)}} from 'bindings';${source.slice(fn.start,fn.end)};export {LocationAutocomplete};`,{filename:'lookup.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
 const render=()=>{si=0;ri=0;effects.length=0;return mod.exports.LocationAutocomplete({value:'Москва',onChange(){}});};
 render();state[0]=true;state[5]=true;render();effects[1]();assert.ok(timer);
 // The operator dismisses the menu while the network request is still pending.
 state[0]=false;await timer();assert.equal(state[0],false);assert.equal(state[2][0].title,'Москва');
});
