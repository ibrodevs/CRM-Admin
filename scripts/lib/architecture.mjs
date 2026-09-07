import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const { parse } = require('next/dist/compiled/babel/parser');
export const traverse = require('next/dist/compiled/babel/traverse').default;
export const root = fileURLToPath(new URL('../../', import.meta.url));
export const relative = (file) => path.relative(root, file).split(path.sep).join('/');

export function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.(jsx?|mjs)$/.test(entry.name) ? [file] : [];
  });
}

export function resolveImport(file, reference) {
  const target = path.resolve(path.dirname(file), reference);
  return [target, `${target}.js`, `${target}.jsx`, `${target}/index.js`, `${target}/index.jsx`]
    .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

export function dependencyGraph() {
  const edges = [], unresolved = [];
  for (const file of [...sourceFiles(path.join(root, 'src')), ...sourceFiles(path.join(root, 'app'))]) {
    const ast = parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    const references = [];
    traverse(ast, {
      ImportDeclaration(p) { references.push(p.node.source.value); },
      ExportNamedDeclaration(p) { if (p.node.source) references.push(p.node.source.value); },
      ExportAllDeclaration(p) { references.push(p.node.source.value); },
      CallExpression(p) {
        if (p.node.callee.type === 'Import' && p.node.arguments[0]?.value) references.push(p.node.arguments[0].value);
      },
    });
    for (const reference of references.filter((value) => value.startsWith('.'))) {
      const target = resolveImport(file, reference);
      if (target) edges.push([relative(file), relative(target)]);
      else unresolved.push([relative(file), reference]);
    }
  }
  return { edges, unresolved };
}

export function dependencyCycles(edges) {
  const graph = new Map();
  for (const [from, to] of edges) {
    if (!graph.has(from)) graph.set(from, new Set());
    graph.get(from).add(to);
  }
  let nextIndex = 0;
  const indices = new Map(), low = new Map(), stack = [], active = new Set(), cycles = [];
  function visit(node) {
    indices.set(node, nextIndex);
    low.set(node, nextIndex++);
    stack.push(node);
    active.add(node);
    for (const target of graph.get(node) || []) {
      if (!indices.has(target)) {
        visit(target);
        low.set(node, Math.min(low.get(node), low.get(target)));
      } else if (active.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)));
    }
    if (low.get(node) === indices.get(node)) {
      const members = [];
      let member;
      do {
        member = stack.pop();
        active.delete(member);
        members.push(member);
      } while (member !== node);
      if (members.length > 1 || graph.get(node)?.has(node)) cycles.push(members.sort());
    }
  }
  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return cycles;
}

export function architectureViolations(edges) {
  const domain = (file) => file.match(/^src\/modules\/([^/]+)\//)?.[1];
  return edges.filter(([from, to]) => (
    (from.startsWith('src/shared/') && !to.startsWith('src/shared/'))
    || (domain(from) && to.startsWith('src/application/'))
    || (domain(from) && domain(to) && domain(from) !== domain(to) && !/^src\/modules\/[^/]+\/(index|api|model)\.js$/.test(to))
    || (/^src\/(application|modules|shared|legacy)\//.test(from) && to.startsWith('src/server/'))
    || (from.startsWith('src/server/') && /^src\/(application|modules|legacy)\//.test(to))
    || to.startsWith('js/')
  ));
}
