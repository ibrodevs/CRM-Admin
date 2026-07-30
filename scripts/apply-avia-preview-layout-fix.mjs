import { readFile, writeFile } from 'node:fs/promises';

const editorUrl = new URL('../js/features/receipts/editor.jsx', import.meta.url);
let source = await readFile(editorUrl, 'utf8');
const before = "  if (type === 'Авиа') return <div className=\"receipt-preview receipt-preview-full\"><ReceiptAviaDocument draft={draft} /></div>;";
const after = "  if (type === 'Авиа') return <ReceiptAviaDocument draft={draft} />;";

if (source.includes(after)) {
  console.log('Авиа-предпросмотр уже полностью совпадает с бланком агентства.');
} else {
  if (!source.includes(before)) throw new Error('Не найден авиа-предпросмотр для выравнивания шаблона');
  source = source.replace(before, after);
  await writeFile(editorUrl, source, 'utf8');
  console.log('Убрана лишняя обёртка: авиа-предпросмотр полностью совпадает с бланком агентства.');
}

const cssUrl = new URL('../app/globals.css', import.meta.url);
let css = await readFile(cssUrl, 'utf8');
const marker = '/* aviation receipt live preview containment */';

if (css.includes(marker)) {
  console.log('Перекрытие нижних блоков авиа-предпросмотром уже устранено.');
} else {
  css += `

${marker}
.receipt-edit-preview{
  align-self:start;
  max-height:calc(100dvh - 190px);
  overflow-y:auto;
  overflow-x:hidden;
  overscroll-behavior:contain;
  scrollbar-gutter:stable;
  padding-right:5px;
  z-index:0;
}
.receipt-edit-preview .receipt-brand-document{
  min-width:0;
  padding:16px;
}
.receipt-edit-preview .receipt-brand-document>header{
  flex-wrap:wrap;
}
.receipt-edit-preview .receipt-brand-document>header>div:last-child{
  flex:1 1 100%;
  text-align:left;
}
.receipt-edit-preview .receipt-brand-meta,
.receipt-edit-preview .receipt-brand-passenger-grid,
.receipt-edit-preview .receipt-brand-segment-grid,
.receipt-edit-preview .receipt-brand-terms{
  grid-template-columns:repeat(2,minmax(0,1fr));
}
.receipt-edit-preview .receipt-brand-finance-groups{
  grid-template-columns:1fr;
}
.receipt-edit-preview .receipt-brand-meta>div,
.receipt-edit-preview .receipt-brand-passenger-grid>div,
.receipt-edit-preview .receipt-brand-segment-grid>div,
.receipt-edit-preview .receipt-brand-terms>div{
  min-width:0;
  overflow-wrap:anywhere;
}
@media(max-width:1000px){
  .receipt-edit-preview{
    position:static;
    top:auto;
    max-height:none;
    overflow:visible;
    padding-right:0;
    scrollbar-gutter:auto;
  }
}
@media(max-width:560px){
  .receipt-edit-preview .receipt-brand-meta,
  .receipt-edit-preview .receipt-brand-passenger-grid,
  .receipt-edit-preview .receipt-brand-segment-grid,
  .receipt-edit-preview .receipt-brand-terms{
    grid-template-columns:1fr;
  }
}
`;
  await writeFile(cssUrl, css, 'utf8');
  console.log('Авиа-предпросмотр ограничен по высоте и больше не перекрывает нижние блоки.');
}
