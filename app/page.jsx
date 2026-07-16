'use client';

import dynamic from 'next/dynamic';

// Приложение целиком клиентское (глобальные хранилища на window, порталы,
// html2canvas и т.п.), поэтому рендерим без SSR — ровно как раньше.
const CRMApp = dynamic(() => import('../js/app'), { ssr: false });

export default function Page() {
  // div#root сохранён: на него завязаны стили оболочки (zoom, размеры) в globals.css
  return (
    <div id="root">
      <CRMApp />
    </div>
  );
}
