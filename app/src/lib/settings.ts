import type { Settings } from "../ha/types";

const KEY = "homesystem.settings";

// When the app is served by HA itself (/local/...), HA is the same address.
const servedByHass = typeof location !== "undefined" && location.pathname.startsWith("/local/");

export const DEFAULT_SETTINGS: Settings = {
  mode: "demo",
  hassUrl: servedByHass ? location.origin : "",
  token: "",
  go2rtcUrl: "",
  go2rtcStream: "",
};

// Stored only in this browser. The token never leaves the device except to your own HA.
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Private window: settings last for this session only.
  }
}

/** go2rtc's built-in player page; it picks WebRTC or MSE by itself. */
export function liveStreamUrl(s: Settings): string | null {
  if (!s.go2rtcUrl || !s.go2rtcStream) return null;
  const base = s.go2rtcUrl.replace(/\/+$/, "");
  return `${base}/stream.html?src=${encodeURIComponent(s.go2rtcStream)}&mode=webrtc,mse`;
}
