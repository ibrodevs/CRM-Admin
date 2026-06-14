// ===== Icon library (Lucide-style, stroke-based) =====
const ICON_PATHS = {
  home: '<path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/>',
  orders: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  suppliers: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 9l3 3-3 3"/><path d="M14 15h3"/>',
  route: '<circle cx="12" cy="12" r="9"/><path d="M12 12 12 3"/><path d="M12 12l6 4"/>',
  chat: '<rect x="3" y="4" width="18" height="13" rx="2.5"/><path d="M3 8h18"/><path d="M8 4v13"/>',
  finance: '<path d="M12 2v20"/><path d="M17 6.5c0-2-2.2-3-5-3s-5 1-5 3 2.2 2.6 5 3 5 1.2 5 3.2-2.2 3-5 3-5-1-5-3"/>',
  docs: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.4"/>',
  settings: '<path d="M12 4 5 8v8l7 4 7-4V8l-7-4Z"/><path d="M5 8l7 4 7-4M12 12v8"/>',
  calc: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 7h8"/><path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.4M18 19c0-2.2-.9-3.9-2.3-5"/>',
  lock: '<rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>',
  chevRight: '<path d="m9 6 6 6-6 6"/>',
  chevLeft: '<path d="m15 6-6 6 6 6"/>',
  chevUp: '<path d="m6 15 6-6 6 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash: '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  share: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.7 7.4-4.3M8.3 13.3l7.4 4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5h.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
  phone: '<path d="M5 4h3l2 5-2 1.5a11 11 0 0 0 5 5L17 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6.5 0 10 7 10 7a17 17 0 0 1-3 3.6M6.5 7.6A17 17 0 0 0 2 13s3.5 7 10 7a9.7 9.7 0 0 0 4-.9"/><path d="M9.5 10.5a3 3 0 0 0 4 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6-2 8-2 8h16s-2-2-2-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z"/>',
  paperclip: '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5"/>',
  more: '<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>',
  pie: '<path d="M12 3v9l7.5 4.3A9 9 0 1 0 12 3Z"/><path d="M12 3a9 9 0 0 1 7.5 13.3"/>',
  api: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9v6M11 9v6M11 9a2 2 0 0 1 0 4H7"/><path d="M15 15l2-6 2 6M15.5 13h3"/>',
  sla: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="18" cy="9" r="3.4"/><path d="M18 7.6V9l1 .8"/>',
  contacts: '<circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><path d="M16 8h5M16 12h5M16 16h3"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8" cy="11" r="2"/><path d="M5.5 16c.4-1.3 1.4-2 2.5-2s2.1.7 2.5 2M14 9h4M14 12h4M14 15h2.5"/>',
  bank: '<path d="M5 9h14M4 9l8-5 8 5M6 9v8M10 9v8M14 9v8M18 9v8M3 21h18"/>',
  download: '<path d="M12 4v11m0 0 4-4m-4 4-4-4M4 20h16"/>',
  loader: '<path d="M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowUpRight: '<path d="M7 17 17 7M9 7h8v8"/>',
  inbox: '<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 6h14l2 6v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z"/>',
  star: '<path d="m12 3 2.6 5.6 6 .7-4.4 4.2 1.2 6L12 17l-5.4 2.5 1.2-6L3.4 9.3l6-.7Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9h17M8 3v4M16 3v4"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-3h4v3"/>',
  template: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M9 9v12"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
};

function Icon({ name, className, style, strokeWidth = 1.9 }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] || '' }} />
  );
}

// Brand mark (isometric package — blue)
function BrandMark({ size = 26, color = '#2566ff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
      <path d="M12 2 21 7v10l-9 5-9-5V7l9-5Z" />
      <path d="M3 7l9 5 9-5M12 12v10" />
    </svg>
  );
}

Object.assign(window, { Icon, BrandMark, ICON_PATHS });
