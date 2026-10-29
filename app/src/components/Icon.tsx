// One small hand-drawn icon set (24×24, stroked) so the app needs no icon library.

const PATHS = {
  bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z",
  plug: "M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7zM12 17v5",
  fan: "M12 12m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M12 10.5C11 6 12 3 14.5 3s3.5 3-1 8M13.5 12.5c4.5.5 7 2.5 6 4.8s-4.5 1.7-7-3.3M10.5 12c-3.5 3-6.5 3.5-7.5 1.5s1.5-4.5 7-3",
  blinds: "M4 3h16M5 3v13M19 3v13M5 7h14M5 11h14M5 15h14M12 15v4",
  thermometer: "M14 14.76V4a2 2 0 0 0-4 0v10.76a4 4 0 1 0 4 0z",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2",
  tv: "M3 6h18v12H3zM8 21h8",
  vacuum: "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0",
  camera: "M3 7h4l2-3h6l2 3h4v13H3zM12 13.5m-3.5 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  door: "M6 21V3h12v18M3 21h18M14 12h.01",
  window: "M4 3h16v18H4zM12 3v18M4 12h16",
  motion: "M13 3.5a1.5 1.5 0 1 0 0 .01M9 21l3-6 3 3v3M7 12l3-4 4 1 2 3M12 15l-1-6",
  drop: "M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z",
  battery: "M3 8h15v8H3zM21 11v2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  sparkle: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z",
  play: "M7 4l13 8-13 8z",
  pause: "M7 4h4v16H7zM13 4h4v16h-4z",
  home: "M3 11l9-8 9 8M5 9.5V21h14V9.5",
  rooms: "M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  gear: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
  moon: "M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z",
  leave: "M15 3h4v18h-4M10 17l5-5-5-5M15 12H3",
  sensor: "M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  gauge: "M12 14l4-4M3.5 18a10 10 0 1 1 17 0",
  toggle: "M7 7h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 7zM16 12m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
  check: "M4 12l5 5L20 6",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  up: "M6 15l6-6 6 6",
  down: "M6 9l6 6 6-6",
  stop: "M7 7h10v10H7z",
  search: "M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M21 21l-5-5",
  expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  close: "M6 6l12 12M18 6L6 18",
  car: "M5 13l2-5h10l2 5M3 13h18v5H3zM6 18v2M18 18v2M7 15.5h.01M17 15.5h.01",
  paw: "M12 13c-3 0-5.5 3-5.5 5s2.5 2.5 5.5 1c3 1.5 5.5 1 5.5-1s-2.5-5-5.5-5zM5.5 9.5a1.6 2 0 1 0 0 .01M18.5 9.5a1.6 2 0 1 0 0 .01M9.2 5.5a1.6 2 0 1 0 0 .01M14.8 5.5a1.6 2 0 1 0 0 .01",
  person: "M12 7.5a3 3 0 1 0 0-.01M6 21v-2a6 6 0 0 1 12 0v2",
  sun: "M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
