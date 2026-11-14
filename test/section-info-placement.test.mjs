import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('next/dist/compiled/babel/core');
function files(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap((item) => item.isDirectory() ? files(`${dir}/${item.name}`) : item.name.endsWith('.jsx') ? [`${dir}/${item.name}`] : []); }
function elementName(node) { return node?.openingElement?.name?.name; }
test('every section information notice precedes the filters and working content', () => {
  let checked = 0;
  for (const file of files('src/modules')) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('<SectionInfo ')) continue;
    const ast = babel.parseSync(source, { filename: file, presets: ['next/babel'], configFile: false, babelrc: false });
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'JSXElement') {
        const children = node.children.filter((n) => !(n.type === 'JSXText' && !n.value.trim()));
        const notice = children.findIndex((n) => elementName(n) === 'SectionInfo');
        if (notice >= 0) { checked++; assert.equal(notice, 0, `${file}: section help should be first in its content container`); }
      }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value);
    }
    walk(ast);
  }
  assert.equal(checked, 24, 'all existing section help blocks were checked');
});
