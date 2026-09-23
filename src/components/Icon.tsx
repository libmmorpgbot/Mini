// One line-icon set for the whole UI (24×24, stroked with currentColor), so
// every button, chip and label shares the same weight and style instead of
// mixing platform emoji.
import type { CSSProperties } from 'react';

const PATHS = {
  swords: (
    <>
      <path d="M14.5 17.5 3 6V3h3l11.5 11.5" />
      <path d="m13 19 6-6M16 16l4 4M19 21l2-2" />
      <path d="M9.5 6.5 14 2h3v3l-4.5 4.5" />
      <path d="m5 14 4 4M7 17l-3 3M3 19l2 2" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      <path d="M9 13h6" />
    </>
  ),
  book: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 21a2 2 0 0 1 2-2h13v2H6M9 7h6M9 11h4" />
    </>
  ),
  shop: (
    <>
      <path d="M4 9h16l-1-5H5z" />
      <path d="M5 9v11h14V9M10 20v-6h4v6" />
    </>
  ),
  crown: (
    <>
      <path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 11H5z" />
      <path d="M5 21h14" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  sword: (
    <>
      <path d="M14.5 3H21v6.5L9 21.5l-6.5-6.5z" />
      <path d="m5 12 7 7M3 21l3-3" />
    </>
  ),
  shield: <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" />,
  heart: <path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />,
  flame: <path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-3-10-2 1-4 3-4 6-1-1-1.5-2-1.5-3C7 10 6 12.5 6 15a6 6 0 0 0 6 6z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </>
  ),
  gem: (
    <>
      <path d="M6 3h12l3 6-9 12L3 9z" />
      <path d="M3 9h18M9 3l3 18 3-18" />
    </>
  ),
  skull: (
    <>
      <path d="M12 3a8 8 0 0 0-5 14.2V21h10v-3.8A8 8 0 0 0 12 3z" />
      <circle cx="9" cy="11" r="1.6" />
      <circle cx="15" cy="11" r="1.6" />
      <path d="M10 21v-3M14 21v-3" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  leaf: (
    <>
      <path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z" />
      <path d="M5 19 13 11" />
    </>
  ),
  helmet: (
    <>
      <path d="M4 16v-3a8 8 0 0 1 16 0v3z" />
      <path d="M4 16h16v3H4zM12 5v11" />
    </>
  ),
  armor: (
    <>
      <path d="M8 3 4 6v6l2 1v8h12v-8l2-1V6l-4-3a4 4 0 0 1-8 0z" />
      <path d="M9 13h6" />
    </>
  ),
  gloves: (
    <>
      <path d="M7 21v-6L4 11l1.5-1.5L8 12V5a1.5 1.5 0 0 1 3 0v5-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v9l-1 6z" />
    </>
  ),
  boots: (
    <>
      <path d="M7 3h6v10l6 3a2 2 0 0 1 1 2v2H4V3z" />
      <path d="M4 17h16" />
    </>
  ),
  ring: (
    <>
      <circle cx="12" cy="14" r="6" />
      <path d="m9 5 3-3 3 3-3 3z" />
    </>
  ),
  belt: (
    <>
      <rect x="2" y="9" width="20" height="6" rx="1" />
      <rect x="9" y="7.5" width="6" height="9" rx="1" />
    </>
  ),
  chest: (
    <>
      <path d="M3 10a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10H3z" />
      <path d="M3 12h18M11 11h2v3h-2z" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 18, className, style }: IconProps) {
  return (
    <svg
      className={`icon${className ? ` ${className}` : ''}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
