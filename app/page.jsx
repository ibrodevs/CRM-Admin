'use client';

import dynamic from 'next/dynamic';

const CRMApp = dynamic(() => import('../js/app'), { ssr: false });
const LegacyBackendBridge = dynamic(() => import('../js/core/legacy-backend-bridge'), { ssr: false });

export default function Page() {
  return (
    <div id="root">
      <LegacyBackendBridge />
      <CRMApp />
    </div>
  );
}
