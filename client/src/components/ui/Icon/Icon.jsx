import './Icon.css';

const PATHS = {
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></>,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5 5 19" />,
  heart: <path d="M12 20s-7.5-4.6-9.2-9.4C1.7 7.4 3.8 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.2 0 5.3 2.9 4.2 6.1C19.5 15.4 12 20 12 20Z" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowLeft: <path d="M20 12H4m6-6-6 6 6 6" />,
  arrowRight: <path d="M4 12h16m-6-6 6 6-6 6" />,
  eye: <><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.6c.5-.1.9-.1 1.4-.1 6.4 0 10 6.5 10 6.5a17 17 0 0 1-3.1 3.8M6.3 6.6C3.6 8.4 2 12 2 12s3.6 6.5 10 6.5c1.6 0 3-.4 4.2-1" /><path d="M9.9 10a2.8 2.8 0 0 0 4 4" /></>,
  upload: <><path d="M12 15V3m-5 5 5-5 5 5" /><path d="M4 15v5h16v-5" /></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M4 17v3h16v-3" /></>,
  file: <><path d="M6 2.5h8l4.5 4.5v14.5H6Z" /><path d="M14 2.5V7h4.5" /></>,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" /></>,
  zoom: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></>,
  chat: <><path d="M4 5h16v11H9l-5 4Z" /><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth="2.2" /></>,
  pencil: <path d="M15.5 4.5 19.5 8.5 8 20H4v-4Z" />,
  trash: <><path d="M4 6.5h16M9 6.5V4h6v2.5M6.5 6.5l1 14h9l1-14" /><path d="M10 10.5v6M14 10.5v6" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  plus: <path d="M12 4v16M4 12h16" />,
  minus: <path d="M4 12h16" />,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4.2-6 8-6s7 2 8 6" /></>,
  logout: <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></>,
  frame: <><rect x="4" y="3" width="16" height="18" /><rect x="7" y="6" width="10" height="12" /></>,
  image: <><rect x="3" y="4" width="18" height="16" /><path d="m3 17 5-5 4 4 3-3 6 6" /><circle cx="15.5" cy="8.5" r="1.5" /></>,
  send: <path d="M4 12h16m-6-6 6 6-6 6" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5h.01" /></>,
  alert: <><path d="M12 3 2 20h20Z" /><path d="M12 10v4M12 17h.01" /></>,
};

export default function Icon({ name, size = 20, filled = false, className = '', title, strokeWidth = 1.5, ...rest }) {
  const shape = PATHS[name];
  if (!shape) return null;
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      {...rest}
    >
      {title && <title>{title}</title>}
      {shape}
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
