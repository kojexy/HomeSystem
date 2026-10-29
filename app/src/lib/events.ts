import type { CamEvent } from "../ha/types";

/** The bits of a Frigate event (GET /api/events) this app reads. */
export interface FrigateEvent {
  id: string;
  camera: string;
  label: string;
  sub_label?: string | [string, number] | null;
  start_time: number;
  end_time?: number | null;
  top_score?: number | null;
  has_clip?: boolean;
  has_snapshot?: boolean;
  data?: { top_score?: number; score?: number; description?: string | null };
}

/** Turns Frigate events into app events. `url` maps a Home Assistant path to a loadable URL. */
export function toCamEvents(list: FrigateEvent[], url: (path: string) => string): CamEvent[] {
  return list.map((e) => {
    const base = `/api/frigate/notifications/${e.id}`;
    const sub = Array.isArray(e.sub_label) ? e.sub_label[0] : e.sub_label;
    return {
      id: e.id,
      camera: e.camera,
      label: e.label,
      subLabel: sub || null,
      start: e.start_time,
      end: e.end_time ?? null,
      score: e.data?.top_score ?? e.top_score ?? e.data?.score ?? null,
      description: e.data?.description?.trim() || null,
      thumbUrl: url(`${base}/thumbnail.jpg`),
      snapshotUrl: e.has_snapshot === false ? null : url(`${base}/snapshot.jpg`),
      clipUrl: e.has_clip ? url(`${base}/${e.camera}/clip.mp4`) : null,
    };
  });
}

export const EVENT_GROUPS = {
  all: { label: "All", labels: null },
  people: { label: "People", labels: ["person", "face"] },
  vehicles: { label: "Vehicles", labels: ["car", "motorcycle", "bicycle", "bus", "truck", "license_plate"] },
  animals: { label: "Animals", labels: ["dog", "cat", "bird", "horse"] },
} as const;

export type EventGroup = keyof typeof EVENT_GROUPS;

export function filterEvents(events: CamEvent[], group: EventGroup): CamEvent[] {
  const labels: readonly string[] | null = EVENT_GROUPS[group].labels;
  return labels ? events.filter((e) => labels.includes(e.label)) : events;
}

/** "Person", or "Person · Anna" when a face is recognised. */
export function eventTitle(e: CamEvent): string {
  const label = e.label.replace(/_/g, " ");
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  return e.subLabel ? `${title} · ${e.subLabel}` : title;
}

export function agoText(unixSeconds: number, nowMs = Date.now()): string {
  const min = Math.floor((nowMs / 1000 - unixSeconds) / 60);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** "3 people, 1 car today" — a one-line summary for the home screen. */
export function todaySummary(events: CamEvent[], nowMs = Date.now()): string | null {
  const midnight = new Date(nowMs);
  midnight.setHours(0, 0, 0, 0);
  const today = events.filter((e) => e.start * 1000 >= midnight.getTime());
  if (!today.length) return null;
  const counts = new Map<string, number>();
  for (const e of today) counts.set(e.label, (counts.get(e.label) ?? 0) + 1);
  const plural = (label: string, n: number) =>
    n === 1 ? label : label === "person" ? "people" : `${label}s`;
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `${n} ${plural(label.replace(/_/g, " "), n)}`)
    .join(", ");
}
