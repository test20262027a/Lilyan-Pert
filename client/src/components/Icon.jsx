/*
 * Icon set. Icons are stroke-only and never mirrored, except the explicit
 * directional ones (arrow/chevron) which flip under RTL via .icon--dir.
 */
const PATHS = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  book: <><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /></>,
  receipt: <><path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z" /><path d="M9 8h6M9 12h6" /></>,
  qr: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3h-3zM20 14v2M20 20h1M14 20h3" /></>,
  star: <path d="m12 3.5 2.7 5.6 6.1.85-4.4 4.3 1.05 6.1L12 17.5l-5.45 2.85L7.6 14.25 3.2 9.95l6.1-.85z" />,
  megaphone: <><path d="M4 10v4a1 1 0 0 0 1 1h2l7 4V5L7 9H5a1 1 0 0 0-1 1z" /><path d="M18 9.5a3.5 3.5 0 0 1 0 5" /></>,
  database: <><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.66 3.58 3 8 3s8-1.34 8-3V6" /><path d="M4 12v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" /></>,
  users: <><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 20v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13A4 4 0 0 1 16 11" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20.5 20.5-4.2-4.2" /></>,
  trash: <><path d="M3 6h18" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  close: <><path d="M18 6 6 18M6 6l12 12" /></>,
  check: <><path d="m20 6-11 11L4 12" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  arrowLeft: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  print: <><path d="M6 9V2h12v7" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M6 14h12v8H6z" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="1.6" /><path d="m21 15-5-5L5 21" /></>,
  tag: <><path d="M20.6 13.4 12.4 21.6a2 2 0 0 1-2.8 0l-8-8A2 2 0 0 1 1 12.2V4a2 2 0 0 1 2-2h8.2a2 2 0 0 1 1.4.6l8 8a2 2 0 0 1 0 2.8z" /><circle cx="7" cy="7" r="1.4" /></>,
  percent: <><path d="M19 5 5 19" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></>,
  phone: <path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.7 2 2 0 0 1 3.1 1.5h2.6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6.8 9.2a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />,
  mail: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 6 10-6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3A5 5 0 0 0 13.5 3.5l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3A5 5 0 0 0 10.5 20.5l1.7-1.7" /></>,
  coffee: <><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M3 8h15v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" /><path d="M6 2v3M10 2v3M14 2v3" /></>,
  utensils: <><path d="M4 3v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2V3" /><path d="M7 12v9" /><path d="M17 3c-1.5 1.5-2 3-2 5s.5 3 2 3 2-1 2-3-.5-3.5-2-5z" /><path d="M17 11v10" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  alert: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  palette: <><circle cx="12" cy="12" r="9" /><circle cx="9" cy="9.5" r="1.2" /><circle cx="15" cy="9.5" r="1.2" /><circle cx="9.5" cy="15" r="1.2" /><circle cx="15" cy="15" r="1.2" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  filter: <path d="M22 3H2l8 9.5V19l4 2v-8.5z" />,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></>,
  cart: <><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.4 12.3a2 2 0 0 0 2 1.7h8.6a2 2 0 0 0 2-1.6L21.5 7H6" /></>,
  eye: <><path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  layers: <><path d="m12 2 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>,
  sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="m6.3 6.3 2.1 2.1M15.6 15.6l2.1 2.1M17.7 6.3l-2.1 2.1M8.4 15.6l-2.1 2.1" /></>,
  chart: <><path d="M3 20h18" /><rect x="5" y="11" width="3.5" height="6" rx="1" /><rect x="10.2" y="7" width="3.5" height="10" rx="1" /><rect x="15.5" y="13" width="3.5" height="4" rx="1" /></>,
  chartBars: <path d="M5.5 20V11M12 20V4.5M18.5 20v-6.5" />,
  store: <><path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" /><path d="M3 6.5 4.6 3h14.8L21 6.5a2.5 2.5 0 0 1-4.5 1.5 2.5 2.5 0 0 1-4.5 0 2.5 2.5 0 0 1-4.5 0A2.5 2.5 0 0 1 3 6.5z" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" /><path d="M3 3.5V9h5.5" /><path d="M12 8v4.2l3 1.8" /></>,
  sliders: <><path d="M4 7h9M19 7h1M4 17h3M13 17h7" /><circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /></>,
  type: <><path d="M5 7V4.5h14V7" /><path d="M12 4.5V19" /><path d="M9 19h6" /></>,
  wallet: <><rect x="2" y="6" width="20" height="14" rx="2" /><path d="M2 10h20" /><circle cx="17" cy="15" r="1.3" /></>,
  table: <><rect x="3" y="4" width="18" height="6" rx="1.5" /><path d="M6 10v9M18 10v9M4 19h16" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m10.8 12.2 8-8M17 3l4 4-2 2-4-4z" /></>,
  wifi: <><path d="M2 8.8a16 16 0 0 1 20 0" /><path d="M5.5 12.4a11 11 0 0 1 13 0" /><path d="M9 16a6 6 0 0 1 6 0" /><circle cx="12" cy="19.5" r=".8" /></>,
  home: <><path d="m3 10.6 9-7.6 9 7.6" /><path d="M5.5 9.4V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.4" /><path d="M10 21v-5.5h4V21" /></>,
  wrench: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7.5h.01M15 7.5h.01M9 11.5h.01M15 11.5h.01M9 15.5h.01M15 15.5h.01" /><path d="M10 21v-3h4v3" /></>,
  clipboard: <><rect x="6" y="4" width="12" height="17" rx="2" /><path d="M9.5 4V3h5v1" /><path d="M9.5 9.5h5M9.5 13h5M9.5 16.5h3" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8.4 12.4 2.6 2.6 4.6-5.2" /></>,
  xCircle: <><circle cx="12" cy="12" r="9" /><path d="m9.6 9.6 4.8 4.8M14.4 9.6l-4.8 4.8" /></>,
  chefHat: <><path d="M6 13.9A4 4 0 0 1 7.4 6a5.1 5.1 0 0 1 1.1-1.5 5 5 0 0 1 7 0A5.1 5.1 0 0 1 16.6 6 4 4 0 0 1 18 13.9V21H6z" /><path d="M6 17h12" /></>,
  package: <><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /><path d="m7.5 4.3 9 5.1" /></>,
  crown: <><path d="M3 8l3.4 2.6L12 4.5l5.6 6.1L21 8l-1.6 8.5H4.6z" /><path d="M5.5 20h13" /></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.7V17c0 .6-.5 1-1 1.2-1.2.5-2 2-2 3.8" /><path d="M14 14.7V17c0 .6.5 1 1 1.2 1.2.5 2 2 2 3.8" /><path d="M18 2H6v7a6 6 0 0 0 12 0z" /></>,
  trendUp: <><path d="M22 7 13.5 15.5l-5-5L2 17" /><path d="M16 7h6v6" /></>,
  bulb: <><path d="M9 18h6" /><path d="M10 21.5h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.4.9 1 .9 1.7V17h5.4v-1.5c0-.7.3-1.3.9-1.7A6 6 0 0 0 12 3z" /></>,
  banknote: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.4" /><path d="M6 12h.01M18 12h.01" /></>,
  volume: <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="M15.5 8.6a5 5 0 0 1 0 6.8" /><path d="M18.6 5.4a9 9 0 0 1 0 13.2" /></>,
  volumeOff: <><path d="M11 5 6 9H3v6h3l5 4z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>,
  chevronsUp: <><path d="m7 14 5-5 5 5" /><path d="m7 20 5-5 5 5" /></>,
  chevronsLeft: <><path d="m11 7-5 5 5 5" /><path d="m17 7-5 5 5 5" /></>,
};

export default function Icon({ name, size = 18, className = '', style, title }) {
  const path = PATHS[name] || PATHS.info;
  const directional = [
    'chevronRight',
    'chevronLeft',
    'arrowLeft',
    'arrowRight',
    'chevronsLeft',
  ].includes(name);
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${directional ? 'icon--dir' : ''} ${className}`}
      style={style}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}
