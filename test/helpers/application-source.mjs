import { readFile } from 'node:fs/promises';
export const applicationSource = (await Promise.all(['CRMApp.jsx', 'routing/RouteRenderer.jsx', 'routing/useAppNavigation.js', 'model/useOrderActions.js', 'shell/DesktopNotifier.jsx', 'shell/GlobalOverlays.jsx', 'routing/WorkspaceResourceGate.jsx'].map(path => readFile(new URL('../../src/application/' + path, import.meta.url), 'utf8')))).join('\n');
