'use client';

import dynamic from 'next/dynamic';

const CRMApp = dynamic(() => import('../src/application/CRMApp'), { ssr: false });

export default function Page() {
  return (
    <div id="root">
      <CRMApp />
    </div>
  );
}
