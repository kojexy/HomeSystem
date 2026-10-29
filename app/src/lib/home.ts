import type { Entities, Entity, Rooms, ServiceCall } from "../ha/types";
import { domainOf, isActive, isDevice, unavailable } from "./domains";

export function name(e: Entity): string {
  return e.attributes.friendly_name ?? e.entity_id.split(".")[1].replace(/_/g, " ");
}

const byName = (a: Entity, b: Entity) => name(a).localeCompare(name(b));

export function ofDomain(entities: Entities, ...domains: string[]): Entity[] {
  return Object.values(entities)
    .filter((e) => domains.includes(domainOf(e.entity_id)))
    .sort(byName);
}

export const devices = (entities: Entities) => Object.values(entities).filter(isDevice).sort(byName);
export const alarmOf = (entities: Entities) => ofDomain(entities, "alarm_control_panel")[0] ?? null;

// ---------- Rooms ----------

export interface Room {
  id: string;
  name: string;
  entities: Entity[];
}

export const NO_ROOM = "__other";

/** Device tiles grouped by HA area. Rooms without devices are left out; "Other" goes last. */
export function groupByRoom(entities: Entities, rooms: Rooms): Room[] {
  const map = new Map<string, Room>(rooms.areas.map((a) => [a.id, { id: a.id, name: a.name, entities: [] }]));
  const other: Room = { id: NO_ROOM, name: "Other", entities: [] };
  for (const e of devices(entities)) {
    const room = map.get(rooms.entityArea[e.entity_id] ?? "") ?? other;
    room.entities.push(e);
  }
  const list = [...map.values()].filter((r) => r.entities.length).sort((a, b) => a.name.localeCompare(b.name));
  return other.entities.length ? [...list, other] : list;
}

/** A room's temperature, if it has a thermometer. */
export function roomTemperature(room: Room): string | null {
  const t = room.entities.find((e) => domainOf(e.entity_id) === "sensor" && e.attributes.device_class === "temperature");
  return t && !unavailable(t) ? `${Math.round(Number(t.state) * 10) / 10}°` : null;
}

// ---------- At a glance ----------

const OPENINGS = ["door", "window", "opening", "garage_door"];
const isOpening = (e: Entity) => domainOf(e.entity_id) === "binary_sensor" && OPENINGS.includes(e.attributes.device_class ?? "");
const isLight = (e: Entity) => domainOf(e.entity_id) === "light";
const powerOf = (e: Entity) => (e.attributes.device_class === "power" && !unavailable(e) ? Number(e.state) || 0 : 0);

export interface Summary {
  lightsOn: number;
  openings: Entity[];
  powerW: number;
  insideTemp: number | null;
}

export function summarize(entities: Entities): Summary {
  const all = Object.values(entities);
  const temps = all
    .filter((e) => domainOf(e.entity_id) === "sensor" && e.attributes.device_class === "temperature" && !unavailable(e))
    .map((e) => Number(e.state))
    .filter((n) => !Number.isNaN(n));
  return {
    lightsOn: all.filter((e) => isLight(e) && e.state === "on").length,
    openings: all.filter((e) => isOpening(e) && e.state === "on"),
    powerW: Math.round(all.reduce((sum, e) => sum + powerOf(e), 0)),
    insideTemp: temps.length ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null,
  };
}

/** Power readings, biggest first — "what is using electricity right now". */
export function topConsumers(entities: Entities, limit = 5): Entity[] {
  return Object.values(entities)
    .filter((e) => powerOf(e) > 0)
    .sort((a, b) => powerOf(b) - powerOf(a))
    .slice(0, limit);
}

// ---------- Smart insights ----------

export interface Insight {
  id: string;
  level: "alert" | "warn" | "info";
  title: string;
  fix?: { label: string; calls: ServiceCall[] };
}

const LOW_BATTERY = 20;
const HIGH_POWER_W = 1500;

const turnOff = (es: Entity[]): ServiceCall[] =>
  es.map((e) => ({ domain: domainOf(e.entity_id), service: "turn_off", data: { entity_id: e.entity_id } }));

/** Things the home should tell you about, most urgent first. Each may carry a one-tap fix. */
export function insights(entities: Entities): Insight[] {
  const all = Object.values(entities);
  const out: Insight[] = [];
  const alarm = alarmOf(entities);
  const armed = alarm?.state.startsWith("armed") ?? false;
  const away = alarm?.state === "armed_away";

  if (alarm?.state === "triggered") out.push({ id: "alarm", level: "alert", title: "The alarm is going off" });

  const unlocked = all.filter((e) => domainOf(e.entity_id) === "lock" && e.state === "unlocked");
  if (armed && unlocked.length) {
    out.push({
      id: "unlocked",
      level: "alert",
      title: `${unlocked.map(name).join(", ")} unlocked while the alarm is on`,
      fix: { label: "Lock", calls: unlocked.map((e) => ({ domain: "lock", service: "lock", data: { entity_id: e.entity_id } })) },
    });
  }

  const lightsOn = all.filter((e) => isLight(e) && e.state === "on");
  if (away && lightsOn.length) {
    out.push({
      id: "away-lights",
      level: "warn",
      title: `${plural(lightsOn.length, "light")} on while nobody is home`,
      fix: { label: "Turn off", calls: turnOff(lightsOn) },
    });
  }

  const conditioning = all.filter((e) => domainOf(e.entity_id) === "climate" && ["heat", "cool", "heat_cool", "auto"].includes(e.state));
  const windows = all.filter((e) => isOpening(e) && e.state === "on" && e.attributes.device_class === "window");
  if (conditioning.length && windows.length) {
    out.push({
      id: "window-climate",
      level: "warn",
      title: `${windows.map(name).join(", ")} open while ${conditioning[0].state === "cool" ? "cooling" : "heating"} is on`,
      fix: {
        label: "Pause climate",
        calls: conditioning.map((e) => ({ domain: "climate", service: "set_hvac_mode", data: { entity_id: e.entity_id, hvac_mode: "off" } })),
      },
    });
  }

  for (const e of all) {
    if (e.attributes.device_class !== "battery" || unavailable(e)) continue;
    const low = domainOf(e.entity_id) === "binary_sensor" ? e.state === "on" : Number(e.state) < LOW_BATTERY;
    if (low) {
      const pct = domainOf(e.entity_id) === "sensor" ? ` (${e.state}%)` : "";
      out.push({ id: `battery-${e.entity_id}`, level: "warn", title: `Low battery: ${name(e).replace(/ battery$/i, "")}${pct}` });
    }
  }

  for (const e of all.filter((e) => powerOf(e) >= HIGH_POWER_W)) {
    out.push({ id: `power-${e.entity_id}`, level: "info", title: `${name(e).replace(/ power$/i, "")} uses ${(powerOf(e) / 1000).toFixed(1)} kW now` });
  }

  const offline = all.filter((e) => isDevice(e) && unavailable(e));
  if (offline.length) {
    out.push({
      id: "offline",
      level: "info",
      title: offline.length <= 2 ? `Offline: ${offline.map(name).join(", ")}` : `${offline.length} devices are offline`,
    });
  }

  const rank = { alert: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

// ---------- One-tap modes ----------

export type Mode = "leave" | "night" | "home";

export interface ModePlan {
  calls: ServiceCall[];
  /** The alarm has a code, so the app could not arm/disarm it by itself. */
  alarmNeedsCode: boolean;
}

/**
 * Leave: lights, fans and media off, doors locked, alarm armed away.
 * Night: the same, but the alarm goes to "home" mode so you can walk inside.
 * Home: alarm off.
 * Plugs (switch.*) are never switched off automatically — one may be the fridge.
 */
export function planMode(mode: Mode, entities: Entities): ModePlan {
  const all = Object.values(entities).filter((e) => !unavailable(e));
  const calls: ServiceCall[] = [];
  const alarm = alarmOf(entities);
  const alarmNeedsCode = Boolean(alarm?.attributes.code_format);

  if (mode !== "home") {
    calls.push(...turnOff(all.filter((e) => ["light", "fan"].includes(domainOf(e.entity_id)) && e.state === "on")));
    calls.push(...turnOff(all.filter((e) => domainOf(e.entity_id) === "media_player" && e.state !== "off")));
    for (const l of all.filter((e) => domainOf(e.entity_id) === "lock" && e.state === "unlocked")) {
      calls.push({ domain: "lock", service: "lock", data: { entity_id: l.entity_id } });
    }
  }

  if (alarm && !alarmNeedsCode) {
    const service = mode === "leave" ? "alarm_arm_away" : mode === "night" ? "alarm_arm_home" : "alarm_disarm";
    calls.push({ domain: "alarm_control_panel", service, data: { entity_id: alarm.entity_id } });
  }

  return { calls, alarmNeedsCode: Boolean(alarm) && alarmNeedsCode };
}

// ---------- Labels ----------

const ALARM_LABELS: Record<string, string> = {
  disarmed: "Disarmed",
  armed_home: "Armed · home",
  armed_away: "Armed · away",
  armed_night: "Armed · night",
  armed_vacation: "Armed · vacation",
  arming: "Arming…",
  pending: "Entry delay…",
  triggered: "ALARM",
};

export function alarmLabel(state: string): string {
  return ALARM_LABELS[state] ?? state;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function isOnNow(e: Entity): boolean {
  return isDevice(e) && isActive(e) && !["binary_sensor", "sensor"].includes(domainOf(e.entity_id));
}
