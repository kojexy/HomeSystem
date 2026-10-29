import type { Settings } from "../ha/types";
import { objectId } from "./domains";

const KEY = "homesystem.settings";

// When the app is served by HA itself (/local/...), HA is the same address.
const servedByHass = typeof location !== "undefined" && location.pathname.startsWith("/local/");

export const DEFAULT_SETTINGS: Settings = {
  mode: "demo",
  hassUrl: servedByHass ? location.origin : "",
  token: "",
  go2rtcUrl: "",
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

/** go2rtc's built-in player for a camera; the stream is named after the camera (camera.garden → garden). */
export function liveStreamUrl(s: Settings, cameraId: string): string | null {
  if (s.mode !== "live" || !s.go2rtcUrl) return null;
  const base = s.go2rtcUrl.replace(/\/+$/, "");
  return `${base}/stream.html?src=${encodeURIComponent(objectId(cameraId))}&mode=webrtc,mse`;
}
