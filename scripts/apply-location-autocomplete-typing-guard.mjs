import { readFile, writeFile } from 'node:fs/promises';

const uiUrl = new URL('../js/ui.jsx', import.meta.url);
let source = await readFile(uiUrl, 'utf8');

if (!source.includes('function LocationAutocomplete(props)')) {
  throw new Error('Автокомплит локаций не найден до применения защиты открытия.');
}

const replacements = [
  {
    from: `  const [chosen, setChosen] = useState(null);\n  const rootRef = useRef(null);`,
    to: `  const [chosen, setChosen] = useState(null);\n  const [hasTyped, setHasTyped] = useState(false);\n  const rootRef = useRef(null);`,
  },
  {
    from: `    if (query.length < 2 || selectedIsCurrent) {`,
    to: `    if (!hasTyped || query.length < 2 || selectedIsCurrent) {`,
  },
  {
    from: `  }, [text, locationScope, selectedIsCurrent]);`,
    to: `  }, [text, locationScope, selectedIsCurrent, hasTyped]);`,
  },
  {
    from: `    setChosen(option);\n    setOptions([]);`,
    to: `    setChosen(option);\n    setHasTyped(false);\n    setOptions([]);`,
  },
  {
    from: `  const handleChange = (event) => {\n    setChosen(null);`,
    to: `  const handleChange = (event) => {\n    setChosen(null);\n    setHasTyped(true);`,
  },
  {
    from: `        if (text.trim().length >= 2 && !selectedIsCurrent) setOpen(true);`,
    to: `        if (hasTyped && text.trim().length >= 2 && !selectedIsCurrent) setOpen(true);`,
  },
  {
    from: `      {open && text.trim().length >= 2 && (`,
    to: `      {open && hasTyped && text.trim().length >= 2 && (`,
  },
];

let changed = false;
for (const { from, to } of replacements) {
  if (source.includes(to)) continue;
  if (!source.includes(from)) {
    throw new Error('Не удалось применить защиту автокомплита: изменился ожидаемый фрагмент UI.');
  }
  source = source.replace(from, to);
  changed = true;
}

if (changed) await writeFile(uiUrl, source, 'utf8');

const ready = source.includes('const [hasTyped, setHasTyped] = useState(false);')
  && source.includes('if (!hasTyped || query.length < 2 || selectedIsCurrent)')
  && source.includes('{open && hasTyped && text.trim().length >= 2 && (');

if (!ready) throw new Error('Не удалось подтвердить открытие подсказок только после ввода.');
console.log(changed
  ? 'Подсказки локаций теперь открываются только после ввода текста пользователем.'
  : 'Защита автокомплита от открытия при входе уже применена.');
