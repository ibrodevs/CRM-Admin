import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import { readFileSync } from 'node:fs';
const require=createRequire(import.meta.url), React=require('react'), babel=require('next/dist/compiled/babel/core');
const nodes=node=>Array.isArray(node)?node.flatMap(nodes):node?.props?[node,...nodes(node.props.children)]:[];
function harness() {
  const cells=[];let cursor=0;
  const react={...React,useEffect(){},useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return[cells[i],v=>{cells[i]=typeof v==='function'?v(cells[i]):v;}];},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i];}};
  const mod=new Module(import.meta.filename);
  mod.require=name=>name==='react'?react:!name.startsWith('.')?require(name):name.includes('icons')?{Icon:'Icon'}:name.includes('workspace/api')?{workspaceInfoApi:{globalSearch:async()=>({results:[]})}}:{};
  mod._compile(babel.transformSync(readFileSync(new URL('../src/application/shell/GlobalSearch.jsx',import.meta.url),'utf8'),{filename:'GlobalSearch.jsx',presets:['next/babel'],configFile:false,babelrc:false,envName:'test'}).code,import.meta.filename);
  return()=>{cursor=0;return nodes(mod.exports.GlobalSearch({}));};
}
const input=tree=>tree.find(node=>node.type==='textarea');
const change=(control,value)=>control.props.onChange({currentTarget:{value}});

test('global search is a single-line searchbox outside username/password input heuristics',()=>{
  const render=harness();const tree=render(),control=input(tree);
  assert.ok(control);
  assert.equal(tree.some(node=>node.type==='input'),false);
  assert.equal(control.props.role,'searchbox');
  assert.equal(control.props['aria-multiline'],'false');
  assert.equal(control.props.rows,1);
  assert.equal(control.props.wrap,'off');
  assert.equal(control.props.autoComplete,'off');
  assert.equal(control.props.value,'');
});

test('typing, email paste, mobile and IME text remain searchable; multiline paste stays single-line',()=>{
  const render=harness();
  for(const value of ['И','Иван','client@example.test','']){
    change(input(render()),value);
    assert.equal(input(render()).props.value,value);
  }
  change(input(render()),'Иван\r\nПетров');
  assert.equal(input(render()).props.value,'Иван Петров');
});

test('Enter cannot insert a new line, IME confirmation is preserved and Escape closes results',()=>{
  const render=harness();change(input(render()),'Иван');
  let prevented=false;
  input(render()).props.onKeyDown({key:'Enter',nativeEvent:{isComposing:false},preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  prevented=false;
  input(render()).props.onKeyDown({key:'Enter',nativeEvent:{isComposing:true},preventDefault(){prevented=true;}});
  assert.equal(prevented,false);
  input(render()).props.onKeyDown({key:'Escape',preventDefault(){}});
  assert.equal(render().some(node=>node.props.className==='gsearch-pop scroll'),false);
});
