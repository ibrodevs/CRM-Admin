import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require=createRequire(import.meta.url), babel=require('next/dist/compiled/babel/core');
test('PIN recovery defers requests while locked and preserves loaded forms during refresh',async()=>{
  let auth={status:'authenticated',locked:true}, cursor=0, requests=0, release;
  const cells=[], React=require('react'), react={...React,useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return[cells[i],v=>{cells[i]=typeof v==='function'?v(cells[i]):v;}];},useCallback:fn=>fn,useMemo:fn=>fn(),useEffect(){}};
  const api=new Proxy({}, {get:()=>async()=>{requests++;if(release)await release;return{results:[]};}});
  const bindings=new Proxy({}, {get:(_,name)=>name.endsWith('Api')?api:(v=>v)});
  const filename=new URL('../src/legacy/compatibility/workspace-provider.jsx',import.meta.url).pathname, mod=new Module(filename);
  mod.require=name=>name==='react'?react:!name.startsWith('.')?require(name):name.includes('auth-context')?{useAuth:()=>auth}:name.includes('workspace/context')?{WorkspaceContext:React.createContext(null)}:name.includes('client.js')?{resultsOf:v=>v?.results||[],resourceStatusFromError:()=> 'error'}:bindings;
  mod._compile(babel.transformSync(readFileSync(filename,'utf8'),{filename,presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,filename);
  const render=()=>{cursor=0;return mod.exports.WorkspaceProvider({children:'working form'}).props.value;};
  await render().reload();assert.equal(requests,0);
  auth={...auth,locked:false};await render().reload();assert.ok(requests>0);assert.equal(render().resources.orders.status,'empty');
  let finish;release=new Promise(r=>{finish=r;});const loading=render().reload();assert.equal(render().resources.orders.status,'empty','loaded page stays mounted during recovery');finish();await loading;
  auth={...auth,locked:true};const before=requests;await render().reload();assert.equal(requests,before);assert.equal(render().resources.orders.status,'empty','locking keeps loaded data');
});
