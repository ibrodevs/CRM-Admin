'use client';

import dynamic from 'next/dynamic';

const CRMApp = dynamic(() => import('../js/app'), { ssr: false });

export default function Page() {
  return (
    <div id="root">
      <CRMApp />
    </div>
  );
}
