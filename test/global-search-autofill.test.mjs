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
const input=tree=>tree.find(node=>node.type==='input');
const change=(control,value,inputType,autofilled=false)=>{const target={value,matches:()=>autofilled};control.props.onChange({currentTarget:target,target,nativeEvent:{inputType}});return target;};

test('credential autofill and replacement events never become a global search query',()=>{
  const render=harness();let control=input(render());
  assert.equal(render().find(node=>node.type==='form').props.autoComplete,'off');
  const auto=change(control,'admin@example.test',undefined);
  assert.equal(auto.value,'');assert.equal(input(render()).props.value,'');
  control=input(render());
  control.props.onBeforeInput({nativeEvent:{inputType:'insertReplacementText'}});
  assert.equal(change(control,'admin@example.test','insertReplacementText').value,'');
  assert.equal(input(render()).props.value,'');
  assert.ok(!render().find(node=>node.props.className==='gsearch-pop scroll'));
});

test('typing and deliberate paste still allow searching for an email; autofill restores that query',()=>{
  const render=harness();let control=input(render());
  control.props.onKeyDown({key:'a'});change(control,'a');
  assert.equal(input(render()).props.value,'a');
  control=input(render());control.props.onPaste();change(control,'client@example.test','insertFromPaste');
  assert.equal(input(render()).props.value,'client@example.test');
  control=input(render());
  assert.equal(change(control,'admin@example.test','insertReplacementText',true).value,'client@example.test');
  assert.equal(input(render()).props.value,'client@example.test');
  const target={value:'admin@example.test'};
  control.props.onAnimationStart({animationName:'crm-search-autofill',currentTarget:target});
  assert.equal(target.value,'client@example.test');
  change(input(render()),'');assert.equal(input(render()).props.value,'');
});

test('mobile text input and IME are accepted without a physical keyboard event',()=>{
  const render=harness();let control=input(render());
  control.props.onBeforeInput({nativeEvent:{type:'textInput',data:'И'}});change(control,'И');
  assert.equal(input(render()).props.value,'И');
  change(input(render()),'Иван','insertCompositionText');assert.equal(input(render()).props.value,'Иван');
});
