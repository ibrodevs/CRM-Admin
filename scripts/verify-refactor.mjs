import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parse, root, sourceFiles, traverse } from './lib/architecture.mjs';

// Migration audit, intentionally separate from npm test: future product work may change behavior.
const base = process.argv[2] || 'e4b5e7a';
const git = (...args) => execFileSync('git', ['-c', 'core.quotepath=false', ...args], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
const original = (file) => git('show', `${base}:${file}`);
const aliases = {
  clientsApi: 'crmApi', companiesApi: 'crmApi', serviceFeeApi: 'crmApi',
  dashboardApi: 'workspaceApi', calendarFeedApi: 'workspaceApi', proposalListApi: 'workspaceApi',
  documentListApi: 'workspaceApi', returnListApi: 'workspaceApi', financeOverviewApi: 'workspaceApi',
  transactionListApi: 'workspaceApi', userListApi: 'workspaceApi', workspaceInfoApi: 'workspaceApi',
};
const ignored = new Set(['start', 'end', 'loc', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens']);
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => !ignored.has(key)).map((key) => [
    key, normalize(value.type === 'Identifier' && key === 'name' ? aliases[value[key]] || value[key] : value[key]),
  ]));
}
const hash = (value) => crypto.createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
const parseSource = (source) => parse(source, { sourceType: 'module', plugins: ['jsx'] });

function records(source, file) {
  const ast = parseSource(source), result = [];
  const add = (node, name) => result.push({ file, name, hash: hash(node) });
  for (let node of ast.program.body) {
    if (['ImportDeclaration', 'ExportAllDeclaration'].includes(node.type)) continue;
    if (node.type.startsWith('Export')) {
      if (!node.declaration) continue;
      node = node.declaration;
    }
    if (node.type === 'FunctionDeclaration') {
      if (file === 'js/app.jsx' && ['App', 'CRMRoot'].includes(node.id.name)) {
        // Root composition changes are covered by routing/provider tests and browser comparisons.
        // Its extracted handlers, state initializers, page JSX and effects must still match exactly.
        if (node.id.name === 'App') for (const statement of node.body.body) {
          if (statement.type === 'VariableDeclaration') for (const declaration of statement.declarations) {
            if (!['workspace', 'gatedPage'].includes(declaration.id.name)) add(declaration, `App.${declaration.id.name || '<state>'}`);
          }
          if (statement.type === 'ExpressionStatement') add(statement, 'App.<effect>');
        }
        continue;
      }
      if (node.id.name === 'AuthProvider') {
        node = structuredClone(node);
        node.params[0].properties = node.params[0].properties.filter((property) => property.key.name !== 'syncLegacyCurrentUser');
      }
      add(node, node.id.name);
    } else if (node.type === 'VariableDeclaration') {
      for (const declaration of node.declarations) {
        if (['crmApi', 'workspaceApi'].includes(declaration.id.name)) {
          for (const property of declaration.init.properties) add(property, `${declaration.id.name}.${property.key.name}`);
        } else add(declaration, declaration.id.name || '<declaration>');
      }
    } else add(node, '<initialization>');
  }
  return result;
}

const originals = git('ls-tree', '-r', '--name-only', base, 'js', 'app/api').trim().split('\n').filter((file) => /\.(jsx?|mjs)$/.test(file));
const expected = originals.flatMap((file) => records(original(file), file));
const actual = new Set();
for (const file of [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'app/api'))]) {
  const source = fs.readFileSync(file, 'utf8');
  for (const record of records(source, file)) actual.add(record.hash);
  traverse(parseSource(source), {
    VariableDeclarator(p) { actual.add(hash(p.node)); },
    ExpressionStatement(p) { actual.add(hash(p.node)); },
    ObjectProperty(p) { if (file.includes('/api/')) actual.add(hash(p.node)); },
  });
}
const missing = expected.filter((record) => !actual.has(record.hash));
assert.deepEqual(missing, [], 'Original declarations, handlers, JSX, calculations and API properties must survive extraction');

const parts = ['tokens.css', 'base.css', 'layout.css', 'components.css'];
assert.equal(parts.map((name) => fs.readFileSync(path.join(root, 'src/styles', name), 'utf8')).join(''), original('app/globals.css'));
const styles = {
  'receipt-ui-fixes.css': 'modules', 'receipt-workflow.css': 'modules', 'receipt-select-fix.css': 'modules',
  'location-autocomplete.css': 'components', 'compact-steppers.css': 'components',
};
for (const [name, folder] of Object.entries(styles)) {
  assert.equal(fs.readFileSync(path.join(root, 'src/styles', folder, name), 'utf8'), original(`app/${name}`));
}
const assets = git('ls-tree', '-r', '--name-only', base, 'public', 'image').trim().split('\n').filter(Boolean);
for (const asset of assets) {
  const before = execFileSync('git', ['show', `${base}:${asset}`], { cwd: root, maxBuffer: 20 * 1024 * 1024 });
  assert.ok(before.equals(fs.readFileSync(path.join(root, asset))), `Asset changed: ${asset}`);
}
console.log(JSON.stringify({ base, preservedSourceContracts: expected.length, identicalStylesheets: 6, identicalAssets: assets.length }, null, 2));
